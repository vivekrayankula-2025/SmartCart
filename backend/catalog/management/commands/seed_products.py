import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from catalog.models import Brand, Category, Product

DATA_FILE = Path(__file__).resolve().parents[2] / "products-with-images.json"


class Command(BaseCommand):
    help = "Load the 120 SmartCart products (safe to run more than once)."

    @transaction.atomic
    def handle(self, *args, **options):
        items = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        categories: dict[str, Category] = {}
        brands: dict[str, Brand] = {}
        created = 0

        for item in items:
            if item["category"] not in categories:
                categories[item["category"]], _ = Category.objects.get_or_create(
                    slug=slugify(item["category"]), defaults={"name": item["category"]}
                )
            if item["brand"] not in brands:
                brands[item["brand"]], _ = Brand.objects.get_or_create(
                    slug=slugify(item["brand"]), defaults={"name": item["brand"]}
                )

            _, was_created = Product.objects.update_or_create(
                slug=slugify(item["name"]),
                defaults={
                    "name": item["name"],
                    "category": categories[item["category"]],
                    "brand": brands[item["brand"]],
                    "description": item["description"],
                    "price": Decimal(item["price"]),
                    "original_price": Decimal(item["original_price"]),
                    "rating": Decimal(item["rating"]),
                    "review_count": item["review_count"],
                    "stock": item["stock"],
                    "image_url": item.get("image_url", ""),
                    "is_featured": item["is_featured"],
                },
            )
            created += was_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(items)} products ({created} new, {len(items) - created} updated)."
            )
        )
