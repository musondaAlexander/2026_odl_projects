"""Correctness tests for the privacy engine (proposal evaluation targets)."""
import numpy as np
import pandas as pd

from app.privacy import dp, kanon, service


def _sample_df(n=200, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "name": [f"person{i}" for i in range(n)],
        "age": rng.integers(18, 80, n),
        "zipcode": rng.choice(["10100", "10101", "10102", "10103"], n),
        "income": rng.integers(1000, 20000, n),
    })


def test_k_anonymity_is_100_percent_compliant():
    df = _sample_df()
    out, stats = kanon.anonymize_k(df, quasi_identifiers=["age", "zipcode"], k=5)
    # Every equivalence class must satisfy k -> compliance gate.
    assert stats["k_compliant"] is True
    assert kanon.verify_k_anonymity(out, ["age", "zipcode"], 5) is True


def test_direct_identifiers_are_suppressed():
    df = _sample_df()
    out, _ = service.anonymize(
        df,
        classification={"name": "direct_identifier", "age": "quasi_identifier",
                        "zipcode": "quasi_identifier", "income": "sensitive"},
        epsilon=1.0, k=5,
    )
    assert "name" not in out.columns  # direct identifier dropped


def test_laplace_noise_distribution_is_consistent():
    # The Laplace mechanism on a fixed mean should be unbiased and have variance
    # ~ 2*(sensitivity/epsilon)^2 over many samples (distribution-fit check).
    values = np.full(1000, 50.0)
    eps, lo, hi = 1.0, 0.0, 100.0
    sensitivity = (hi - lo) / len(values)
    samples = np.array([dp.privatize_mean_laplace(values, eps, lo, hi) for _ in range(10000)])
    # Mean of noised estimates should be close to the true mean (50).
    assert abs(samples.mean() - 50.0) < 1.0
    # Empirical variance should be within a tolerance of the theoretical 2b^2.
    b = sensitivity / eps
    theoretical_var = 2 * b * b
    emp_var = samples.var()
    assert 0.5 * theoretical_var <= emp_var <= 2.0 * theoretical_var


def test_utility_increases_with_epsilon():
    rng = np.random.default_rng(1)
    vals = rng.integers(0, 100, 500).astype(float)
    acc_low = np.mean([dp.query_accuracy(vals.mean(), dp.privatize_mean_laplace(vals, 0.1, 0, 100)) for _ in range(50)])
    acc_high = np.mean([dp.query_accuracy(vals.mean(), dp.privatize_mean_laplace(vals, 8.0, 0, 100)) for _ in range(50)])
    assert acc_high >= acc_low  # more budget -> more accuracy
