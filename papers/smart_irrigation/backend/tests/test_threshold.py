"""Threshold-engine tests (proposal objective 2: correctness of scheduling)."""
from app.threshold import decide, out_of_safe_range


def test_turns_pump_on_below_lower():
    d = decide(soil_moisture=25, lower=30, upper=60, pump_currently_on=False)
    assert d.pump_on is True and d.action == "on"


def test_turns_pump_off_at_upper():
    d = decide(soil_moisture=60, lower=30, upper=60, pump_currently_on=True)
    assert d.pump_on is False and d.action == "off"


def test_hysteresis_holds_within_band():
    # Within band -> keep current state (no flicker).
    on = decide(soil_moisture=45, lower=30, upper=60, pump_currently_on=True)
    off = decide(soil_moisture=45, lower=30, upper=60, pump_currently_on=False)
    assert on.pump_on is True and on.action == "hold"
    assert off.pump_on is False and off.action == "hold"


def test_manual_override_wins():
    d = decide(soil_moisture=10, lower=30, upper=60, pump_currently_on=False, override="off")
    assert d.pump_on is False and "override" in d.reason


def test_safe_range_alert():
    assert out_of_safe_range(20, 30, 60) is True
    assert out_of_safe_range(45, 30, 60) is False
