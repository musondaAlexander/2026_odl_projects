# `papers` — Second batch of implemented project proposals

Production-grade implementations of 8 further ZUCT 2026 BSc IT project proposals
(the proposal documents live in this folder). Same method and quality bar as the
root batch: understand the proposal → choose a problem-fit stack → build
production-grade (real auth, RBAC + admin where users are managed, validation,
tests) → verify on the live MySQL → document.

> Three proposals also present here — Password Manager, Gamified Learning, Secure
> File Sharing — are already implemented at the repository root and are not rebuilt.

## The 8 projects

| # | Project | Folder | Stack | DB |
|---|---------|--------|-------|----|
| 1 | Hospital Appointment & Records | `hospital_system/` | Node/Express + Prisma · React | MySQL |
| 2 | Privacy-Preserving Analytics | `privacy_analytics/` | FastAPI + diffprivlib + Mondrian · React | MySQL (meta) |
| 3 | Phishing Detection | `phishing_detection/` | FastAPI + scikit-learn · MV3 extension | SQLite (metrics) |
| 4 | E-Commerce + Recommendations | `ecommerce_platform/` | Node/Express + Python CF · React | MySQL |
| 5 | Online Exam + Plagiarism | `online_exam/` | Spring Boot + Python TF-IDF · React | MySQL |
| 6 | Smart Irrigation (IoT) | `smart_irrigation/` | FastAPI + MQTT · React + Chart.js | MySQL |
| 7 | AI Parking Finder (CV) | `ai_parking_finder/` | FastAPI + YOLOv8 + WebSocket · Leaflet | MySQL |
| 8 | AI Skin Classifier | `skin_classifier/` | Flask + EfficientNet (TF) | SQLite (audit) |

See [`TECH_STACK_DECISIONS.md`](./TECH_STACK_DECISIONS.md) for the rationale and
deviations, and [`PROGRESS.md`](./PROGRESS.md) for live build status. Each project
folder has its own README with run instructions and an objectives-addressed mapping.

## Running any project
Each app's README is authoritative. Common pattern:
- **Node apps:** `cd <app>/backend && npm install && npm run seed && npm run dev`; `cd ../frontend && npm install && npm run dev`.
- **Python (FastAPI/Flask) apps:** `python -m venv .venv && .venv\Scripts\pip install -r requirements.txt && ... uvicorn/flask run`.
- **Spring Boot (exam):** `cd backend && ./mvnw spring-boot:run`.
- DB-backed apps connect to the live MySQL; fill `.env` from `.env.example`.
