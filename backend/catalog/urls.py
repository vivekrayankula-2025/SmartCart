from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet, SellerProductViewSet, placeholder_image

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")
router.register("seller/products", SellerProductViewSet, basename="seller-product")

urlpatterns = [
    path("placeholder/<str:label>.svg", placeholder_image),
] + router.urls
