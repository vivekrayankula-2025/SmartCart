from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    ManagementReportsView,
    OrderViewSet,
    SellerOrderViewSet,
    SellerStatsView,
)

router = SimpleRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("seller/orders", SellerOrderViewSet, basename="seller-order")

urlpatterns = [
    path("seller/stats/", SellerStatsView.as_view(), name="seller-stats"),
    path("management/reports/", ManagementReportsView.as_view(), name="management-reports"),
    *router.urls,
]
