from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from catalog.models import Product

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_name",
            "product_slug",
            "category_slug",
            "image_url",
            "unit_price",
            "quantity",
            "line_total",
            "status",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    reference = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "reference",
            "status",
            "full_name",
            "phone",
            "address",
            "city",
            "postal_code",
            "payment_method",
            "payment_status",
            "subtotal",
            "shipping_fee",
            "total",
            "created_at",
            "items",
        )


class OrderLineInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=20)


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField(max_length=300)
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=12)
    payment_method = serializers.ChoiceField(
        choices=Order.PaymentMethod.choices, default=Order.PaymentMethod.COD
    )
    items = OrderLineInputSerializer(many=True, allow_empty=False)


# ---- Company side ---------------------------------------------------------------

ALLOWED_TRANSITIONS = {
    OrderItem.Status.PLACED: {OrderItem.Status.SHIPPED, OrderItem.Status.CANCELLED},
    OrderItem.Status.SHIPPED: {OrderItem.Status.DELIVERED, OrderItem.Status.CANCELLED},
    OrderItem.Status.DELIVERED: set(),
    OrderItem.Status.CANCELLED: set(),
}


class SellerOrderItemSerializer(serializers.ModelSerializer):
    """One line of an order assigned to this seller for fulfilment."""

    order_id = serializers.IntegerField(source="order.id", read_only=True)
    reference = serializers.CharField(source="order.reference", read_only=True)
    created_at = serializers.DateTimeField(source="order.created_at", read_only=True)
    customer_name = serializers.CharField(source="order.full_name", read_only=True)
    phone = serializers.CharField(source="order.phone", read_only=True)
    address = serializers.CharField(source="order.address", read_only=True)
    city = serializers.CharField(source="order.city", read_only=True)
    postal_code = serializers.CharField(source="order.postal_code", read_only=True)
    payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    payment_status = serializers.CharField(source="order.payment_status", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "order_id",
            "reference",
            "created_at",
            "customer_name",
            "phone",
            "address",
            "city",
            "postal_code",
            "payment_method",
            "payment_status",
            "product_name",
            "category_slug",
            "image_url",
            "unit_price",
            "quantity",
            "line_total",
            "status",
        )
        read_only_fields = tuple(f for f in fields if f != "status")

    def validate_status(self, value):
        current = self.instance.status
        if value != current and value not in ALLOWED_TRANSITIONS[current]:
            raise serializers.ValidationError(f"Can't change an item from {current} to {value}.")
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        new_status = validated_data.get("status", instance.status)
        if (
            new_status == OrderItem.Status.CANCELLED
            and instance.status != OrderItem.Status.CANCELLED
            and instance.product_id
        ):
            # Put the units back on the shelf.
            Product.objects.filter(pk=instance.product_id).update(
                stock=F("stock") + instance.quantity
            )
        return super().update(instance, validated_data)
