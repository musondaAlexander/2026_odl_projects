from rest_framework import serializers

from .models import EncryptedFile


class EncryptedFileListSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    recipient_username = serializers.CharField(source="recipient.username", read_only=True)

    class Meta:
        model = EncryptedFile
        fields = [
            "id",
            "filename",
            "mime_type",
            "size_bytes",
            "sender_username",
            "recipient_username",
            "recipient_key_fingerprint",
            "created_at",
            "downloaded_at",
        ]
        read_only_fields = fields


class EncryptedFileUploadSerializer(serializers.Serializer):
    """Validates the multipart upload of a client-encrypted file."""

    recipient = serializers.CharField(help_text="Recipient username or email.")
    filename = serializers.CharField(max_length=512)
    mime_type = serializers.CharField(max_length=128, required=False, default="application/octet-stream")
    wrapped_key = serializers.CharField()
    iv = serializers.CharField(max_length=64)
    recipient_key_fingerprint = serializers.CharField(max_length=128)
    ciphertext = serializers.FileField()


class EncryptedFileDownloadSerializer(serializers.ModelSerializer):
    """Payload a recipient needs to decrypt: wrapped key, iv, and ciphertext URL."""

    ciphertext_b64 = serializers.SerializerMethodField()

    class Meta:
        model = EncryptedFile
        fields = [
            "id",
            "filename",
            "mime_type",
            "size_bytes",
            "wrapped_key",
            "iv",
            "recipient_key_fingerprint",
            "ciphertext_b64",
        ]

    def get_ciphertext_b64(self, obj):
        import base64

        with obj.ciphertext.open("rb") as fh:
            return base64.b64encode(fh.read()).decode()
