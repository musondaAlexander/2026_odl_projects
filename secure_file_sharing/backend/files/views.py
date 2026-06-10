from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import record_event
from .models import EncryptedFile
from .serializers import (
    EncryptedFileDownloadSerializer,
    EncryptedFileListSerializer,
    EncryptedFileUploadSerializer,
)

User = get_user_model()


class FileListView(generics.ListAPIView):
    """List files the user sent or received."""

    serializer_class = EncryptedFileListSerializer

    def get_queryset(self):
        box = self.request.query_params.get("box", "received")
        user = self.request.user
        if box == "sent":
            return EncryptedFile.objects.filter(sender=user)
        return EncryptedFile.objects.filter(recipient=user)


class FileUploadView(APIView):
    """Receive a client-encrypted (ciphertext-only) file and store it."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EncryptedFileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        recipient = (
            User.objects.filter(username__iexact=data["recipient"]).first()
            or User.objects.filter(email__iexact=data["recipient"]).first()
        )
        if not recipient:
            return Response({"detail": "Recipient not found."}, status=404)

        blob = data["ciphertext"]
        enc = EncryptedFile.objects.create(
            sender=request.user,
            recipient=recipient,
            filename=data["filename"],
            mime_type=data.get("mime_type", "application/octet-stream"),
            size_bytes=blob.size,
            ciphertext=blob,
            wrapped_key=data["wrapped_key"],
            iv=data["iv"],
            recipient_key_fingerprint=data["recipient_key_fingerprint"],
        )
        record_event(
            request.user,
            "FILE_UPLOAD",
            {"file_id": str(enc.id), "recipient": recipient.username, "size": blob.size},
        )
        return Response(EncryptedFileListSerializer(enc).data, status=status.HTTP_201_CREATED)


class FileDownloadView(APIView):
    """Return the ciphertext + wrapped key for the recipient to decrypt locally."""

    def get(self, request, pk):
        enc = EncryptedFile.objects.filter(pk=pk).first()
        if not enc:
            return Response({"detail": "Not found."}, status=404)
        # Only the recipient may fetch the decryption payload.
        if enc.recipient_id != request.user.id:
            record_event(request.user, "FILE_ACCESS", {"file_id": str(enc.id), "denied": True})
            return Response({"detail": "Forbidden."}, status=403)

        if enc.downloaded_at is None:
            enc.downloaded_at = timezone.now()
            enc.save(update_fields=["downloaded_at"])
        record_event(request.user, "FILE_DOWNLOAD", {"file_id": str(enc.id)})
        return Response(EncryptedFileDownloadSerializer(enc).data)


class FileDeleteView(APIView):
    def delete(self, request, pk):
        enc = EncryptedFile.objects.filter(
            Q(sender=request.user) | Q(recipient=request.user), pk=pk
        ).first()
        if not enc:
            return Response({"detail": "Not found."}, status=404)
        file_id = str(enc.id)
        enc.ciphertext.delete(save=False)
        enc.delete()
        record_event(request.user, "FILE_DELETE", {"file_id": file_id})
        return Response(status=status.HTTP_204_NO_CONTENT)
