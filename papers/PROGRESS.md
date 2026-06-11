# Build Progress — `papers` batch (8 projects)

Legend: ✅ done · 🟡 in progress · ⬜ not started
_Last updated: 2026-06-11 — all 8 built; Online Exam (#5) completed & verified._

## Phase 0 — Foundation
- ✅ Read all 8 proposals (parallel workflow) → structured summaries
- ✅ `TECH_STACK_DECISIONS.md`, `PROGRESS.md`, `README.md`
- ✅ Build all 8 (orchestrated)
- ✅ Verify each (install + migrate/seed + tests + smoke)
- 🟡 Commit (signed) + push — 7/8 committed; Online Exam = batch 8/8

## Per-project status
Each project, when built, has: backend + frontend (or service + extension),
real auth/RBAC + admin layer where users are managed, `.env.example`, seed,
tests, and a README with an objectives-addressed mapping.

| # | Project | Folder | Scaffold | Build | Tests | README | Live verify |
|---|---------|--------|----------|-------|-------|--------|-------------|
| 1 | Hospital System | `hospital_system/` | ✅ | ✅ | ✅ 3/3 | ✅ | ✅ MySQL |
| 2 | Privacy Analytics | `privacy_analytics/` | ✅ | ✅ | ✅ 4/4 | ✅ | ✅ MySQL |
| 3 | Phishing Detection | `phishing_detection/` | ✅ | ✅ | ✅ 3/3 | ✅ | ✅ trained+API |
| 4 | E-Commerce + Recsys | `ecommerce_platform/` | ✅ | ✅ | ✅ 3/3 | ✅ | ✅ MySQL+CF |
| 5 | Online Exam | `online_exam/` | ✅ | ✅ | ✅ 11+4 | ✅ | ✅ MySQL+TF-IDF |
| 6 | Smart Irrigation | `smart_irrigation/` | ✅ | ✅ | ✅ 5/5 | ✅ | ✅ MySQL |
| 7 | AI Parking Finder | `ai_parking_finder/` | ✅ | ✅ | ✅ 5/5 | ✅ | ✅ MySQL+sim |
| 8 | AI Skin Classifier | `skin_classifier/` | ✅ | ✅ | ✅ 5/5 | ✅ | ✅ mock mode |

## Notes
- DBs created on the live MySQL as needed: `hospital`, `ecommerce`, `exam`,
  `irrigation`, `parking`, `privacy` (skin + phishing use SQLite for light metadata).
- Heavy-ML apps (skin, parking) run in mock/simulation mode without GPU/CCTV;
  real model code + training scripts included.
