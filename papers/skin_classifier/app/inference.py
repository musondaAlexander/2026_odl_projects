"""Skin-condition inference.

Real mode: loads a trained EfficientNet-B0 SavedModel and returns class
probabilities. Activates only if TensorFlow + a model directory are present.

Mock mode (default, no TensorFlow/GPU/model needed): returns a deterministic,
clearly-labelled pseudo-prediction derived from the image bytes, so the full web
app — upload, top-3, confidence, low-confidence warning, condition cards — runs
end-to-end and is testable without the multi-GB model. Train with `train.py` and
set MODEL_DIR to switch to real inference.
"""
from __future__ import annotations

import hashlib
import io
import os

import numpy as np
from PIL import Image

CLASSES = ["tinea (ringworm)", "eczema", "psoriasis", "acne vulgaris", "melanoma"]
IMG_SIZE = (224, 224)
LOW_CONFIDENCE = 0.60
MODEL_DIR = os.getenv("MODEL_DIR")  # e.g. "./model"

_model = None
_mode = "mock"


def preprocess(image_bytes: bytes) -> np.ndarray:
    """Decode → RGB → resize 224×224 → float array. Shared by both modes."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE)
    return np.asarray(img, dtype="float32")


def _load_model():
    global _model, _mode
    if _model is not None or not MODEL_DIR:
        return _model
    try:
        import tensorflow as tf  # noqa
        _model = tf.keras.models.load_model(MODEL_DIR)
        _mode = "efficientnet"
    except Exception:
        _model = None
        _mode = "mock"
    return _model


def _mock_probs(image_bytes: bytes) -> np.ndarray:
    """Deterministic pseudo-probabilities from the image hash (clearly labelled)."""
    h = hashlib.sha256(image_bytes).digest()
    raw = np.array([h[i] for i in range(len(CLASSES))], dtype="float64") + 1.0
    return raw / raw.sum()


def predict(image_bytes: bytes) -> dict:
    arr = preprocess(image_bytes)  # validates the image; also used by real model
    model = _load_model()

    if model is not None:  # pragma: no cover - requires TF + model
        import tensorflow as tf
        x = tf.keras.applications.efficientnet.preprocess_input(arr[None, ...])
        probs = model.predict(x, verbose=0)[0]
    else:
        probs = _mock_probs(image_bytes)

    order = np.argsort(probs)[::-1]
    top3 = [{"condition": CLASSES[i], "confidence": round(float(probs[i]), 4)} for i in order[:3]]
    top = top3[0]
    return {
        "mode": _mode,
        "predictions": top3,
        "top": top,
        "low_confidence": top["confidence"] < LOW_CONFIDENCE,
        "disclaimer": "Decision support only — not a clinical diagnosis. Seek professional confirmation.",
    }


CONDITION_INFO = {
    "tinea (ringworm)": "A common fungal skin infection causing a ring-shaped, itchy rash. Usually treatable with antifungal medication.",
    "eczema": "A chronic condition causing dry, itchy, inflamed skin. Managed with moisturisers and topical treatments.",
    "psoriasis": "An immune-mediated condition causing thick, scaly patches. Requires medical management.",
    "acne vulgaris": "Common inflammatory condition of the hair follicles/oil glands, often on the face/back.",
    "melanoma": "A serious skin cancer. ANY suspicion warrants urgent dermatologist review.",
}
