
from django.contrib import admin
from django.urls import include, path

from orders.webhooks import stripe_webhook


urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # Stripe webhook
    path("api/stripe/webhook", stripe_webhook, name="stripe-webhook"),

    # JSON-based products and categories
    path("api/", include("catalog.urls")),

    # Existing orders API
    path("api/", include("orders.urls")),

    # Existing authentication API
    path("api/auth/", include("accounts.urls")),
]
