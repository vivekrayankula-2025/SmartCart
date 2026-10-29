from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from catalog.models import Product

from .models import Order, OrderItem

FREE_SHIPPING_THRESHOLD = Decimal("4999")
SHIPPING_FEE = Decimal("99")


@transaction.atomic
def create_order(user, data: dict) -> Order:
    """
    Build an order from the cart. Prices and stock are read from the database —
    never trusted from the client — and stock is reduced in the same transaction.
    """
    quantities: dict[int, int] = {}
    for line in data["items"]:
        quantities[line["product_id"]] = quantities.get(line["product_id"], 0) + line["quantity"]

    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=quantities, is_active=True)
        .order_by("id")
    }

    for product_id, quantity in quantities.items():
        product = products.get(product_id)
        if product is None:
            raise serializers.ValidationError(
                {"items": "A product in your cart is no longer available."}
            )
        if quantity > product.stock:
            raise serializers.ValidationError(
                {"items": f"Only {product.stock} of “{product.name}” left in stock."}
            )

    subtotal = sum((products[pid].price * qty for pid, qty in quantities.items()), Decimal("0"))
    shipping = Decimal("0") if subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE

    order = Order.objects.create(
        user=user,
        full_name=data["full_name"],
        phone=data["phone"],
        address=data["address"],
        city=data["city"],
        postal_code=data["postal_code"],
        payment_method=data["payment_method"],
        payment_status=(
            Order.PaymentStatus.COD_DUE
            if data["payment_method"] == Order.PaymentMethod.COD
            else Order.PaymentStatus.PENDING
        ),
        subtotal=subtotal,
        shipping_fee=shipping,
        total=subtotal + shipping,
    )

    OrderItem.objects.bulk_create(
        OrderItem(
            order=order,
            product=products[pid],
            seller_id=products[pid].seller_id,
            product_name=products[pid].name,
            product_slug=products[pid].slug,
            category_slug=products[pid].category.slug,
            image_url=products[pid].image_url,
            unit_price=products[pid].price,
            quantity=qty,
        )
        for pid, qty in quantities.items()
    )

    for pid, qty in quantities.items():
        Product.objects.filter(pk=pid).update(stock=F("stock") - qty)

    return order
