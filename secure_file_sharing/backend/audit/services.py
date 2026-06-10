"""Audit-log services: append events and verify the HMAC chain integrity."""
import hashlib
import hmac
import json

from django.conf import settings
from django.db import transaction

from .models import AuditEvent


def _hmac_digest(prev_digest: str, payload: dict) -> str:
    """HMAC-SHA256 over (prev_digest || canonical-json(payload))."""
    key = settings.AUDIT_HMAC_KEY.encode()
    message = (prev_digest + json.dumps(payload, sort_keys=True, separators=(",", ":"))).encode()
    return hmac.new(key, message, hashlib.sha256).hexdigest()


@transaction.atomic
def record_event(actor, action: str, metadata: dict | None = None) -> AuditEvent:
    """Append a tamper-evident event to the chain. Serialized via row lock."""
    metadata = metadata or {}
    last = AuditEvent.objects.select_for_update().order_by("-sequence").first()
    prev_digest = last.digest if last else ""
    sequence = (last.sequence + 1) if last else 1
    payload = {
        "actor": str(actor.id) if actor is not None else None,
        "action": action,
        "metadata": metadata,
    }
    digest = _hmac_digest(prev_digest, payload)
    return AuditEvent.objects.create(
        sequence=sequence,
        actor=actor if getattr(actor, "id", None) else None,
        action=action,
        metadata=metadata,
        prev_digest=prev_digest,
        digest=digest,
    )


def verify_chain() -> dict:
    """Recompute the whole chain and report the first break, if any."""
    prev_digest = ""
    checked = 0
    for event in AuditEvent.objects.order_by("sequence").iterator():
        payload = {
            "actor": str(event.actor_id) if event.actor_id else None,
            "action": event.action,
            "metadata": event.metadata,
        }
        expected = _hmac_digest(prev_digest, payload)
        if not hmac.compare_digest(expected, event.digest) or event.prev_digest != prev_digest:
            return {
                "valid": False,
                "checked": checked,
                "broken_at_sequence": event.sequence,
            }
        prev_digest = event.digest
        checked += 1
    return {"valid": True, "checked": checked, "broken_at_sequence": None}
