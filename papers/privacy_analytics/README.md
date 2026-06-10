# Privacy-Preserving Data Analytics Platform

Implementation of the ZUCT 2026 proposal (`PrivacyAnalytics_Full_Proposal`).

Upload a dataset, classify each column, apply **differential privacy** (Laplace /
Gaussian via IBM diffprivlib) and **k-anonymity** (a hand-implemented Mondrian
algorithm), and download a compliant anonymised CSV with a plain-language
**privacy compliance report**. Raw rows are held in memory for the session only
and **never persisted** (security NFR).

## Architecture
```
React + Vite + Recharts  ──REST/JWT──▶  FastAPI  ──▶  MySQL (metadata + audit only)
                                        diffprivlib (DP) · Mondrian (k-anon)
```

## Privacy engine
- **Differential privacy** (`app/privacy/dp.py`): Laplace + Gaussian mechanisms;
  sensitivity from user-declared bounds (no data-dependent leakage).
- **k-anonymity** (`app/privacy/kanon.py`): Mondrian multidimensional partitioning
  → generalisation of quasi-identifiers + suppression of residual records; a
  post-check guarantees **100% of equivalence classes satisfy k**.
- **Compliance report** (`app/privacy/report.py`): ε/δ applied, k enforced, records
  suppressed, information-loss %, and a plain-language guarantee statement.

## Roles
- **Data Analyst** — upload, classify, configure ε/k, anonymise, download + report.
- **System Administrator** — user list, audit-log viewer (RBAC-gated).

## Run
```bash
# backend
cd backend
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
copy .env.example .env        # set MySQL DATABASE_URL (encode @ as %40), or use sqlite
.venv\Scripts\python seed.py  # admin@privacy.zm / analyst@privacy.zm (password123)
.venv\Scripts\python -m uvicorn app.main:app --port 8000
.venv\Scripts\python -m pytest tests/   # privacy correctness tests

# frontend
cd ../frontend && npm install
copy .env.example .env
npm run dev                   # http://localhost:5181
```

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/datasets/upload` | Upload CSV/Excel → columns + suggested roles |
| POST | `/api/anonymize` | Apply DP + k-anon → compliance report |
| GET | `/api/anonymize/{id}/download` | Download anonymised CSV |
| GET | `/api/utility-curve` | Accuracy vs ε for a sensitive column |
| GET | `/api/admin/users`, `/api/admin/audit` | Admin (RBAC) |

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | DP via Laplace + Gaussian giving ε-DP for released statistics | `app/privacy/dp.py` (diffprivlib mechanisms, bounds-based sensitivity) | `test_privacy.py`: Laplace noise distribution unbiased + variance within tolerance of 2b² |
| 2 | Platform: upload → classify → DP + k-anon → download + report | `app/main.py`, `app/privacy/service.py`, React workflow | Smoke test on MySQL: upload→anonymise→report→download |
| 3 | Evaluate privacy guarantee, utility vs ε, k-anonymity compliance | `app/privacy/kanon.py` verify + `/api/utility-curve` | `test_privacy.py`: 100% k-compliance; utility rises with ε (0.896→0.998) |

**Tests:** `pytest` → 4/4 (k-anonymity 100% compliance, identifier suppression,
Laplace distribution consistency, utility-vs-ε). Smoke-tested on live MySQL.

## Notes & troubleshooting
- **Pinned versions:** `scikit-learn==1.4.2` (diffprivlib 0.6.4 imports a symbol
  removed in sklearn ≥1.6) and `bcrypt==4.0.1` (passlib 1.7.4 compatibility).
- Raw uploaded data lives only in the server process memory for the session;
  only job metadata + audit records are written to MySQL.
- Benchmark datasets to try: UCI Adult Income, NHANES (per the proposal).
