from django.urls import path

from .views import MeView, PublicKeyView, RecipientKeyLookupView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("keys/", PublicKeyView.as_view(), name="my-key"),
    path("keys/lookup/", RecipientKeyLookupView.as_view(), name="recipient-key-lookup"),
]
