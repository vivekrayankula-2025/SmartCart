from getpass import getpass

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email

from accounts.models import Profile

User = get_user_model()


class Command(BaseCommand):
    help = "Create a company-management account; credentials are entered interactively."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Management account email address (otherwise prompted)")
        parser.add_argument("--name", help="Full name of the account owner (otherwise prompted)")
        parser.add_argument("--company", help="Company name shown in SmartCart (otherwise prompted)")

    def handle(self, *args, **options):
        email = (options["email"] or input("Management account email: ")).strip().lower()
        full_name = (options["name"] or input("Account owner full name: ")).strip()
        company_name = (options["company"] or input("Company name: ")).strip()
        if not email or not full_name or not company_name:
            raise CommandError("Email, full name, and company name are required.")
        try:
            validate_email(email)
        except Exception as exc:
            raise CommandError("Enter a valid email address.") from exc
        if User.objects.filter(username__iexact=email).exists():
            raise CommandError("That email already has an account. Assign its role through Django admin instead.")
        password = getpass("New management password: ")
        confirm = getpass("Confirm password: ")
        if not password or password != confirm:
            raise CommandError("Passwords were empty or did not match.")
        try:
            validate_password(password)
        except Exception as exc:
            raise CommandError("Password does not meet the configured password policy.") from exc
        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=full_name,
            password=password,
        )
        Profile.objects.create(
            user=user,
            role=Profile.Role.MANAGEMENT,
            company_name=company_name,
        )
        self.stdout.write(self.style.SUCCESS(f"Created management account for {email}."))
