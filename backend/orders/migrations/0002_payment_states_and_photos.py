from django.db import migrations, models
from django.db.models import Q


def migrate_legacy_orders_and_images(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Product = apps.get_model("catalog", "Product")

    Order.objects.filter(payment_method="online").update(payment_method="card")
    Order.objects.filter(payment_method="cod").update(payment_status="cod_due")

    placeholder_products = Product.objects.select_related("category").filter(
        Q(image_url__icontains="placehold.co")
        | Q(image_url__icontains="/api/placeholder/")
    )
    for product in placeholder_products:
        product.image_url = f"/images/{product.category.slug}.webp"
        product.save(update_fields=["image_url"])


def reverse_legacy_orders_and_images(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(payment_method="card", payment_status="pending").update(
        payment_method="online"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_role_management"),
        ("catalog", "0001_initial"),
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("cod", "Cash on delivery"),
                    ("card", "Card"),
                    ("upi", "UPI"),
                ],
                default="cod",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("pending", "Payment pending"),
                    ("paid", "Paid"),
                    ("cod_due", "Cash due on delivery"),
                    ("failed", "Payment failed"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="stripe_checkout_session_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="order",
            name="stripe_payment_intent_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="category_slug",
            field=models.SlugField(blank=True, max_length=140),
        ),
        migrations.CreateModel(
            name="StripeWebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.CharField(max_length=255, unique=True)),
                ("event_type", models.CharField(max_length=120)),
                ("processed_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-processed_at"]},
        ),
        migrations.RunPython(migrate_legacy_orders_and_images, reverse_legacy_orders_and_images),
    ]
