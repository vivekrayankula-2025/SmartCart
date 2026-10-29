from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Product


class CatalogApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_products", verbosity=0)

    def setUp(self):
        self.client = APIClient()

    def test_seed_creates_120_products_and_is_idempotent(self):
        self.assertEqual(Product.objects.count(), 120)
        call_command("seed_products", verbosity=0)
        self.assertEqual(Product.objects.count(), 120)

    def test_list_is_paginated_and_filterable(self):
        res = self.client.get("/api/products/", {"category": "audio"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 15)

    def test_search_and_price_filter(self):
        res = self.client.get("/api/products/", {"search": "NovaPods", "max_price": 20000})
        self.assertEqual(res.status_code, 200)
        for product in res.data["results"]:
            self.assertLessEqual(Decimal(str(product["price"])), Decimal("20000"))

    def test_featured_and_detail(self):
        featured = self.client.get("/api/products/featured/")
        self.assertEqual(featured.status_code, 200)
        self.assertLessEqual(len(featured.data), 12)
        detail = self.client.get(f"/api/products/{featured.data[0]['slug']}/")
        self.assertEqual(detail.status_code, 200)

    def test_categories(self):
        res = self.client.get("/api/categories/")
        self.assertEqual(len(res.data), 8)
