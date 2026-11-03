
import json
from pathlib import Path
from decimal import Decimal, InvalidOperation

from django.utils.text import slugify
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


# Read predefined products from products.json
PRODUCTS_FILE = Path(__file__).resolve().parent / "products.json"


def get_products():
    try:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as file:
            products = json.load(file)

        for index, product in enumerate(products, start=1):
            product["id"] = index
            product["slug"] = slugify(product["name"])
            product["in_stock"] = int(product.get("stock", 0)) > 0

            price = Decimal(str(product.get("price", 0)))
            original_price = Decimal(str(product.get("original_price", 0)))

            if original_price > 0:
                product["discount_percent"] = round(
                    (1 - price / original_price) * 100
                )
            else:
                product["discount_percent"] = 0

            product["seller_name"] = "SmartCart"

        return products

    except (FileNotFoundError, json.JSONDecodeError):
        return []


class ProductViewSet(viewsets.ViewSet):
    """
    GET /api/products/
    GET /api/products/featured/
    GET /api/products/<slug>/

    Supports:
    search, category, brand, min_price, max_price,
    in_stock, is_featured, ordering
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def list(self, request):
        products = get_products()

        search = request.query_params.get("search", "").lower()
        category = request.query_params.get("category", "").lower()
        brand = request.query_params.get("brand", "").lower()
        min_price = request.query_params.get("min_price")
        max_price = request.query_params.get("max_price")
        in_stock = request.query_params.get("in_stock")
        is_featured = request.query_params.get("is_featured")
        ordering = request.query_params.get("ordering", "")

        if search:
            products = [
                p for p in products
                if search in p.get("name", "").lower()
                or search in p.get("brand", "").lower()
                or search in p.get("category", "").lower()
                or search in p.get("description", "").lower()
            ]

        if category:
            products = [
                p for p in products
                if p.get("category", "").lower() == category
            ]

        if brand:
            products = [
                p for p in products
                if p.get("brand", "").lower() == brand
            ]

        try:
            if min_price:
                products = [
                    p for p in products
                    if Decimal(str(p.get("price", 0))) >= Decimal(min_price)
                ]

            if max_price:
                products = [
                    p for p in products
                    if Decimal(str(p.get("price", 0))) <= Decimal(max_price)
                ]
        except InvalidOperation:
            return Response({"error": "Invalid price filter."}, status=400)

        if in_stock is not None:
            wanted = in_stock.lower() == "true"
            products = [p for p in products if p["in_stock"] == wanted]

        if is_featured is not None:
            wanted = is_featured.lower() == "true"
            products = [
                p for p in products
                if p.get("is_featured", False) == wanted
            ]

        if ordering:
            reverse = ordering.startswith("-")
            field = ordering.lstrip("-")

            allowed_fields = {
                "price", "rating", "review_count", "name"
            }

            if field in allowed_fields:
                products.sort(
                    key=lambda p: (
                        str(p.get(field, ""))
                        if field == "name"
                        else float(p.get(field, 0))
                    ),
                    reverse=reverse
                )

        # Simple pagination
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except ValueError:
            page = 1

        page_size = 12
        total = len(products)
        start = (page - 1) * page_size
        end = start + page_size

        return Response({
            "count": total,
            "page": page,
            "total_pages": (total + page_size - 1) // page_size,
            "results": products[start:end]
        })

    def retrieve(self, request, slug=None):
        products = get_products()

        for product in products:
            if product["slug"] == slug:
                return Response(product)

        return Response(
            {"error": "Product not found."},
            status=404
        )

    @action(detail=False, methods=["get"])
def featured(self, request):
    products = [
        p for p in get_products()
        if p.get("is_featured", False)
    ]

    products.sort(
        key=lambda p: float(p.get("rating", 0)),
        reverse=True
    )

    return Response(products[:12])


class CategoryViewSet(viewsets.ViewSet):
    """
    GET /api/categories/
    GET /api/categories/<slug>/
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def list(self, request):
        products = get_products()
        categories = {}

        for product in products:
            name = product.get("category", "Other")
            categories[name] = categories.get(name, 0) + 1

        result = [
            {
                "id": index,
                "name": name,
                "slug": slugify(name),
                "product_count": count
            }
            for index, (name, count) in enumerate(
                sorted(categories.items()), start=1
            )
        ]

        return Response(result)

    def retrieve(self, request, slug=None):
        products = get_products()

        for product in products:
            if slugify(product.get("category", "")) == slug:
                category_products = [
                    p for p in products
                    if p.get("category") == product.get("category")
                ]

                return Response({
                    "name": product["category"],
                    "slug": slug,
                    "product_count": len(category_products),
                    "products": category_products
                })

        return Response(
            {"error": "Category not found."},
            status=404
        )
