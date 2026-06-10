from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", default=None, read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            "sequence",
            "actor",
            "actor_username",
            "action",
            "metadata",
            "timestamp",
            "prev_digest",
            "digest",
        ]
        read_only_fields = fields
