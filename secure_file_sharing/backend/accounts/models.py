"""User and PKI key models.

Security note: the server stores ONLY public keys and self-signed certificates.
Private keys are generated in the browser via the Web Crypto API and never leave
the client device — this is what makes the platform end-to-end encrypted.
"""
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user. Email is required and unique (used for recipient lookup)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ["email"]

    def __str__(self) -> str:
        return f"{self.username} <{self.email}>"


class PublicKey(models.Model):
    """A user's registered public key + self-signed certificate.

    Only one key may be active per user at a time. Encrypting clients look up
    the recipient's *active* public key before encrypting a file for them.
    """

    class Algorithm(models.TextChoices):
        RSA_OAEP = "RSA-OAEP", "RSA-OAEP (2048+)"
        ECDH = "ECDH", "ECDH P-256"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="public_keys")
    algorithm = models.CharField(max_length=16, choices=Algorithm.choices, default=Algorithm.RSA_OAEP)
    # SPKI public key exported as base64 (DER) from the Web Crypto API.
    public_key_spki = models.TextField()
    # Self-signed certificate (JSON web-signature style) binding identity -> key.
    certificate = models.TextField(blank=True, default="")
    fingerprint = models.CharField(max_length=128, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(is_active=True),
                name="one_active_key_per_user",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user.username}:{self.algorithm}:{self.fingerprint[:12]}"
