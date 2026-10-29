from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import Profile
from .roles import get_role

User = get_user_model()
PUBLIC_ROLES = (Profile.Role.CUSTOMER, Profile.Role.SELLER)


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(write_only=True, max_length=150)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(
        choices=[(role, Profile.Role(role).label) for role in PUBLIC_ROLES],
        default=Profile.Role.CUSTOMER,
    )
    company_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "password", "role", "company_name")

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["role"] == Profile.Role.SELLER and not attrs.get("company_name", "").strip():
            raise serializers.ValidationError({"company_name": "Store or seller name is required."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=validated_data["full_name"],
        )
        Profile.objects.create(
            user=user,
            role=validated_data["role"],
            company_name=validated_data.get("company_name", "").strip(),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="first_name", read_only=True)
    role = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role", "company_name")

    def get_role(self, user):
        return get_role(user)

    def get_company_name(self, user):
        profile = getattr(user, "profile", None)
        return profile.company_name if profile else ""
