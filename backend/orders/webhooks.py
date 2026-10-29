import json

import stripe
from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Order, StripeWebhookEvent


@csrf_exempt
def stripe_webhook(request):
    """Verify Stripe signatures against the exact request bytes and process once."""
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    if not settings.STRIPE_WEBHOOK_SECRET:
        return JsonResponse({"detail": "Webhook is not configured."}, status=503)

    raw_body = request.body
    signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(
            payload=raw_body,
            sig_header=signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError):
        return JsonResponse({"detail": "Invalid webhook signature or payload."}, status=400)

    event_id = event.get("id")
    event_type = event.get("type", "")
    if not event_id:
        return JsonResponse({"detail": "Missing event id."}, status=400)

    try:
        with transaction.atomic():
            _, created = StripeWebhookEvent.objects.get_or_create(
                event_id=event_id,
                defaults={"event_type": event_type},
            )
            if not created:
                return JsonResponse({"received": True, "duplicate": True})

            obj = event.get("data", {}).get("object", {})
            metadata = obj.get("metadata") or {}
            order_id = metadata.get("order_id")
            if event_type == "checkout.session.completed" and obj.get("payment_status") == "paid":
                order = Order.objects.select_for_update().filter(
                    pk=order_id,
                    stripe_checkout_session_id=obj.get("id"),
                ).first()
                if order:
                    _mark_paid(order, obj.get("payment_intent"))
            elif event_type == "payment_intent.succeeded":
                order = Order.objects.select_for_update().filter(pk=order_id).first()
                if order:
                    _mark_paid(order, obj.get("id"))
    except IntegrityError:
        # Concurrent Stripe retries can race on the unique event id. The winning delivery
        # has already persisted the event; acknowledge the retry without reapplying it.
        if StripeWebhookEvent.objects.filter(event_id=event_id).exists():
            return JsonResponse({"received": True, "duplicate": True})
        raise

    return JsonResponse({"received": True})


def _mark_paid(order, payment_intent_id):
    if order.payment_status in (Order.PaymentStatus.CANCELLED, Order.PaymentStatus.FAILED):
        return
    order.payment_status = Order.PaymentStatus.PAID
    if payment_intent_id:
        order.stripe_payment_intent_id = payment_intent_id
    order.save(update_fields=["payment_status", "stripe_payment_intent_id", "updated_at"])
