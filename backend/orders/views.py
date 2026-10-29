from datetime import timedelta
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer, IsManagement, IsSeller
from catalog.models import Product
from .models import Order, OrderItem
from .payments import PaymentProviderUnavailable, create_checkout_session
from .serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    SellerOrderItemSerializer,
)
from .services import create_order


MONEY_FIELD = DecimalField(max_digits=18, decimal_places=2)
PAID_ORDER_STATES = (Order.PaymentStatus.PAID, Order.PaymentStatus.COD_DUE)


def _line_revenue():
    return ExpressionWrapper(F("unit_price") * F("quantity"), output_field=MONEY_FIELD)


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Customer-only booking, order history, invoice data, and pending-order cancellation."""

    permission_classes = [IsCustomer]
    pagination_class = None

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")

    def get_serializer_class(self):
        return OrderCreateSerializer if self.action == "create" else OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkout_url = None
        payment_method = serializer.validated_data["payment_method"]

        if payment_method == Order.PaymentMethod.COD:
            order = create_order(request.user, serializer.validated_data)
        else:
            # Keep the order and stock reservation atomic with remote session creation:
            # if Stripe rejects the request, no half-created booking is left behind.
            with transaction.atomic():
                order = create_order(request.user, serializer.validated_data)
                checkout_url = create_checkout_session(
                    order,
                    request.headers.get("Origin", ""),
                )

        order = self.get_queryset().get(pk=order.pk)
        response_data = OrderSerializer(order).data
        if checkout_url:
            response_data["checkout_url"] = checkout_url
        return Response(response_data, status=201)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        with transaction.atomic():
            order = Order.objects.select_for_update().filter(
                pk=pk, user=request.user
            ).first()
            if not order:
                raise ValidationError("Order not found.")
            if order.payment_status not in (
                Order.PaymentStatus.PENDING,
                Order.PaymentStatus.FAILED,
            ):
                raise ValidationError("Only an unpaid online order can be cancelled here.")

            if order.stripe_checkout_session_id:
                if not settings.STRIPE_SECRET_KEY:
                    raise PaymentProviderUnavailable("Payment-provider credentials are not configured; the unpaid reservation was not cancelled.")
                stripe.api_key = settings.STRIPE_SECRET_KEY
                try:
                    stripe.checkout.Session.expire(order.stripe_checkout_session_id)
                except stripe.StripeError:
                    try:
                        current_session = stripe.checkout.Session.retrieve(
                            order.stripe_checkout_session_id
                        )
                    except stripe.StripeError as exc:
                        raise PaymentProviderUnavailable(
                            "The provider could not verify this checkout. Refresh later; reserved stock has not been released."
                        ) from exc
                    if current_session.status != "expired" or current_session.payment_status == "paid":
                        raise ValidationError(
                            "This checkout may still be active or already paid. Refresh the order before cancelling."
                        )

            items = list(OrderItem.objects.select_for_update().filter(order=order))
            if any(item.status in (OrderItem.Status.SHIPPED, OrderItem.Status.DELIVERED) for item in items):
                raise ValidationError("An order already in transit cannot be cancelled here.")
            for item in items:
                if item.status != OrderItem.Status.CANCELLED and item.product_id:
                    Product.objects.filter(pk=item.product_id).update(
                        stock=F("stock") + item.quantity
                    )
                    item.status = OrderItem.Status.CANCELLED
                    item.save(update_fields=["status"])
            order.payment_status = Order.PaymentStatus.CANCELLED
            order.save(update_fields=["payment_status", "updated_at"])

        return Response(OrderSerializer(self.get_queryset().get(pk=order.pk)).data)


class SellerOrderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Fulfilment updates scoped to order lines sold by the signed-in seller."""

    serializer_class = SellerOrderItemSerializer
    permission_classes = [IsSeller]
    pagination_class = None
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return (
            OrderItem.objects.filter(
                seller=self.request.user,
                order__payment_status__in=PAID_ORDER_STATES,
            )
            .select_related("order")
            .order_by("-order__created_at", "id")
        )


class SellerStatsView(APIView):
    """Headline inventory and sales figures for one seller's own listings."""

    permission_classes = [IsSeller]

    def get(self, request):
        products = Product.objects.filter(seller=request.user)
        lines = OrderItem.objects.filter(
            seller=request.user,
            order__payment_status__in=PAID_ORDER_STATES,
        ).exclude(status=OrderItem.Status.CANCELLED)
        revenue = lines.aggregate(total=Sum(_line_revenue()))["total"] or Decimal("0")
        return Response(
            {
                "products": products.count(),
                "active_products": products.filter(is_active=True).count(),
                "low_stock": products.filter(is_active=True, stock__lt=10).count(),
                "orders": lines.values("order").distinct().count(),
                "pending": lines.filter(status=OrderItem.Status.PLACED).count(),
                "units_sold": lines.aggregate(units=Sum("quantity"))["units"] or 0,
                "revenue": float(revenue),
            }
        )


class ManagementReportsView(APIView):
    """Company-wide units and revenue by product plus daily turnover for a chosen period."""

    permission_classes = [IsManagement]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            raise ValidationError({"days": "Choose 7, 30, or 90 days."})
        if days not in (7, 30, 90):
            raise ValidationError({"days": "Choose 7, 30, or 90 days."})

        end_day = timezone.localdate()
        start_day = end_day - timedelta(days=days - 1)
        settled_lines = OrderItem.objects.filter(
            order__payment_status__in=PAID_ORDER_STATES,
            order__created_at__date__range=(start_day, end_day),
        ).exclude(status=OrderItem.Status.CANCELLED)

        daily_rows = (
            settled_lines.annotate(
                day=TruncDate("order__created_at", tzinfo=timezone.get_current_timezone()),
                gross=_line_revenue(),
            )
            .values("day")
            .annotate(
                turnover=Sum("gross"),
                units=Sum("quantity"),
                orders=Count("order_id", distinct=True),
            )
            .order_by("day")
        )
        by_day = {row["day"]: row for row in daily_rows}
        daily_turnover = []
        for offset in range(days):
            day = start_day + timedelta(days=offset)
            row = by_day.get(day, {})
            daily_turnover.append(
                {
                    "date": day.isoformat(),
                    "turnover": float(row.get("turnover") or 0),
                    "units": row.get("units") or 0,
                    "orders": row.get("orders") or 0,
                }
            )

        product_rows = (
            settled_lines.annotate(gross=_line_revenue())
            .values("product_name", "category_slug")
            .annotate(units=Sum("quantity"), revenue=Sum("gross"))
            .order_by("-revenue", "product_name")
        )
        total_revenue = sum(
            (Decimal(str(row["turnover"])) for row in daily_turnover), Decimal("0")
        )
        total_units = sum(row["units"] for row in daily_turnover)
        total_orders = (
            Order.objects.filter(
                payment_status__in=PAID_ORDER_STATES,
                created_at__date__range=(start_day, end_day),
            )
            .exclude(items__status=OrderItem.Status.CANCELLED)
            .values("id")
            .distinct()
            .count()
        )

        return Response(
            {
                "days": days,
                "start_date": start_day.isoformat(),
                "end_date": end_day.isoformat(),
                "turnover": float(total_revenue),
                "units_sold": total_units,
                "orders": total_orders,
                "products": [
                    {
                        "name": row["product_name"],
                        "category_slug": row["category_slug"],
                        "units": row["units"] or 0,
                        "revenue": float(row["revenue"] or 0),
                    }
                    for row in product_rows
                ],
                "daily_turnover": daily_turnover,
            }
        )
