"""Rule-based irrigation scheduling engine (proposal objective 2).

Pure logic (no I/O) so it is trivially unit-testable. Given the current soil
moisture and a configured [lower, upper] band, decide the pump action with
hysteresis: turn ON below the lower bound, turn OFF at/above the upper bound,
otherwise hold the current state. A manual override always wins.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class PumpDecision:
    action: str       # "on" | "off" | "hold"
    pump_on: bool
    reason: str


def decide(soil_moisture: float, lower: float, upper: float,
           pump_currently_on: bool, override: str | None = None) -> PumpDecision:
    if override in ("on", "off"):
        on = override == "on"
        return PumpDecision(action=override, pump_on=on, reason=f"manual override ({override})")

    if soil_moisture < lower:
        return PumpDecision("on", True, f"soil {soil_moisture} < lower {lower}")
    if soil_moisture >= upper:
        return PumpDecision("off", False, f"soil {soil_moisture} >= upper {upper}")
    # within the band -> hysteresis: keep current state
    return PumpDecision("hold", pump_currently_on, f"soil {soil_moisture} within [{lower}, {upper}]")


def out_of_safe_range(value: float, low: float, high: float) -> bool:
    """Alerting helper: is a reading outside the safe operating range?"""
    return value < low or value > high
