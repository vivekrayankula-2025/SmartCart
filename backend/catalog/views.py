from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils.html import escape
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsSeller

from .filters import ProductFilter
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer, SellerProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/products/            list with search, filters, ordering, pagination
    GET /api/products/featured/   top 12 featured products
    GET /api/products/<slug>/     product detail

    Query params: search, category, brand, min_price, max_price, in_stock,
                  is_featured, ordering (price, -price, rating, -rating, -created_at), page
    """

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ["name", "brand__name", "category__name", "description"]
    ordering_fields = ["price", "rating", "review_count", "created_at"]

    def get_queryset(self):
        return Product.objects.filter(is_active=True).select_related(
            "category", "brand", "seller__profile"
        )

    @action(detail=False, pagination_class=None)
    def featured(self, request):
        queryset = self.get_queryset().filter(is_featured=True).order_by("-rating")[:12]
        return Response(self.get_serializer(queryset, many=True).data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/categories/ — every category with its (active) product count."""

    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        return Category.objects.annotate(
            product_count=Count("products", filter=Q(products__is_active=True))
        )


class SellerProductViewSet(viewsets.ModelViewSet):
    """
    /api/seller/products/ — a seller manages only their own listings.
    Deleting a product that already has orders just hides it.
    """

    serializer_class = SellerProductSerializer
    permission_classes = [IsSeller]
    pagination_class = None
    filter_backends = []

    def get_queryset(self):
        return (
            Product.objects.filter(seller=self.request.user)
            .select_related("category", "brand")
            .order_by("-created_at")
        )

    def perform_destroy(self, instance):
        if instance.order_items.exists():
            instance.is_active = False
            instance.save(update_fields=["is_active", "updated_at"])
        else:
            instance.delete()


def placeholder_image(request, label):
    """GET /api/placeholder/<label>.svg -> generated SVG product image (no internet needed)."""
    text = escape(label.replace("-", " ").replace("_", " "))[:30]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#5b4bff"/><stop offset="1" stop-color="#151b2d"/></linearGradient></defs>
<rect width="800" height="800" fill="url(#g)"/>
<g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
<path d="M250 300h300l-30 220H280z"/><path d="M320 300v-30a80 80 0 0 1 160 0v30"/></g>
<text x="400" y="640" font-family="Arial,sans-serif" font-size="42" font-weight="700"
fill="#fff" text-anchor="middle">{text}</text></svg>"""
    response = HttpResponse(svg, content_type="image/svg+xml")
    response["Cache-Control"] = "public, max-age=86400"
    return response
