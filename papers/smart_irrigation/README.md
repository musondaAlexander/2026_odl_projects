# Smart Irrigation System with IoT Dashboard

Implementation of the ZUCT 2026 proposal (`Group5_Smart_Irrigation_Full_Proposal`).

Field sensor nodes stream soil-moisture / temperature / humidity / rainfall over
**MQTT** to a **FastAPI** backend that persists readings, runs a **rule-based
threshold engine** to drive the pump, and pushes live updates to a **React +
Chart.js** dashboard over **WebSocket**.

## Architecture
```
Sensor nodes ──MQTT(farm/<node>/readings)──▶ Mosquitto ──▶ FastAPI subscriber ──▶ MySQL
                                              (or HTTP /api/ingest)   threshold engine
React + Chart.js dashboard ◀──WebSocket(/ws)── FastAPI
```

## Core pieces
- **Threshold engine** (`app/threshold.py`): pump ON below the lower bound, OFF at/
  above the upper bound, **hysteresis hold** within the band; manual override wins.
- **Ingestion** (`app/ingest.py`): persist reading → decide → update pump → log
  `IrrigationEvent` — shared by the HTTP endpoint **and** the MQTT subscriber.
- **MQTT subscriber** (`app/mqtt_subscriber.py`): Paho, subscribes `farm/+/readings`
  at QoS 1.
- **Simulator** (`simulator/sensor_node.py`): drives moisture down then up as the
  pump cycles; publishes via MQTT or (with `--http`) posts to the API.
- **Live WebSocket** broadcast + Chart.js history charts; threshold config, manual
  override, and out-of-range alerts.

## Roles
- **Farmer** — dashboard, set thresholds, manual override.
- **Admin** — + user management, register sensor nodes.
- **Viewer (Agronomist)** — read-only monitoring.

## Run
```bash
cd backend
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
copy .env.example .env             # MySQL DATABASE_URL (encode @ as %40)
.venv\Scripts\python seed.py       # users + 2 nodes
.venv\Scripts\python -m pytest tests/         # threshold engine 5/5
.venv\Scripts\python -m uvicorn app.main:app --port 8000

# Feed data — either path:
#  A) MQTT:  docker run -p 1883:1883 eclipse-mosquitto
#            .venv\Scripts\python -m app.mqtt_subscriber      (in another shell)
#            .venv\Scripts\python simulator/sensor_node.py
#  B) HTTP:  .venv\Scripts\python simulator/sensor_node.py --http http://localhost:8000

cd ../frontend && npm install && copy .env.example .env && npm run dev   # http://localhost:5183
```
Demo logins (password123): `admin@farm.zm`, `farmer@farm.zm`, `viewer@farm.zm`.

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | IoT sensor network transmitting to a server via MQTT | `app/mqtt_subscriber.py` (Paho, QoS 1), `simulator/sensor_node.py` | subscriber + simulator share the ingestion pipeline; HTTP path smoke-tested |
| 2 | Dashboard visualising live + historical data; threshold scheduling | `app/threshold.py`, `app/main.py` (WebSocket), `frontend` Chart.js | engine cycled pump across soil 27.7→65.3; 15 readings persisted |
| 3 | Evaluate transmission accuracy, scheduling correctness, responsiveness | `tests/test_threshold.py`, IrrigationEvent audit, WebSocket | tests 5/5; override + alerts + RBAC 403 verified on MySQL |

**Tests:** `pytest` → 5/5 (ON/OFF/hysteresis/override/alert). Verified on live
MySQL: simulated readings cycled the pump, history + events persisted, manual
override, and RBAC (viewer→thresholds = 403).

## Notes
- **MySQL** used for the time-series store (proposal allowed TimescaleDB *or*
  SQLite; standardised on the shared MySQL with timestamp indexes). SQLite dev
  fallback available.
- TLS/auth on the broker and QoS 1 are the production transport settings; the
  HTTP ingestion path exists for broker-free demos and testing.
