from django.contrib import admin

from .models import Brand, Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "brand", "seller", "price", "stock", "rating", "is_featured", "is_active")
    list_filter = ("category", "brand", "is_featured", "is_active")
    list_editable = ("stock", "is_featured", "is_active")
    search_fields = ("name", "brand__name", "category__name")
    prepopulated_fields = {"slug": ("name",)}
    list_select_related = ("category", "brand", "seller")
