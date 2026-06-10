from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import PublicKey

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_staff", "date_joined"]
        read_only_fields = fields


class PublicKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicKey
        fields = [
            "id",
            "algorithm",
            "public_key_spki",
            "certificate",
            "fingerprint",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "fingerprint", "is_active", "created_at"]


class RecipientKeySerializer(serializers.Serializer):
    """Public projection used by senders looking up a recipient's key."""

    user_id = serializers.UUIDField(source="user.id")
    username = serializers.CharField(source="user.username")
    email = serializers.EmailField(source="user.email")
    algorithm = serializers.CharField()
    public_key_spki = serializers.CharField()
    fingerprint = serializers.CharField()
