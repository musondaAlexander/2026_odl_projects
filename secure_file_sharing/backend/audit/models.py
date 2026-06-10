"""Tamper-evident audit log.

Each entry stores an HMAC-SHA256 digest computed over its own content PLUS the
digest of the previous entry (a hash chain). Deleting or modifying any entry
breaks the chain for every subsequent entry, making tampering detectable.
"""
import uuid

from django.conf import settings
from django.db import models


class AuditEvent(models.Model):
    class Action(models.TextChoices):
        KEY_REGISTER = "KEY_REGISTER"
        FILE_UPLOAD = "FILE_UPLOAD"
        FILE_DOWNLOAD = "FILE_DOWNLOAD"
        FILE_SHARE = "FILE_SHARE"
        FILE_ACCESS = "FILE_ACCESS"
        FILE_DELETE = "FILE_DELETE"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Monotonic sequence number assigned in record_event(); defines chain order.
    sequence = models.BigIntegerField(unique=True, editable=False, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="audit_events"
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    prev_digest = models.CharField(max_length=64, blank=True, default="")
    digest = models.CharField(max_length=64, db_index=True)

    class Meta:
        ordering = ["sequence"]

    def __str__(self) -> str:
        return f"#{self.sequence} {self.action} {self.digest[:12]}"
