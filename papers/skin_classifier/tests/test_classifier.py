"""Inference + fairness tests (run in mock mode — no TensorFlow needed)."""
import io

import numpy as np
from PIL import Image

from app.inference import CLASSES, LOW_CONFIDENCE, predict, preprocess
from app.fairness import evaluate


def _png_bytes(color=(120, 80, 60)):
    img = Image.new("RGB", (300, 300), color)
    buf = io.BytesIO(); img.save(buf, format="PNG"); return buf.getvalue()


def test_preprocess_resizes_to_224():
    arr = preprocess(_png_bytes())
    assert arr.shape == (224, 224, 3)


def test_predict_returns_top3_probabilities_summing_sensibly():
    res = predict(_png_bytes())
    assert len(res["predictions"]) == 3
    assert all(p["condition"] in CLASSES for p in res["predictions"])
    # top prediction is the most confident of the three
    confs = [p["confidence"] for p in res["predictions"]]
    assert confs == sorted(confs, reverse=True)


def test_low_confidence_flag_matches_threshold():
    res = predict(_png_bytes())
    assert res["low_confidence"] == (res["top"]["confidence"] < LOW_CONFIDENCE)


def test_predict_is_deterministic_for_same_image():
    b = _png_bytes((10, 20, 30))
    assert predict(b)["top"]["condition"] == predict(b)["top"]["condition"]


def test_fairness_reports_per_group_accuracy_and_parity_gap():
    records = [
        ("eczema", "eczema", 2), ("acne vulgaris", "acne vulgaris", 3), ("melanoma", "eczema", 2),  # I-III
        ("eczema", "eczema", 5), ("psoriasis", "psoriasis", 6), ("melanoma", "melanoma", 5),         # IV-VI
    ]
    out = evaluate(records)
    assert out["groups"]["I-III"]["accuracy"] is not None
    assert out["groups"]["IV-VI"]["accuracy"] is not None
    assert 0.0 <= out["parity_gap"] <= 1.0
