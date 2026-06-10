"""Smart Irrigation API: ingestion (HTTP + MQTT), thresholds, live WebSocket,
history, manual override, alerts, and admin node/user management.
"""
import asyncio
import json

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import (create_access_token, current_user, hash_password,
                   require_roles, verify_password)
from .config import settings
from .db import Base, engine, get_db, SessionLocal
from .ingest import process_reading
from .models import IrrigationEvent, Reading, SensorNode, User
from .threshold import out_of_safe_range

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Irrigation API")
app.add_middleware(CORSMiddleware, allow_origins=[settings.cors_origin], allow_methods=["*"],
                   allow_headers=["*"], allow_credentials=True)


class WSManager:
    def __init__(self):
        self.clients: list[WebSocket] = []
        self.loop = None

    async def connect(self, ws):
        await ws.accept(); self.clients.append(ws)

    def disconnect(self, ws):
        if ws in self.clients:
            self.clients.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.clients:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


ws_manager = WSManager()


@app.on_event("startup")
async def _startup():
    ws_manager.loop = asyncio.get_event_loop()


def broadcast_threadsafe(message: dict):
    """Callable from the MQTT subscriber thread to push to WS clients."""
    if ws_manager.loop:
        asyncio.run_coroutine_threadsafe(ws_manager.broadcast(message), ws_manager.loop)


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------- Auth ----------------
class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


@app.post("/api/auth/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(409, "Email already registered")
    u = User(name=body.name, email=body.email, password_hash=hash_password(body.password), role="farmer")
    db.add(u); db.commit()
    return {"id": u.id, "email": u.email, "role": u.role}


@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == form.username).first()
    if not u or not verify_password(form.password, u.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_access_token(u), "token_type": "bearer",
            "user": {"id": u.id, "name": u.name, "email": u.email, "role": u.role}}


# ---------------- Ingestion (HTTP path; MQTT path uses the same service) ----------------
class ReadingIn(BaseModel):
    node_id: str
    soil_moisture: float
    temperature: float | None = None
    humidity: float | None = None
    rainfall: float | None = None


@app.post("/api/ingest")
async def ingest(body: ReadingIn, db: Session = Depends(get_db)):
    result = process_reading(db, body.node_id, body.model_dump())
    await ws_manager.broadcast({"type": "reading", **result})
    return result


# ---------------- Live updates ----------------
@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keepalive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ---------------- Nodes, history, thresholds, override ----------------
@app.get("/api/nodes")
def nodes(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(SensorNode).all()
    return [{"node_id": n.node_id, "name": n.name, "crop": n.crop, "pump_on": n.pump_on,
             "lower": n.lower_moisture, "upper": n.upper_moisture, "override": n.manual_override,
             "last_seen": n.last_seen.isoformat() if n.last_seen else None} for n in rows]


@app.get("/api/nodes/{node_id}/history")
def history(node_id: str, hours: int = 24, db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = (db.query(Reading).filter(Reading.node_id == node_id)
            .order_by(Reading.ts.desc()).limit(500).all())
    return [{"ts": r.ts.isoformat(), "soil_moisture": r.soil_moisture, "temperature": r.temperature,
             "humidity": r.humidity, "rainfall": r.rainfall} for r in reversed(rows)]


class ThresholdIn(BaseModel):
    lower: float
    upper: float


@app.put("/api/nodes/{node_id}/thresholds")
def set_thresholds(node_id: str, body: ThresholdIn, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("farmer", "admin"))):
    n = db.query(SensorNode).filter(SensorNode.node_id == node_id).first()
    if not n:
        raise HTTPException(404, "Node not found")
    if body.lower >= body.upper:
        raise HTTPException(400, "lower must be < upper")
    n.lower_moisture, n.upper_moisture = body.lower, body.upper
    db.commit()
    return {"node_id": node_id, "lower": n.lower_moisture, "upper": n.upper_moisture}


class OverrideIn(BaseModel):
    override: str | None  # "on" | "off" | null (clear)


@app.post("/api/nodes/{node_id}/override")
def override(node_id: str, body: OverrideIn, db: Session = Depends(get_db),
             user: User = Depends(require_roles("farmer", "admin"))):
    n = db.query(SensorNode).filter(SensorNode.node_id == node_id).first()
    if not n:
        raise HTTPException(404, "Node not found")
    if body.override not in ("on", "off", None):
        raise HTTPException(400, "override must be on, off, or null")
    n.manual_override = body.override
    if body.override == "on":
        n.pump_on = True
    elif body.override == "off":
        n.pump_on = False
    db.add(IrrigationEvent(node_id=node_id, action=body.override or "auto",
                           pump_on=n.pump_on, reason="manual override", manual=True))
    db.commit()
    return {"node_id": node_id, "override": n.manual_override, "pump_on": n.pump_on}


@app.get("/api/alerts")
def alerts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    out = []
    for n in db.query(SensorNode).all():
        last = (db.query(Reading).filter(Reading.node_id == n.node_id)
                .order_by(Reading.ts.desc()).first())
        if last and last.soil_moisture is not None and out_of_safe_range(last.soil_moisture, n.lower_moisture, n.upper_moisture):
            out.append({"node_id": n.node_id, "soil_moisture": last.soil_moisture,
                        "message": "Soil moisture outside configured band"})
    return out


# ---------------- Admin ----------------
@app.get("/api/admin/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "isActive": u.is_active}
            for u in db.query(User).all()]


class NodeIn(BaseModel):
    node_id: str
    name: str | None = None
    crop: str | None = None


@app.post("/api/admin/nodes")
def create_node(body: NodeIn, db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    if db.query(SensorNode).filter(SensorNode.node_id == body.node_id).first():
        raise HTTPException(409, "Node exists")
    n = SensorNode(node_id=body.node_id, name=body.name or body.node_id, crop=body.crop)
    db.add(n); db.commit()
    return {"node_id": n.node_id}
