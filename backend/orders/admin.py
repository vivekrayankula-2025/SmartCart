from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    raw_id_fields = ("product", "seller")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "total", "payment_method", "created_at")
    list_filter = ("payment_method",)
    search_fields = ("user__email", "full_name")
    inlines = [OrderItemInline]
