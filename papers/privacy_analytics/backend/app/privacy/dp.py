"""Differential privacy mechanisms (Laplace + Gaussian) via IBM diffprivlib.

Implements epsilon- and (epsilon, delta)-differential privacy for numerical
sensitive columns. Sensitivity is computed from user-declared value bounds (NOT
data-derived, which would leak privacy), per the proposal's objective 1.
"""
from __future__ import annotations

import numpy as np
from diffprivlib.mechanisms import Laplace, Gaussian


def _l1_sensitivity_of_mean(lower: float, upper: float, n: int) -> float:
    """L1 sensitivity of the mean query on a column bounded to [lower, upper]:
    changing one record moves the mean by at most (upper-lower)/n."""
    if n <= 0:
        return upper - lower
    return (upper - lower) / n


def privatize_mean_laplace(values: np.ndarray, epsilon: float, lower: float, upper: float) -> float:
    """Return an epsilon-DP estimate of the mean using the Laplace mechanism."""
    clipped = np.clip(values, lower, upper)
    true_mean = float(np.mean(clipped)) if len(clipped) else 0.0
    sensitivity = _l1_sensitivity_of_mean(lower, upper, len(clipped))
    mech = Laplace(epsilon=epsilon, sensitivity=sensitivity)
    return float(mech.randomise(true_mean))


def privatize_mean_gaussian(values: np.ndarray, epsilon: float, delta: float,
                            lower: float, upper: float) -> float:
    """Return an (epsilon, delta)-DP estimate of the mean via the Gaussian mechanism."""
    clipped = np.clip(values, lower, upper)
    true_mean = float(np.mean(clipped)) if len(clipped) else 0.0
    sensitivity = _l1_sensitivity_of_mean(lower, upper, len(clipped))
    mech = Gaussian(epsilon=epsilon, delta=delta, sensitivity=sensitivity)
    return float(mech.randomise(true_mean))


def add_laplace_noise_to_column(values: np.ndarray, epsilon: float,
                                lower: float, upper: float) -> np.ndarray:
    """Per-record Laplace perturbation of a numerical column (local-DP style).
    Sensitivity is the value range; each value gets independent noise."""
    sensitivity = float(upper - lower)
    mech = Laplace(epsilon=epsilon, sensitivity=sensitivity)
    return np.array([mech.randomise(float(v)) for v in np.clip(values, lower, upper)])


def query_accuracy(true_value: float, private_value: float) -> float:
    """Relative accuracy of a privatized aggregate vs the true value (0..1)."""
    if true_value == 0:
        return 1.0 if private_value == 0 else 0.0
    return max(0.0, 1.0 - abs(private_value - true_value) / abs(true_value))
