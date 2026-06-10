"""Encrypted file model.

The server stores ONLY:
  - the AES-256-GCM ciphertext blob (the file, encrypted client-side),
  - the AES content key WRAPPED with the recipient's RSA-OAEP public key,
  - the GCM IV and minimal metadata.

It never sees the plaintext file, the plaintext AES key, or any private key.
Only the recipient, holding their private key in the browser, can unwrap the
AES key and decrypt the blob.
"""
import uuid

from django.conf import settings
from django.db import models


def ciphertext_path(instance, filename):
    return f"ciphertext/{instance.recipient_id}/{instance.id}.bin"


class EncryptedFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_files"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_files"
    )
    # Original filename — clients may send this pre-encrypted; stored as provided.
    filename = models.CharField(max_length=512)
    mime_type = models.CharField(max_length=128, blank=True, default="application/octet-stream")
    size_bytes = models.BigIntegerField(default=0)

    # Ciphertext blob (AES-256-GCM output), stored as an opaque file.
    ciphertext = models.FileField(upload_to=ciphertext_path)
    # AES content key wrapped with the recipient's public key (base64).
    wrapped_key = models.TextField()
    # AES-GCM initialization vector (base64).
    iv = models.CharField(max_length=64)
    # Fingerprint of the recipient public key used, for client validation.
    recipient_key_fingerprint = models.CharField(max_length=128)

    created_at = models.DateTimeField(auto_now_add=True)
    downloaded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.filename} {self.sender_id}->{self.recipient_id}"
