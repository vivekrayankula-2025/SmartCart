from django.contrib import admin

from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "company_name", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "company_name")
    readonly_fields = ("created_at",)
