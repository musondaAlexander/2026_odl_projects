"""State-machine debounce tests + point-in-polygon assignment."""
from app.occupancy import BayState, point_in_polygon


def test_flips_to_occupied_immediately_on_detection():
    s = BayState(status="available")
    assert s.update(True) is True
    assert s.status == "occupied"


def test_does_not_flip_to_available_until_confirmations_met():
    s = BayState(status="occupied")
    # one empty frame is not enough (debounce)
    assert s.update(False, free_confirmations=3) is False
    assert s.status == "occupied"
    assert s.update(False, free_confirmations=3) is False
    # third consecutive empty -> now flip
    assert s.update(False, free_confirmations=3) is True
    assert s.status == "available"


def test_noise_does_not_cause_flicker():
    s = BayState(status="occupied")
    # occupied with intermittent misdetections should NOT free the bay
    seq = [False, True, False, True, False]
    flips = sum(s.update(d, free_confirmations=3) for d in seq)
    assert flips == 0 and s.status == "occupied"


def test_override_pins_state():
    s = BayState(status="available", override="occupied")
    assert s.update(False) is True  # override forces occupied
    assert s.status == "occupied"


def test_point_in_polygon():
    square = [[0, 0], [10, 0], [10, 10], [0, 10]]
    assert point_in_polygon(5, 5, square) is True
    assert point_in_polygon(15, 5, square) is False
