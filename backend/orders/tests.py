from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from types import SimpleNamespace
from unittest.mock import patch
from rest_framework.test import APIClient

from accounts.models import Profile
from catalog.models import Product
from orders.models import Order

PASSWORD = "S0me-Strong-Pass!"
ADDRESS = {
    "full_name": "Test Buyer",
    "phone": "9876543210",
    "address": "1 Test Street",
    "city": "Chennai",
    "postal_code": "600001",
    "payment_method": "cod",
}
User = get_user_model()


def signed_in_client(email, role="customer", company_name=""):
    client = APIClient()
    response = client.post(
        "/api/auth/register/",
        {"email": email, "full_name": "Tester", "password": PASSWORD,
         "role": role, "company_name": company_name},
        format="json",
    )
    assert response.status_code == 201, response.data
    token = client.post(
        "/api/auth/login/", {"username": email, "password": PASSWORD}, format="json"
    ).data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def management_client():
    user = User.objects.create_user(
        username="manager@example.com", email="manager@example.com",
        first_name="Manager", password=PASSWORD,
    )
    Profile.objects.create(user=user, role=Profile.Role.MANAGEMENT, company_name="SmartCart")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class SmartCartRoleAndOrderTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_products", verbosity=0)

    def create_product(self, seller, **overrides):
        product = Product.objects.first()
        data = {
            "name": "Marketplace Speaker",
            "description": "A test listing.",
            "category": product.category.slug,
            "brand": "Acme",
            "price": "1999.00",
            "original_price": "2499.00",
            "stock": 5,
        }
        data.update(overrides)
        response = seller.post("/api/seller/products/", data, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_public_registration_cannot_grant_management(self):
        response = APIClient().post(
            "/api/auth/register/",
            {"email": "bad-manager@example.com", "full_name": "Visitor",
             "password": PASSWORD, "role": "management"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email="bad-manager@example.com").exists())

    def test_role_apis_are_isolated(self):
        customer = signed_in_client("buyer@example.com")
        seller = signed_in_client("seller@example.com", "seller", "Acme Shop")
        management = management_client()

        self.assertEqual(customer.get("/api/seller/products/").status_code, 403)
        self.assertEqual(customer.get("/api/management/reports/").status_code, 403)
        self.assertEqual(seller.get("/api/orders/").status_code, 403)
        self.assertEqual(seller.get("/api/management/reports/").status_code, 403)
        self.assertEqual(management.get("/api/seller/products/").status_code, 403)
        self.assertEqual(management.get("/api/management/reports/").status_code, 200)

    def test_customer_books_and_tracks_order_while_seller_fulfils(self):
        seller = signed_in_client("seller@example.com", "seller", "Acme Shop")
        created = self.create_product(seller, image_url="")
        public = APIClient().get(f"/api/products/{created['slug']}/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["seller_name"], "Acme Shop")

        buyer = signed_in_client("buyer@example.com")
        order = buyer.post(
            "/api/orders/",
            {**ADDRESS, "items": [{"product_id": created["id"], "quantity": 2}]},
            format="json",
        )
        self.assertEqual(order.status_code, 201, order.data)
        self.assertEqual(order.data["payment_status"], Order.PaymentStatus.COD_DUE)
        self.assertEqual(order.data["items"][0]["product_name"], created["name"])

        lines = seller.get("/api/seller/orders/")
        self.assertEqual(len(lines.data), 1)
        shipped = seller.patch(
            f"/api/seller/orders/{lines.data[0]['id']}/", {"status": "shipped"}, format="json"
        )
        self.assertEqual(shipped.status_code, 200, shipped.data)
        details = buyer.get(f"/api/orders/{order.data['id']}/")
        self.assertEqual(details.data["status"], "shipped")

    def test_seller_can_delete_own_products_but_cannot_delete_another_sellers(self):
        seller_a = signed_in_client("seller-a@example.com", "seller", "Shop A")
        seller_b = signed_in_client("seller-b@example.com", "seller", "Shop B")
        listing = self.create_product(seller_b, name="Shop B listing")
        self.assertEqual(seller_a.delete(f"/api/seller/products/{listing['id']}/").status_code, 404)
        self.assertEqual(seller_b.delete(f"/api/seller/products/{listing['id']}/").status_code, 204)

    def test_unconfigured_online_checkout_is_not_recorded_as_success(self):
        buyer = signed_in_client("buyer@example.com")
        product = Product.objects.first()
        stock_before = product.stock
        with self.settings(STRIPE_SECRET_KEY=""):
            response = buyer.post(
                "/api/orders/",
                {**ADDRESS, "payment_method": "card", "items": [{"product_id": product.id, "quantity": 1}]},
                format="json",
            )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(Order.objects.count(), 0)
        product.refresh_from_db()
        self.assertEqual(product.stock, stock_before)

    @patch("orders.payments.stripe.checkout.Session.create")
    def test_card_and_upi_create_provider_checkout_sessions(self, create_session):
        buyer = signed_in_client("buyer@example.com")
        product = Product.objects.first()
        for method in ("card", "upi"):
            create_session.return_value = SimpleNamespace(
                id=f"cs_test_{method}", url=f"https://checkout.stripe.test/{method}"
            )
            with self.settings(STRIPE_SECRET_KEY="sk_test_not_a_real_key"):
                response = buyer.post(
                    "/api/orders/",
                    {**ADDRESS, "payment_method": method,
                     "items": [{"product_id": product.id, "quantity": 1}]},
                    format="json",
                    HTTP_ORIGIN="http://localhost:3000",
                )
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data["payment_status"], Order.PaymentStatus.PENDING)
            self.assertTrue(response.data["checkout_url"].startswith("https://checkout.stripe.test/"))
            self.assertEqual(create_session.call_args.kwargs["payment_method_types"], [method])
            create_session.reset_mock()

    def test_management_sees_daily_turnover_and_product_units(self):
        seller = signed_in_client("seller@example.com", "seller", "Acme Shop")
        listing = self.create_product(seller)
        buyer = signed_in_client("buyer@example.com")
        booking = buyer.post(
            "/api/orders/",
            {**ADDRESS, "items": [{"product_id": listing["id"], "quantity": 2}]},
            format="json",
        )
        self.assertEqual(booking.status_code, 201, booking.data)

        report = management_client().get("/api/management/reports/?days=7")
        self.assertEqual(report.status_code, 200, report.data)
        self.assertEqual(report.data["units_sold"], 2)
        self.assertEqual(report.data["orders"], 1)
        product_row = next(row for row in report.data["products"] if row["name"] == listing["name"])
        self.assertEqual(product_row["units"], 2)
        self.assertGreater(report.data["turnover"], 0)
        self.assertEqual(len(report.data["daily_turnover"]), 7)
