from urllib.parse import urlsplit

import stripe
from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError

from .models import Order


class PaymentProviderUnavailable(APIException):
    status_code = 503
    default_code = "payment_provider_unavailable"
    default_detail = "The payment provider is temporarily unavailable."


def _checkout_origin_allowed(origin: str) -> bool:
    parsed = urlsplit(origin)
    if parsed.scheme == "https" and parsed.hostname and parsed.hostname.endswith(".manus.computer"):
        return True
    return origin.rstrip("/") in {
        item.rstrip("/") for item in settings.FRONTEND_ORIGIN_ALLOWLIST
    }


def create_checkout_session(order: Order, browser_origin: str) -> str:
    """Create hosted Stripe Checkout without handling or storing card credentials."""
    if not settings.STRIPE_SECRET_KEY:
        raise PaymentProviderUnavailable(
            "Online checkout is not configured yet. Add the Stripe secret key; cash on delivery is available meanwhile."
        )
    if not browser_origin or not _checkout_origin_allowed(browser_origin):
        raise ValidationError({"payment_method": "The checkout return address is not allowed."})

    stripe.api_key = settings.STRIPE_SECRET_KEY
    metadata = {
        "order_id": str(order.id),
        "user_id": str(order.user_id),
        "customer_email": order.user.email or "",
        "customer_name": order.full_name,
    }
    line_items = [
        {
            "quantity": item.quantity,
            "price_data": {
                "currency": "inr",
                "unit_amount": int(item.unit_price * 100),
                "product_data": {"name": item.product_name},
            },
        }
        for item in order.items.all()
    ]
    if order.shipping_fee > 0:
        line_items.append(
            {
                "quantity": 1,
                "price_data": {
                    "currency": "inr",
                    "unit_amount": int(order.shipping_fee * 100),
                    "product_data": {"name": "Delivery"},
                },
            }
        )

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            currency="inr",
            payment_method_types=[order.payment_method],
            line_items=line_items,
            customer_email=order.user.email or None,
            client_reference_id=str(order.user_id),
            metadata=metadata,
            payment_intent_data={"metadata": metadata},
            allow_promotion_codes=True,
            success_url=f"{browser_origin.rstrip('/')}/orders/{order.id}?payment=success",
            cancel_url=f"{browser_origin.rstrip('/')}/orders/{order.id}?payment=cancelled",
        )
    except stripe.StripeError as exc:
        raise PaymentProviderUnavailable(
            "The payment provider could not start checkout. Please try again or choose cash on delivery."
        ) from exc

    order.stripe_checkout_session_id = session.id
    order.save(update_fields=["stripe_checkout_session_id", "updated_at"])
    return session.url
