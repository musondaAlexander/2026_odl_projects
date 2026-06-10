import hashlib

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import record_event
from .models import PublicKey
from .serializers import (
    PublicKeySerializer,
    RecipientKeySerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class PublicKeyView(APIView):
    """Register (POST) or fetch (GET) the authenticated user's active key."""

    def get(self, request):
        key = PublicKey.objects.filter(user=request.user, is_active=True).first()
        if not key:
            return Response({"detail": "No active key."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PublicKeySerializer(key).data)

    def post(self, request):
        serializer = PublicKeySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        spki = serializer.validated_data["public_key_spki"]
        fingerprint = hashlib.sha256(spki.encode()).hexdigest()

        # Deactivate any previous active key (single active key per user).
        PublicKey.objects.filter(user=request.user, is_active=True).update(is_active=False)
        key = PublicKey.objects.create(
            user=request.user,
            algorithm=serializer.validated_data.get("algorithm", PublicKey.Algorithm.RSA_OAEP),
            public_key_spki=spki,
            certificate=serializer.validated_data.get("certificate", ""),
            fingerprint=fingerprint,
            is_active=True,
        )
        record_event(request.user, "KEY_REGISTER", {"fingerprint": fingerprint})
        return Response(PublicKeySerializer(key).data, status=status.HTTP_201_CREATED)


class RecipientKeyLookupView(APIView):
    """Look up a recipient's active public key by username or email."""

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "q (username or email) required."}, status=400)
        user = User.objects.filter(username__iexact=query).first() or \
            User.objects.filter(email__iexact=query).first()
        if not user:
            return Response({"detail": "Recipient not found."}, status=404)
        key = PublicKey.objects.filter(user=user, is_active=True).first()
        if not key:
            return Response({"detail": "Recipient has not registered a key."}, status=404)
        return Response(RecipientKeySerializer(key).data)
