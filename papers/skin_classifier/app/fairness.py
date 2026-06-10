"""Skin-tone fairness evaluation (proposal objective 3).

Computes accuracy/sensitivity separately for Fitzpatrick I–III vs IV–VI groups
from a list of (true_label, predicted_label, fitzpatrick_type) tuples, so the
model can be checked for performance parity across skin tones.
"""
from __future__ import annotations


def _group(fitz: int) -> str:
    return "I-III" if fitz <= 3 else "IV-VI"


def evaluate(records: list[tuple[str, str, int]]) -> dict:
    groups: dict[str, dict] = {"I-III": {"n": 0, "correct": 0}, "IV-VI": {"n": 0, "correct": 0}}
    overall_correct = 0
    for true_label, pred_label, fitz in records:
        g = _group(fitz)
        groups[g]["n"] += 1
        if true_label == pred_label:
            groups[g]["correct"] += 1
            overall_correct += 1
    out = {"overall_accuracy": round(overall_correct / len(records), 4) if records else 0.0, "groups": {}}
    for g, d in groups.items():
        out["groups"][g] = {"n": d["n"], "accuracy": round(d["correct"] / d["n"], 4) if d["n"] else None}
    # parity gap between the two groups (a fairness flag)
    a1 = out["groups"]["I-III"]["accuracy"]
    a2 = out["groups"]["IV-VI"]["accuracy"]
    out["parity_gap"] = round(abs(a1 - a2), 4) if (a1 is not None and a2 is not None) else None
    return out
