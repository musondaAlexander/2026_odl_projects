"""Phishing-detection inference API.

Stateless and no-logging: submitted URLs are classified and discarded — never
stored (privacy NFR). The trained model artifact is loaded once at startup.
"""
import os
import time

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MODEL_PATH = os.getenv("MODEL_PATH", "model.joblib")

app = FastAPI(title="Phishing Detection API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_bundle = None


def get_model():
    global _bundle
    if _bundle is None:
        if not os.path.exists(MODEL_PATH):
            raise HTTPException(503, "Model not trained. Run `python train.py` first.")
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


class ClassifyIn(BaseModel):
    url: str
    threshold: float | None = 0.5


@app.get("/health")
def health():
    ok = os.path.exists(MODEL_PATH)
    metrics = joblib.load(MODEL_PATH)["metrics"] if ok else None
    return {"status": "ok", "model_loaded": ok, "metrics": metrics}


@app.post("/classify")
def classify(body: ClassifyIn):
    bundle = get_model()
    model = bundle["model"]
    t0 = time.perf_counter()
    result = model.predict(body.url, threshold=body.threshold or 0.5)
    result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
    result["confidence"] = round(abs(result["phishing_probability"] - 0.5) * 2, 4)
    # NB: body.url is intentionally NOT logged or persisted.
    return result
