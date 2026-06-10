"""Tests for the tamper-evident HMAC audit chain (proposal objective 3)."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import AuditEvent
from .services import record_event, verify_chain

User = get_user_model()


class AuditChainTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("alice", "alice@example.com", "pw12345678")

    def test_chain_is_valid_after_appends(self):
        for i in range(5):
            record_event(self.user, "FILE_UPLOAD", {"i": i})
        result = verify_chain()
        self.assertTrue(result["valid"])
        self.assertEqual(result["checked"], 5)

    def test_tampering_breaks_chain(self):
        record_event(self.user, "FILE_UPLOAD", {"i": 0})
        target = record_event(self.user, "FILE_UPLOAD", {"i": 1})
        record_event(self.user, "FILE_UPLOAD", {"i": 2})

        # Tamper with a middle entry's metadata directly in the DB.
        AuditEvent.objects.filter(pk=target.pk).update(metadata={"i": 999})

        result = verify_chain()
        self.assertFalse(result["valid"])
        self.assertEqual(result["broken_at_sequence"], target.sequence)
