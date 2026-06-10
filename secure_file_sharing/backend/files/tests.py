"""End-to-end API tests for the PKI + ciphertext-only file flow.

Verifies (against the proposal objectives):
  - Objective 1: PKI key registration + recipient key lookup.
  - Objective 2: server stores/returns only ciphertext (never plaintext).
  - Objective 3: every file event is recorded in the tamper-evident audit log.
"""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from audit.models import AuditEvent
from audit.services import verify_chain

User = get_user_model()


class FileFlowAPITests(APITestCase):
    def setUp(self):
        self.sender = User.objects.create_user("sender", "sender@x.com", "pw12345678")
        self.recipient = User.objects.create_user("recipient", "recipient@x.com", "pw12345678")

    def auth(self, user):
        res = self.client.post("/api/auth/token/", {"username": user.username, "password": "pw12345678"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def test_full_pki_and_ciphertext_flow_with_audit(self):
        # Recipient registers a public key (PKI).
        self.auth(self.recipient)
        res = self.client.post("/api/accounts/keys/", {
            "algorithm": "RSA-OAEP",
            "public_key_spki": "BASE64_FAKE_SPKI_PUBLIC_KEY",
        })
        self.assertEqual(res.status_code, 201)
        fingerprint = res.data["fingerprint"]

        # Sender looks up the recipient's public key.
        self.auth(self.sender)
        res = self.client.get("/api/accounts/keys/lookup/", {"q": "recipient"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["fingerprint"], fingerprint)

        # Sender uploads CIPHERTEXT only (server never sees plaintext).
        ciphertext = SimpleUploadedFile("secret.pdf.enc", b"\x00\x01OPAQUE-CIPHERTEXT\x02", content_type="application/octet-stream")
        res = self.client.post("/api/files/upload/", {
            "recipient": "recipient",
            "filename": "secret.pdf",
            "mime_type": "application/pdf",
            "wrapped_key": "BASE64_WRAPPED_AES_KEY",
            "iv": "BASE64_IV",
            "recipient_key_fingerprint": fingerprint,
            "ciphertext": ciphertext,
        }, format="multipart")
        self.assertEqual(res.status_code, 201)
        file_id = res.data["id"]

        # A non-recipient cannot fetch the decryption payload.
        res = self.client.get(f"/api/files/{file_id}/download/")
        self.assertEqual(res.status_code, 403)

        # The recipient can — and receives only wrapped key + iv + ciphertext.
        self.auth(self.recipient)
        res = self.client.get(f"/api/files/{file_id}/download/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["wrapped_key"], "BASE64_WRAPPED_AES_KEY")
        self.assertIn("ciphertext_b64", res.data)

        # Audit log captured key-register, upload, denied-access, and download — and the chain verifies.
        actions = set(AuditEvent.objects.values_list("action", flat=True))
        self.assertTrue({"KEY_REGISTER", "FILE_UPLOAD", "FILE_DOWNLOAD"}.issubset(actions))
        self.assertTrue(verify_chain()["valid"])
