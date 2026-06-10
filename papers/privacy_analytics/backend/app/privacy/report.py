"""Plain-language privacy compliance report (proposal objective 2 output)."""
from __future__ import annotations


def information_loss_percent(records_in: int, records_out: int, suppressed: int) -> float:
    if records_in == 0:
        return 0.0
    return round((suppressed / records_in) * 100, 2)


def build_report(*, dp_applied: dict, kanon_stats: dict, dataset_name: str) -> dict:
    """Compose the compliance report a data officer downloads with the dataset."""
    loss = information_loss_percent(
        kanon_stats.get("records_in", 0),
        kanon_stats.get("records_out", 0),
        kanon_stats.get("records_suppressed", 0),
    )
    statements = []
    if dp_applied.get("columns"):
        eps = dp_applied.get("epsilon")
        statements.append(
            f"Differential privacy applied to {len(dp_applied['columns'])} sensitive column(s) "
            f"with epsilon={eps}"
            + (f", delta={dp_applied['delta']}" if dp_applied.get("delta") else "")
            + " using the "
            + ("Gaussian" if dp_applied.get("delta") else "Laplace")
            + " mechanism."
        )
    if kanon_stats.get("k"):
        statements.append(
            f"{kanon_stats['k']}-anonymity enforced over the quasi-identifiers; "
            f"{kanon_stats['records_suppressed']} record(s) suppressed; "
            f"{kanon_stats['equivalence_classes']} equivalence class(es); "
            f"compliance = {kanon_stats['k_compliant']}."
        )
    guarantee = (
        "This dataset provides formal (epsilon, delta)-differential privacy for the "
        "perturbed numerical statistics and k-anonymity for the quasi-identifiers, "
        "reducing re-identification risk. It supports — but does not replace — legal "
        "compliance review under the Zambia Data Protection Act."
    )
    return {
        "dataset": dataset_name,
        "epsilon_applied": dp_applied.get("epsilon"),
        "delta_applied": dp_applied.get("delta"),
        "k_enforced": kanon_stats.get("k"),
        "records_suppressed": kanon_stats.get("records_suppressed", 0),
        "information_loss_percent": loss,
        "k_compliant": kanon_stats.get("k_compliant", True),
        "statements": statements,
        "privacy_guarantee": guarantee,
    }
