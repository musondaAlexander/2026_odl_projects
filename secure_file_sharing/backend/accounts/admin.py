from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import PublicKey, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "is_staff", "is_active", "date_joined")
    search_fields = ("username", "email")
    ordering = ("username",)


@admin.register(PublicKey)
class PublicKeyAdmin(admin.ModelAdmin):
    list_display = ("user", "algorithm", "fingerprint", "is_active", "created_at")
    list_filter = ("algorithm", "is_active")
    search_fields = ("user__username", "user__email", "fingerprint")
    readonly_fields = ("fingerprint", "created_at")
