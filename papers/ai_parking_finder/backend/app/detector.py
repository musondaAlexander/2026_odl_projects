"""Vehicle detector.

Real mode: YOLOv8 (ultralytics) detects vehicles in a CCTV frame; each detection
centroid is assigned to a bay via point-in-polygon. Real mode activates only if
`ultralytics` + a model file are present.

Simulation mode (default, no GPU/CCTV needed): models a realistic car park where
bays independently fill and empty over time — so the whole pipeline (state machine,
WebSocket, dashboard) runs end-to-end without hardware.
"""
from __future__ import annotations

import random


class SimulatedDetector:
    """Per-bay arrival/departure process for demos and tests."""

    def __init__(self, bay_ids: list[str], seed: int | None = None, occupied_prob: float = 0.5):
        self.rng = random.Random(seed)
        self.state = {b: self.rng.random() < occupied_prob for b in bay_ids}

    def step(self) -> dict[str, bool]:
        """Advance one tick; randomly flip a few bays. Returns bay_id -> vehicle_present."""
        for b in self.state:
            # small chance to change, biased toward turnover
            if self.rng.random() < 0.15:
                self.state[b] = not self.state[b]
        # inject some per-frame noise so the debounce logic is exercised
        noisy = {}
        for b, occ in self.state.items():
            if self.rng.random() < 0.1:      # 10% misdetection
                noisy[b] = not occ
            else:
                noisy[b] = occ
        return noisy


class YoloDetector:  # pragma: no cover - requires GPU/model, not run in CI
    """Real YOLOv8 detector. Enable with: pip install ultralytics opencv-python."""

    VEHICLE_CLASSES = {2, 3, 5, 7}  # car, motorcycle, bus, truck (COCO)

    def __init__(self, model_path: str, bays: list[dict]):
        from ultralytics import YOLO
        self.model = YOLO(model_path)
        self.bays = bays  # [{id, polygon}]

    def detect(self, frame) -> dict[str, bool]:
        from .occupancy import point_in_polygon
        result = self.model(frame, verbose=False)[0]
        present = {b["id"]: False for b in self.bays}
        for box, cls in zip(result.boxes.xywh.tolist(), result.boxes.cls.tolist()):
            if int(cls) not in self.VEHICLE_CLASSES:
                continue
            cx, cy = box[0], box[1]
            for b in self.bays:
                if point_in_polygon(cx, cy, b["polygon"]):
                    present[b["id"]] = True
        return present


def build_detector(bay_ids, bays=None, model_path=None):
    """Use YOLOv8 if available + configured; otherwise the simulator."""
    if model_path:
        try:
            return YoloDetector(model_path, bays or [{"id": b, "polygon": []} for b in bay_ids]), "yolov8"
        except Exception:
            pass
    return SimulatedDetector(bay_ids), "simulation"
