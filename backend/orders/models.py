from django.conf import settings
from django.db import models


class Order(models.Model):
    class PaymentMethod(models.TextChoices):
        COD = "cod", "Cash on delivery"
        CARD = "card", "Card"
        UPI = "upi", "UPI"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Payment pending"
        PAID = "paid", "Paid"
        COD_DUE = "cod_due", "Cash due on delivery"
        FAILED = "failed", "Payment failed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=300)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=12)
    payment_method = models.CharField(
        max_length=10, choices=PaymentMethod, default=PaymentMethod.COD
    )
    payment_status = models.CharField(
        max_length=12, choices=PaymentStatus, default=PaymentStatus.PENDING
    )
    stripe_checkout_session_id = models.CharField(
        max_length=255, blank=True, null=True, unique=True
    )
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"], name="order_user_created_idx")]

    def __str__(self) -> str:
        return self.reference

    @property
    def reference(self) -> str:
        return f"SC{self.pk:06d}"

    @property
    def status(self) -> str:
        """Shipping state derived from the order's line-item state."""
        statuses = {item.status for item in self.items.all()}
        if not statuses or statuses == {OrderItem.Status.CANCELLED}:
            return "cancelled" if statuses else "placed"
        active = statuses - {OrderItem.Status.CANCELLED}
        if active == {OrderItem.Status.DELIVERED}:
            return "delivered"
        if active & {OrderItem.Status.SHIPPED, OrderItem.Status.DELIVERED}:
            return "shipped"
        return "placed"


class OrderItem(models.Model):
    class Status(models.TextChoices):
        PLACED = "placed", "Placed"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "catalog.Product", null=True, on_delete=models.SET_NULL, related_name="order_items"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sold_items",
    )
    # Snapshots keep invoices and fulfillment legible if a listing is later edited.
    product_name = models.CharField(max_length=200)
    product_slug = models.SlugField(max_length=220, blank=True)
    category_slug = models.SlugField(max_length=140, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status, default=Status.PLACED)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=1), name="orderitem_qty_gte_1"),
        ]

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product_name}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class StripeWebhookEvent(models.Model):
    """Minimal event receipt for safe Stripe webhook de-duplication; raw payloads are not stored."""

    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=120)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-processed_at"]

    def __str__(self) -> str:
        return f"{self.event_type} ({self.event_id})"
