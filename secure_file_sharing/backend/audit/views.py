from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditEvent
from .serializers import AuditEventSerializer
from .services import verify_chain


class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class AuditListView(generics.ListAPIView):
    """Admins see the full log; regular users see only their own events."""

    serializer_class = AuditEventSerializer

    def get_queryset(self):
        qs = AuditEvent.objects.select_related("actor").order_by("-sequence")
        if not self.request.user.is_staff:
            qs = qs.filter(actor=self.request.user)
        return qs


class AuditVerifyView(APIView):
    """Recompute the HMAC chain and report integrity. Admin only."""

    permission_classes = [IsStaff]

    def get(self, request):
        return Response(verify_chain())
