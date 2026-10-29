from rest_framework import serializers

from .models import Brand, Category, Product
from .utils import unique_slug


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "product_count")


class ProductSerializer(serializers.ModelSerializer):
    """Read-only representation used by the public storefront."""

    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    brand = serializers.CharField(source="brand.name", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    seller_name = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "category",
            "category_slug",
            "brand",
            "seller_name",
            "price",
            "original_price",
            "discount_percent",
            "rating",
            "review_count",
            "stock",
            "in_stock",
            "image_url",
            "is_featured",
        )


class SellerProductSerializer(serializers.ModelSerializer):
    """Create / edit serializer for the authenticated seller's own listings."""

    category = serializers.SlugRelatedField(slug_field="slug", queryset=Category.objects.all())
    brand = serializers.CharField(max_length=120)
    image_url = serializers.URLField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "category",
            "brand",
            "price",
            "original_price",
            "stock",
            "image_url",
            "is_active",
            "rating",
            "review_count",
        )
        read_only_fields = ("slug", "rating", "review_count")

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        original = attrs.get("original_price", getattr(self.instance, "original_price", None))
        if price is not None and original is not None and price > original:
            raise serializers.ValidationError(
                {"price": "Price can't be higher than the original price."}
            )
        return attrs

    @staticmethod
    def _get_brand(name: str) -> Brand:
        name = name.strip()
        brand = Brand.objects.filter(name__iexact=name).first()
        if brand is None:
            brand = Brand.objects.create(name=name, slug=unique_slug(Brand, name, 140))
        return brand

    def create(self, validated_data):
        validated_data["brand"] = self._get_brand(validated_data["brand"])
        validated_data["slug"] = unique_slug(Product, validated_data["name"], 220)
        validated_data["seller"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "brand" in validated_data:
            validated_data["brand"] = self._get_brand(validated_data["brand"])
        return super().update(instance, validated_data)
