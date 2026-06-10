"""Mondrian multidimensional k-anonymity (hand-implemented in pandas/NumPy).

Recursively partitions the dataset along the quasi-identifier with the widest
normalised range, splitting at the median; stops when a partition cannot be split
without violating k. Each final partition is generalised (numericals -> [min-max]
ranges, categoricals -> a set of values); records that cannot meet k are suppressed.
Implements the proposal's objective for k-anonymity compliance enforcement.
"""
from __future__ import annotations

import pandas as pd


def _is_numeric(series: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(series)


def _widest_qi(df: pd.DataFrame, qis: list[str]) -> str | None:
    """Pick the quasi-identifier column with the widest normalised spread."""
    best, best_width = None, -1.0
    for col in qis:
        s = df[col]
        if _is_numeric(s):
            rng = s.max() - s.min()
            denom = (s.max() - s.min()) or 1
            width = rng / denom if denom else 0
            # use number of distinct values as a tie-breaker proxy of spread
            width = (s.max() - s.min())
        else:
            width = s.nunique()
        if width > best_width:
            best, best_width = col, width
    return best if best_width > 0 else None


def _partition(df: pd.DataFrame, qis: list[str], k: int) -> list[pd.Index]:
    """Return a list of index groups, each of size >= k where possible."""
    finished: list[pd.Index] = []
    stack = [df.index]
    while stack:
        idx = stack.pop()
        sub = df.loc[idx]
        col = _widest_qi(sub, qis)
        if col is None:
            finished.append(idx)
            continue
        s = sub[col]
        if _is_numeric(s):
            median = s.median()
            left = idx[s <= median]
            right = idx[s > median]
        else:
            cats = sorted(s.unique())
            half = cats[: max(1, len(cats) // 2)]
            mask = s.isin(half)
            left = idx[mask.values]
            right = idx[(~mask).values]
        # Only accept a split if BOTH sides still satisfy k.
        if len(left) >= k and len(right) >= k:
            stack.append(left)
            stack.append(right)
        else:
            finished.append(idx)
    return finished


def _generalise(df: pd.DataFrame, group: pd.Index, qis: list[str]) -> dict:
    """Build the generalised value for each QI over a group/equivalence class."""
    out = {}
    sub = df.loc[group]
    for col in qis:
        s = sub[col]
        if _is_numeric(s):
            lo, hi = s.min(), s.max()
            out[col] = f"[{lo}-{hi}]" if lo != hi else f"{lo}"
        else:
            vals = sorted(map(str, s.unique()))
            out[col] = "{" + ",".join(vals) + "}"
    return out


def anonymize_k(df: pd.DataFrame, quasi_identifiers: list[str], k: int):
    """Apply Mondrian k-anonymity.

    Returns (anonymised_df, stats) where stats includes records_suppressed and
    whether every equivalence class satisfies k (compliance).
    """
    df = df.reset_index(drop=True)
    groups = _partition(df, quasi_identifiers, k)

    rows = []
    suppressed = 0
    for g in groups:
        if len(g) < k:
            suppressed += len(g)  # cannot be k-anonymised -> suppress
            continue
        gen = _generalise(df, g, quasi_identifiers)
        for ridx in g:
            row = df.loc[ridx].to_dict()
            row.update(gen)  # replace QI values with the generalised value
            rows.append(row)

    out = pd.DataFrame(rows, columns=df.columns) if rows else pd.DataFrame(columns=df.columns)
    compliant = verify_k_anonymity(out, quasi_identifiers, k) if len(out) else True
    stats = {
        "k": k,
        "records_in": len(df),
        "records_out": len(out),
        "records_suppressed": suppressed,
        "equivalence_classes": len(out.groupby(quasi_identifiers)) if len(out) else 0,
        "k_compliant": compliant,
    }
    return out, stats


def verify_k_anonymity(df: pd.DataFrame, quasi_identifiers: list[str], k: int) -> bool:
    """Post-processing check: 100% of equivalence classes must have >= k records."""
    if len(df) == 0:
        return True
    sizes = df.groupby(quasi_identifiers).size()
    return bool((sizes >= k).all())


def suppress_identifiers(df: pd.DataFrame, direct_identifiers: list[str]) -> pd.DataFrame:
    """Drop direct-identifier columns entirely (suppression)."""
    return df.drop(columns=[c for c in direct_identifiers if c in df.columns])
