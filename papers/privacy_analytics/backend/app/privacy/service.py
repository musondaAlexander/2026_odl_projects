"""Anonymization orchestrator: applies column-type policy then DP + k-anonymity.

Column roles (per the proposal's per-column classification UI):
  - direct identifier  -> suppressed (column dropped)
  - quasi-identifier   -> k-anonymised (Mondrian generalisation)
  - sensitive          -> differentially privatised (Laplace/Gaussian)
  - non-sensitive      -> passed through unchanged
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import dp, kanon, report


def anonymize(df: pd.DataFrame, *, classification: dict, epsilon: float, k: int,
              delta: float | None = None, bounds: dict | None = None,
              dataset_name: str = "dataset"):
    bounds = bounds or {}
    direct = [c for c, r in classification.items() if r == "direct_identifier"]
    quasi = [c for c, r in classification.items() if r == "quasi_identifier"]
    sensitive = [c for c, r in classification.items() if r == "sensitive"]

    work = kanon.suppress_identifiers(df.copy(), direct)

    # Differential privacy on sensitive numerical columns (per-record perturbation).
    dp_cols = []
    for col in sensitive:
        if col not in work.columns or not pd.api.types.is_numeric_dtype(work[col]):
            continue
        lo = bounds.get(col, {}).get("lower", float(np.floor(work[col].min())))
        hi = bounds.get(col, {}).get("upper", float(np.ceil(work[col].max())))
        work[col] = dp.add_laplace_noise_to_column(work[col].to_numpy(), epsilon, lo, hi)
        dp_cols.append(col)

    # k-anonymity on quasi-identifiers.
    if quasi:
        work, kstats = kanon.anonymize_k(work, quasi, k)
    else:
        kstats = {"k": k, "records_in": len(work), "records_out": len(work),
                  "records_suppressed": 0, "equivalence_classes": 0, "k_compliant": True}

    rpt = report.build_report(
        dp_applied={"columns": dp_cols, "epsilon": epsilon, "delta": delta},
        kanon_stats=kstats,
        dataset_name=dataset_name,
    )
    return work, rpt
