"""AI Parking Finder API.

A background loop drives the detector (YOLOv8 or simulation) → occupancy state
machine (with debounce) → persists changes → broadcasts live bay status over
WebSocket. Drivers get a public read-only map; operators get a dashboard + manual
override; admins manage operators and bays.
"""
import asyncio
import json
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import (create_access_token, current_user, hash_password,
                   require_roles, verify_password)
from .config import settings
from .db import Base, engine, get_db, SessionLocal
from .detector import build_detector
from .models import Bay, OccupancyEvent, User
from .occupancy import BayState

Base.metadata.create_all(bind=engine)
app = FastAPI(title="AI Parking Finder API")
app.add_middleware(CORSMiddleware, allow_origins=[settings.cors_origin], allow_methods=["*"],
                   allow_headers=["*"], allow_credentials=True)

# In-memory live state (the DB is the durable record / audit).
_states: dict[str, BayState] = {}
_clients: list[WebSocket] = []
_detector = None
_mode = "simulation"


async def _broadcast(message: dict):
    dead = []
    for ws in _clients:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _clients:
            _clients.remove(ws)


def _snapshot(db: Session):
    bays = db.query(Bay).all()
    return [{"bay_id": b.bay_id, "lat": b.lat, "lng": b.lng, "status": b.status, "override": b.override} for b in bays]


async def _simulation_loop():
    global _detector, _mode
    db = SessionLocal()
    bays = db.query(Bay).all()
    if not bays:
        db.close()
        return
    bay_ids = [b.bay_id for b in bays]
    for b in bays:
        st = BayState(status=b.status, override=b.override)
        _states[b.bay_id] = st
    _detector, _mode = build_detector(bay_ids, model_path=settings.yolo_model_path)
    db.close()

    while True:
        try:
            detections = _detector.step() if hasattr(_detector, "step") else {}
            db = SessionLocal()
            changed_any = False
            for bay_id, present in detections.items():
                st = _states.get(bay_id)
                if not st:
                    continue
                if st.update(present, settings.free_confirmations):
                    bay = db.query(Bay).filter(Bay.bay_id == bay_id).first()
                    bay.status = st.status
                    bay.updated_at = datetime.utcnow()
                    db.add(OccupancyEvent(bay_id=bay_id, status=st.status, source="detection"))
                    changed_any = True
            if changed_any:
                db.commit()
            snap = _snapshot(db)
            db.close()
            await _broadcast({"type": "bays", "mode": _mode, "bays": snap,
                              "available": sum(1 for s in snap if s["status"] == "available")})
        except Exception as e:
            print("sim loop error:", e)
        await asyncio.sleep(settings.sim_interval_seconds)


@app.on_event("startup")
async def _startup():
    asyncio.create_task(_simulation_loop())


@app.get("/health")
def health():
    return {"status": "ok", "mode": _mode}


# ---- Public (no auth): driver map ----
@app.get("/api/public/bays")
def public_bays(db: Session = Depends(get_db)):
    snap = _snapshot(db)
    return {"mode": _mode, "available": sum(1 for s in snap if s["status"] == "available"),
            "total": len(snap), "bays": snap}


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    _clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _clients:
            _clients.remove(websocket)


# ---- Auth ----
@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == form.username).first()
    if not u or not verify_password(form.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_access_token(u), "token_type": "bearer",
            "user": {"id": u.id, "name": u.name, "email": u.email, "role": u.role}}


# ---- Operator dashboard ----
@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(current_user)):
    snap = _snapshot(db)
    recent = (db.query(OccupancyEvent).order_by(OccupancyEvent.ts.desc()).limit(20).all())
    return {
        "mode": _mode,
        "available": sum(1 for s in snap if s["status"] == "available"),
        "occupied": sum(1 for s in snap if s["status"] == "occupied"),
        "total": len(snap),
        "recentEvents": [{"bay_id": e.bay_id, "status": e.status, "source": e.source, "ts": e.ts.isoformat()} for e in recent],
    }


# Occupancy history buckets (turnover over time) for the operator chart.
@app.get("/api/history")
def history(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(OccupancyEvent).order_by(OccupancyEvent.ts.desc()).limit(200).all()
    return [{"bay_id": e.bay_id, "status": e.status, "ts": e.ts.isoformat()} for e in reversed(rows)]


class OverrideIn(BaseModel):
    status: str | None  # "available" | "occupied" | null to clear


@app.post("/api/bays/{bay_id}/override")
def override(bay_id: str, body: OverrideIn, db: Session = Depends(get_db),
             user: User = Depends(require_roles("operator", "admin"))):
    bay = db.query(Bay).filter(Bay.bay_id == bay_id).first()
    if not bay:
        raise HTTPException(404, "Bay not found")
    if body.status not in ("available", "occupied", None):
        raise HTTPException(400, "status must be available, occupied, or null")
    bay.override = body.status
    st = _states.get(bay_id) or BayState()
    st.override = body.status
    if body.status:
        st.status = body.status
        bay.status = body.status
    _states[bay_id] = st
    db.add(OccupancyEvent(bay_id=bay_id, status=bay.status, source="override", actor=user.email))
    db.commit()
    return {"bay_id": bay_id, "status": bay.status, "override": bay.override}


# ---- Admin ----
@app.get("/api/admin/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "isActive": u.is_active}
            for u in db.query(User).all()]


class BayIn(BaseModel):
    bay_id: str
    lat: float
    lng: float


@app.post("/api/admin/bays")
def add_bay(body: BayIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    if db.query(Bay).filter(Bay.bay_id == body.bay_id).first():
        raise HTTPException(409, "Bay exists")
    bay = Bay(bay_id=body.bay_id, lat=body.lat, lng=body.lng)
    db.add(bay); db.commit()
    _states[body.bay_id] = BayState()
    return {"bay_id": bay.bay_id}
