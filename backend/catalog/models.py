from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Brand(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Product(TimeStampedModel):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="products")
    description = models.TextField(blank=True)

    price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )
    original_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        db_default=Decimal("0.0"),
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("5"))],
    )
    review_count = models.PositiveIntegerField(db_default=0)
    stock = models.PositiveIntegerField(db_default=0)
    image_url = models.URLField(max_length=500, blank=True)
    is_featured = models.BooleanField(db_default=False)
    is_active = models.BooleanField(db_default=True)
    # Company that sells this product. Empty = sold by SmartCart itself.
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="listed_products",
    )

    class Meta:
        ordering = ["-is_featured", "-rating", "name"]
        indexes = [
            models.Index(fields=["category", "-rating"], name="product_cat_rating_idx"),
            models.Index(fields=["is_featured", "-rating"], name="product_featured_idx"),
            models.Index(fields=["price"], name="product_price_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(price__lte=F("original_price")),
                name="product_price_lte_original_price",
            ),
            models.CheckConstraint(
                condition=Q(rating__gte=0) & Q(rating__lte=5),
                name="product_rating_between_0_and_5",
            ),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def discount_percent(self) -> int:
        if not self.original_price:
            return 0
        return round((1 - self.price / self.original_price) * 100)

    @property
    def in_stock(self) -> bool:
        return self.stock > 0

    @property
    def seller_name(self) -> str:
        if not self.seller_id:
            return "SmartCart"
        profile = getattr(self.seller, "profile", None)
        return (profile.company_name if profile else "") or "Marketplace seller"
