from django.urls import path

from .views import AuditListView, AuditVerifyView

urlpatterns = [
    path("events/", AuditListView.as_view(), name="audit-events"),
    path("verify/", AuditVerifyView.as_view(), name="audit-verify"),
]
