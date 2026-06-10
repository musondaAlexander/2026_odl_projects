"""Privacy-Preserving Data Analytics Platform API.

Upload a dataset, classify columns, apply differential privacy + k-anonymity, and
download a compliant anonymised CSV with a plain-language compliance report.
Raw rows are held in memory only for the session and never persisted.
"""
import io
import uuid

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import (create_access_token, current_user, hash_password,
                   require_admin, verify_password)
from .config import settings
from .db import Base, engine, get_db
from .models import AnonymizationJob, AuditLog, User
from .privacy import dp, service

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Privacy-Preserving Data Analytics Platform")
app.add_middleware(
    CORSMiddleware, allow_origins=[settings.cors_origin], allow_methods=["*"],
    allow_headers=["*"], allow_credentials=True,
)

# Ephemeral in-memory store of uploaded datasets (never written to the DB).
_DATASETS: dict[str, pd.DataFrame] = {}
_RESULTS: dict[str, pd.DataFrame] = {}


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
    user = User(name=body.name, email=body.email,
                password_hash=hash_password(body.password), role="analyst")
    db.add(user); db.commit()
    return {"id": user.id, "email": user.email, "role": user.role}


@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_access_token(user), "token_type": "bearer",
            "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


# ---------------- Dataset upload + classification ----------------
def _infer_role(series: pd.Series, name: str) -> str:
    lname = name.lower()
    if any(t in lname for t in ("id", "name", "email", "ssn", "phone", "national")):
        return "direct_identifier"
    if pd.api.types.is_numeric_dtype(series):
        return "sensitive"
    return "quasi_identifier"


@app.post("/api/datasets/upload")
async def upload(file: UploadFile = File(...), user: User = Depends(current_user)):
    raw = await file.read()
    if len(raw) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_upload_mb}MB")
    name = file.filename or "dataset.csv"
    try:
        df = pd.read_excel(io.BytesIO(raw)) if name.endswith((".xls", ".xlsx")) else pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")
    fid = uuid.uuid4().hex
    _DATASETS[fid] = df
    columns = [{"name": c, "dtype": str(df[c].dtype), "suggestedRole": _infer_role(df[c], c)}
               for c in df.columns]
    return {"fileId": fid, "rows": len(df), "columns": columns,
            "preview": df.head(5).fillna("").to_dict(orient="records")}


# ---------------- Anonymize ----------------
class AnonymizeIn(BaseModel):
    fileId: str
    classification: dict  # column -> role
    epsilon: float = 1.0
    k: int = 5
    delta: float | None = None
    bounds: dict | None = None


@app.post("/api/anonymize")
def anonymize(body: AnonymizeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    df = _DATASETS.get(body.fileId)
    if df is None:
        raise HTTPException(404, "Dataset not found or session expired")
    if body.epsilon <= 0:
        raise HTTPException(400, "epsilon must be > 0")
    if body.k < 2:
        raise HTTPException(400, "k must be >= 2")

    out, report = service.anonymize(
        df, classification=body.classification, epsilon=body.epsilon, k=body.k,
        delta=body.delta, bounds=body.bounds, dataset_name="uploaded",
    )
    rid = uuid.uuid4().hex
    _RESULTS[rid] = out

    job = AnonymizationJob(
        user_id=user.id, dataset_name="uploaded", classification=body.classification,
        epsilon=str(body.epsilon), k=body.k, records_in=report and df.shape[0],
        records_out=len(out), records_suppressed=report["records_suppressed"],
        information_loss=str(report["information_loss_percent"]), k_compliant=report["k_compliant"],
    )
    db.add(job)
    db.add(AuditLog(user_id=user.id, action="ANONYMIZE",
                    detail=f"eps={body.epsilon} k={body.k} loss={report['information_loss_percent']}%"))
    db.commit()
    return {"resultId": rid, "report": report}


@app.get("/api/anonymize/{rid}/download")
def download(rid: str, user: User = Depends(current_user)):
    out = _RESULTS.get(rid)
    if out is None:
        raise HTTPException(404, "Result not found or expired")
    buf = io.StringIO()
    out.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=anonymized.csv"})


# Privacy-utility trade-off: accuracy of the private mean vs epsilon.
@app.get("/api/utility-curve")
def utility_curve(fileId: str, column: str, user: User = Depends(current_user)):
    df = _DATASETS.get(fileId)
    if df is None or column not in df.columns:
        raise HTTPException(404, "Dataset/column not found")
    s = pd.to_numeric(df[column], errors="coerce").dropna().to_numpy()
    if len(s) == 0:
        raise HTTPException(400, "Column is not numeric")
    lo, hi = float(np.floor(s.min())), float(np.ceil(s.max()))
    true_mean = float(np.mean(s))
    points = []
    for eps in [0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0]:
        accs = [dp.query_accuracy(true_mean, dp.privatize_mean_laplace(s, eps, lo, hi)) for _ in range(20)]
        points.append({"epsilon": eps, "accuracy": round(float(np.mean(accs)), 4)})
    return {"column": column, "trueMean": round(true_mean, 4), "points": points}


# ---------------- Admin ----------------
@app.get("/api/admin/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "isActive": u.is_active}
            for u in db.query(User).all()]


@app.get("/api/admin/audit")
def audit(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    return [{"id": r.id, "userId": r.user_id, "action": r.action, "detail": r.detail,
             "at": r.created_at.isoformat()} for r in rows]
