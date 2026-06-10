# Phishing Detection — ML URL Classifier + Browser Extension

Implementation of the ZUCT 2026 proposal (`Group13_Phishing_Detection_Full_Proposal`).

A **Random Forest** URL classifier (structural + character n-gram lexical
features) served over a **FastAPI** REST API, with a **Manifest V3 browser
extension** that classifies every visited URL in real time and warns the user via
a toolbar badge and popup. Inference is **stateless and no-logging** — submitted
URLs are never stored (privacy NFR).

## Architecture
```
Browser extension (MV3)  ──POST /classify──▶  FastAPI  ──▶  RandomForest (joblib)
 webNavigation · badge · popup · whitelist · LRU cache    structural + char n-gram features
```

## ML pipeline
- **Features** (`app/features.py`): URL length, special-char density, subdomain
  depth, Shannon domain entropy, suspicious-TLD flag, IP-as-host, shortener, `@`
  trick, https — plus character n-grams (TF-IDF `char_wb`, no NLTK).
- **Model** (`app/model.py`): Random Forest (200 trees, `class_weight='balanced'`),
  structural + lexical features combined; serialised as one `model.joblib`.
- **Training** (`train.py`): reproducibly generates a labelled dataset of the
  documented phishing patterns (IP hosts, brand-spoofs, suspicious TLDs,
  shorteners, `@` obfuscation) vs clean domains, trains, and enforces a
  **deployment gate** (accuracy ≥ 0.90, FPR < 0.05). Drop a real
  `data/urls.csv` (`url,label`) to train on PhishTank/OpenPhish instead.

## Run
```bash
cd service
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python train.py            # trains -> model.joblib (gate must PASS)
.venv\Scripts\python -m pytest tests/    # 3/3: features, accuracy/FPR gate, known-URL
.venv\Scripts\python -m uvicorn app.main:app --port 8000

# Browser extension
# chrome://extensions -> Developer mode -> Load unpacked -> select ./extension
```

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | model loaded? + held-out metrics |
| POST | `/classify` | `{url, threshold?}` → `{label, phishing_probability, confidence, latency_ms}` |

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | Train RF/SVM on URL structural + lexical features | `app/model.py`, `app/features.py`, `train.py` | gate PASS; `test_model.py` accuracy/FPR gate |
| 2 | Chrome/Firefox extension invoking the model in real time with a visual alert | `extension/` (MV3 service worker, badge, popup) | classifies on navigation; badge ✓/! |
| 3 | Evaluate accuracy, false-positive rate, latency | `train.py` confusion matrix + gate; `/classify` `latency_ms` | smoke test: phishing 100% / legit 0%, 50–120 ms |

**Tests:** `pytest` → 3/3. Smoke-tested: `paypal-verify-account.tk` and IP-host
mobile-money spoof → phishing (100%); `google.com`, `github.com` → legitimate (0%).

## Notes
- The bundled synthetic dataset is cleanly separable, so the gate reports ~1.0;
  on real PhishTank/OpenPhish data Random Forest lands ~95–98% (Sahingoz et al.).
- Privacy NFR honoured: the API does not log or persist submitted URLs; the
  extension caches verdicts locally only.
- `model.joblib` is git-ignored (regenerate with `python train.py`, ~seconds).
- No user-management/DB in core operation (stateless inference) — matches the
  proposal's single-actor, no-persistence design.
