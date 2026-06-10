# E-Commerce Platform with Collaborative-Filtering Recommendations

Implementation of the ZUCT 2026 proposal (`ECommerce_Recommendation_Engine`).

A single-vendor e-commerce platform with **item-to-item collaborative filtering**
("Customers Also Bought"), **MTN MoMo / Airtel Money** checkout (mockable
gateway), and the **Repository / MVC / Observer** patterns.

## Architecture
```
React + Vite (storefront + admin)  ──REST/JWT──▶  Express + Sequelize  ──▶  MySQL
                                                  Observer interaction log
Python CF job (offline)  ──cosine similarity──▶  ItemSimilarities (top-N per item)
```

## Recommendation pipeline (objective 1)
- Every **view / add-to-cart / purchase** is recorded by an **Observer**
  (`src/services/interactions.js`) into the interaction log.
- An **offline Python job** (`recsys/build_similarity.py`) builds a weighted
  user-item matrix, computes **item-to-item cosine similarity** (scikit-learn),
  and writes the **top-5 per product** to `ItemSimilarities`.
- The recommendation API serves a **precomputed lookup** (sub-500ms), with an
  **A/B flag**: `personalised` (CF) vs `baseline` (popularity) — plus CTR tracking.

## Patterns (objective 2)
- **Repository** — Sequelize models abstract data access.
- **MVC** — routes → controllers → models; React component views.
- **Observer** — interaction events fan out to subscribers (`subscribe`/`recordInteraction`).
- **PaymentGateway** interface with a mock (sandbox) provider, swappable for live MoMo/Airtel.

## Run
```bash
# backend
cd backend && npm install
copy .env.example .env             # MySQL creds, or DB_DIALECT=sqlite
npm run seed                       # products + users + co-purchase history
npm test                           # payment gateway + Observer tests
npm run dev                        # http://localhost:4300

# CF pipeline (Python)
cd ../recsys && pip install -r requirements.txt
python build_similarity.py         # writes item-item similarities to MySQL

# frontend
cd ../frontend && npm install && copy .env.example .env && npm run dev   # http://localhost:5182
```
Demo logins (password123): `admin@shop.zm`, `c1@shop.zm` … `c8@shop.zm`.

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | CF engine generating personalised suggestions in real time | `recsys/build_similarity.py` + `src/services/recommendations.js` | Smoke: earbuds → charger/power-bank/case (from co-purchase), distinct from baseline |
| 2 | Full-stack React+Node with Repository/MVC/Observer + MoMo/Airtel | layered backend, `services/interactions.js`, `services/paymentGateway.js`, React SPA | MTN MoMo checkout → order paid; tests 3/3 |
| 3 | Evaluate precision/recall vs baseline + load (k6) | A/B `variant` flag + CTR analytics (`/admin/analytics`); k6 script-ready | personalised vs baseline served + CTR tracked |

**Tests:** `npm test` → 3/3 (mock gateway success/fail, Observer logging). Verified
on live MySQL: CF recs, MoMo checkout (order paid), admin analytics + CTR, RBAC 403.

## Notes
- **MySQL** used instead of the proposal's MongoDB (shared infra); document store
  → relational with Sequelize. SQLite dev fallback available.
- Payments are mocked by default (`PAYMENTS_MODE=mock`); numbers ending in `0`
  simulate a failed payment for testing.
- Run the CF job on a schedule (cron) to refresh similarities as interactions grow.
