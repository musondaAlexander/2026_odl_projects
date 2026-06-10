# AI Skin Disease Classifier

Implementation of the ZUCT 2026 proposal (`Group14_AI_Skin_Classifier_Full_Proposal`).

A browser-accessible **Flask** web app that classifies five common skin
conditions (tinea, eczema, psoriasis, acne vulgaris, melanoma) from an uploaded
photo using an **EfficientNet-B0** transfer-learning CNN, returning a probable
diagnosis with a confidence score, a low-confidence warning, and a condition info
card. Uploaded images are processed **in memory and never persisted** (privacy NFR).

Runs end-to-end in **mock mode** (no TensorFlow/GPU/model needed); train with
`train.py` and set `MODEL_DIR` to switch to real EfficientNet inference.

## Architecture
```
Mobile-responsive upload page ──POST /api/classify──▶ Flask
                                                      preprocess (224×224) → predict
                                                      EfficientNet-B0 | mock
SQLite audit (prediction metadata only — no images) ◀── fairness telemetry
```

## Key features
- Upload (JPEG/PNG ≤10 MB), 224×224 preprocessing, **top-3** predictions + confidence.
- **Low-confidence (<60%) warning** → "seek clinical review" regardless of top class.
- Condition info card + prominent **decision-support disclaimer** (not a diagnosis).
- **Skin-tone fairness** evaluation (`app/fairness.py`): per-Fitzpatrick-group
  accuracy + parity gap; audit telemetry by self-declared skin-tone group.
- No image persistence; no EHR/patient records.

## Run
```bash
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m pytest tests/          # 5/5 (mock mode, no TF)
.venv\Scripts\python -m app.server             # http://localhost:8000

# Real model (optional):
#   pip install tensorflow ; arrange data/train,data/val per class ; python train.py
#   set MODEL_DIR=model  then restart the server
```

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | upload UI |
| POST | `/api/classify` | image (+ optional `fitzpatrick`) → top-3 + confidence + warning |
| GET | `/api/audit/stats` | anonymised prediction telemetry (fairness monitoring) |

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | EfficientNet transfer-learning CNN for ≥5 conditions, skin-tone-balanced | `train.py` (EfficientNetB0, freeze→head→fine-tune, ≥80% gate) | training pipeline complete; mock path tested |
| 2 | Flask app: upload → model → diagnosis + confidence, any browser | `app/server.py`, `app/inference.py`, `templates/index.html` | smoke test: top-3 + confidence + low-conf warning |
| 3 | Evaluate accuracy/sensitivity/specificity + skin-tone fairness | `app/fairness.py`, `app/audit.py` | `pytest` fairness test; audit telemetry by group |

**Tests:** `pytest` → 5/5 (preprocess 224×224, top-3 ordering, low-confidence flag,
determinism, fairness per-group + parity gap). Smoke-tested: classify, audit, UI.

## Notes
- **Mock mode** returns a deterministic, clearly-labelled pseudo-prediction so the
  full UX runs without the multi-GB TensorFlow model; it is honest about low
  confidence. Real inference activates automatically when `MODEL_DIR` points at a
  trained SavedModel.
- **No persistence of images** (privacy NFR); only anonymised metadata
  (class, confidence, declared skin-tone group) is logged to SQLite for fairness
  monitoring — never patient records.
- Decision support only — not a clinical diagnosis (disclaimer shown in the UI).
