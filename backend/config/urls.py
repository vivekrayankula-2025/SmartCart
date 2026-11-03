
from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, HttpResponse, JsonResponse
from django.urls import include, path, re_path

from orders.webhooks import stripe_webhook


# Frontend fallback
def frontend_app(request, path=""):
    index_path = settings.BASE_DIR / "frontend_dist" / "index.html"

    if not index_path.exists():
        return HttpResponse(
            "SmartCart frontend is deployed separately on Vercel.",
            status=503,
            content_type="text/plain; charset=utf-8",
        )

    return FileResponse(
        index_path.open("rb"),
        content_type="text/html; charset=utf-8",
    )


# Frontend route manifest
def route_manifest(request):
    manifest_path = settings.BASE_DIR / "frontend_dist" / "manus-routes.json"

    if not manifest_path.exists():
        return JsonResponse({"routes": []}, status=404)

    return FileResponse(
        manifest_path.open("rb"),
        content_type="application/json",
    )


urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # Stripe webhook
    path("api/stripe/webhook", stripe_webhook, name="stripe-webhook"),

    # Products and categories (JSON-based)
    path("api/", include("catalog.urls")),

    # Existing orders API
    path("api/", include("orders.urls")),

    # Existing authentication API
    path("api/auth/", include("accounts.urls")),

    # Frontend manifest
    path("manus-routes.json", route_manifest, name="manus-routes"),

    # Frontend fallback
    re_path(
        r"^(?!api/|admin/|static/).*$",
        frontend_app,
        name="frontend-app",
    ),
]
