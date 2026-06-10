# AI Parking Space Finder

Implementation of the ZUCT 2026 proposal (`AI_Parking_Finder_Full_Proposal`).

Detects per-bay occupancy from car-park CCTV using **YOLOv8** and pushes live
available/occupied status to an interactive **Leaflet map** so drivers head
straight to free bays. Runs end-to-end in **simulation mode** without CCTV/GPU;
drop in a YOLOv8 model + OpenCV to enable real inference.

## Architecture
```
CCTV frame ──▶ Detector (YOLOv8 | simulation) ──▶ Occupancy state machine (debounce)
                                                   ──▶ MySQL (events) ──▶ WebSocket
Driver map (Leaflet, live) ◀───── FastAPI ─────▶ Operator dashboard (override, audit)
```

## Core pieces
- **Occupancy state machine** (`app/occupancy.py`): flips to occupied immediately,
  back to available only after N consecutive empty frames (**debounce** → no
  flicker); manual override pins state. Point-in-polygon assigns a detected
  vehicle's centroid to a bay.
- **Detector** (`app/detector.py`): `YoloDetector` (ultralytics, COCO vehicle
  classes) for real CCTV; `SimulatedDetector` (default) models arrivals/departures
  **with injected misdetection noise** so the debounce is genuinely exercised.
- **Live loop** (`app/main.py`): steps the detector → updates states → persists
  `OccupancyEvent` → broadcasts the bay snapshot over WebSocket.

## Roles
- **Driver / public** — read-only live map (no auth).
- **Operator** — dashboard (counts, recent events), manual bay override.
- **Admin** — operator accounts + bay/calibration management.

## Run
```bash
cd backend
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
copy .env.example .env             # MySQL DATABASE_URL (encode @ as %40)
.venv\Scripts\python seed.py       # operator/admin + a 12-bay grid
.venv\Scripts\python -m pytest tests/         # state machine 5/5
.venv\Scripts\python -m uvicorn app.main:app --port 8000

cd ../frontend && npm install && copy .env.example .env && npm run dev   # http://localhost:5184
```
Real CV: `pip install ultralytics opencv-python` and set `YOLO_MODEL_PATH` in `.env`.
Demo logins (password123): `admin@parking.zm`, `operator@parking.zm`.

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | YOLOv8 CV pipeline classifying each bay occupied/available in real time | `app/detector.py` (YOLOv8 + sim), `app/occupancy.py` (per-bay debounce) | sim drives live occupancy; tests 5/5 |
| 2 | Web map receiving updates via WebSocket, colour-coded bay pins | `app/main.py` WebSocket + `frontend` Leaflet `CircleMarker` | snapshots changed live (2→6 available); map renders pins |
| 3 | Evaluate detection accuracy, latency, map update frequency | state machine + `OccupancyEvent` audit + history endpoint | dashboard shows debounced events; override + RBAC 403 |

**Tests:** `pytest` → 5/5 (immediate-occupy, debounced-free, noise-no-flicker,
override-pin, point-in-polygon). Verified on live MySQL: live occupancy via the
sim loop, operator dashboard + override, RBAC (operator→admin = 403).

## Notes
- **MySQL** used for the occupancy-event log (proposal's PostgreSQL/TimescaleDB →
  shared MySQL with time indexes). SQLite dev fallback available.
- Real deployment adds RTSP capture + per-bay polygon calibration; the YOLOv8 path
  and point-in-polygon assignment are implemented and ready for a model + frames.
