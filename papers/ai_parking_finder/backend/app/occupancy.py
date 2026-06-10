"""Bay occupancy state machine with temporal debouncing (proposal key feature).

Raw per-frame detections are noisy, so a bay only flips state after the new
reading has persisted for a threshold number of consecutive confirmations:
  - available -> occupied: confirm on detection (fast, so drivers aren't sent to a
    bay that just filled),
  - occupied  -> available: only after `free_confirmations` consecutive empties
    (slow, to avoid flicker as a car manoeuvres).
A manual operator override pins the state until cleared.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class BayState:
    status: str = "available"          # "available" | "occupied"
    _empty_streak: int = 0
    _occupied_streak: int = 0
    override: str | None = None        # "available" | "occupied" | None

    def update(self, detected_vehicle: bool, free_confirmations: int = 3) -> bool:
        """Feed one detection; return True if the published status changed."""
        if self.override in ("available", "occupied"):
            changed = self.status != self.override
            self.status = self.override
            return changed

        if detected_vehicle:
            self._occupied_streak += 1
            self._empty_streak = 0
            if self.status == "available":   # flip to occupied immediately
                self.status = "occupied"
                return True
        else:
            self._empty_streak += 1
            self._occupied_streak = 0
            if self.status == "occupied" and self._empty_streak >= free_confirmations:
                self.status = "available"
                return True
        return False


def point_in_polygon(x: float, y: float, polygon: list[list[float]]) -> bool:
    """Ray-casting test: is (x, y) inside the bay polygon? Used to assign a
    detected vehicle's centroid to a bay."""
    inside = False
    n = len(polygon)
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi):
            inside = not inside
        j = i
    return inside
