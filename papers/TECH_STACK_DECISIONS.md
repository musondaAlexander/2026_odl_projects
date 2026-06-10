# Tech Stack Decisions — `papers` batch (8 projects)

Same method as the root batch: honor each proposal's named stack unless a
production concern justifies a documented deviation. Shared infra: the **live
MySQL 8 server** (relational apps use it; SQLite is the dev fallback / used for
light metadata where the proposal forbids a real DB).

| # | Project | Folder | Backend | Frontend | DB | ML / special |
|---|---------|--------|---------|----------|----|--------------|
| 1 | Hospital Appointment & Records | `hospital_system/` | Node + Express + Prisma + JWT/RBAC | React + Vite | MySQL | — |
| 2 | Privacy-Preserving Analytics | `privacy_analytics/` | FastAPI + diffprivlib + Mondrian | React + Vite + Recharts | MySQL (metadata only) | real DP + k-anonymity |
| 3 | Phishing Detection | `phishing_detection/` | FastAPI + scikit-learn | MV3 browser extension | SQLite (metrics only) | real Random Forest |
| 4 | E-Commerce + Recsys | `ecommerce_platform/` | Node + Express + Sequelize + Python CF | React + Vite | MySQL | item-item CF (real) |
| 5 | Online Exam + Plagiarism | `online_exam/` | Java Spring Boot + Python TF-IDF svc | React + Vite | MySQL | TF-IDF cosine (real) |
| 6 | Smart Irrigation (IoT) | `smart_irrigation/` | FastAPI + Paho-MQTT + sensor sim | React + Vite + Chart.js | MySQL | rule-based threshold engine |
| 7 | AI Parking Finder (CV) | `ai_parking_finder/` | FastAPI + WebSocket + YOLOv8 module | Leaflet map + dashboard | MySQL | YOLOv8 (real module + sim mode) |
| 8 | AI Skin Classifier | `skin_classifier/` | Flask + TensorFlow EfficientNet | upload UI | SQLite (audit) | EfficientNet (train script + mock) |

## Key deviations (documented)
- **MySQL everywhere relational.** Proposals named PostgreSQL (parking, privacy),
  MongoDB (e-commerce), or TimescaleDB (irrigation). Since a MySQL server is
  already provisioned, all relational/event/time-series data uses MySQL (with
  time-bucketed indexes where a time-series store would otherwise be ideal). This
  keeps the whole batch runnable on existing infra. SQLite dev fallback retained.
- **FastAPI over Flask** for parking, privacy, irrigation, phishing — native async
  fits their WebSocket / background-job / low-latency needs (proposals' Flask is
  acceptable but FastAPI is more production-appropriate). Skin classifier keeps
  Flask (proposal-specified) + Gunicorn.
- **Spring Boot via Maven wrapper** (`mvnw`) for the exam app — Java 17 is present
  but global Maven isn't; the wrapper bootstraps it. Plagiarism stays a separate
  Python FastAPI microservice (proposal mandates Python NLTK/scikit-learn).
- **Payments mocked** (e-commerce): MTN MoMo / Airtel Money behind a
  `PaymentGateway` interface with a sandbox/mock provider until live merchant
  credentials exist.
- **Heavy-ML graceful degradation:** Skin classifier and Parking ship real model
  code **plus** a mock/simulation mode so the apps run without a multi-GB
  TensorFlow model / live CCTV. Training scripts/notebooks are included.
- **Auth/RBAC added where proposals implied roles but specified no mechanism**
  (parking operator, irrigation admin) — JWT + an admin layer.

## Cross-cutting standards (all 8)
Real auth, RBAC + admin user-management where users are managed, input validation,
centralized error handling, `.env.example` (secrets git-ignored), seed scripts,
per-project README with an objectives-addressed mapping + evidence, and automated
tests for the core/security-critical logic.
