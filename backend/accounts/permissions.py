from rest_framework.permissions import BasePermission

from .models import Profile
from .roles import get_role


class RolePermission(BasePermission):
    role = None
    message = "Your account does not have access to this area."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and get_role(request.user) == self.role
        )


class IsCustomer(RolePermission):
    role = Profile.Role.CUSTOMER
    message = "Only customer accounts can place or view customer orders."


class IsSeller(RolePermission):
    role = Profile.Role.SELLER
    message = "Only seller accounts can manage seller products and fulfilment."


class IsManagement(RolePermission):
    role = Profile.Role.MANAGEMENT
    message = "Only company-management accounts can view company-wide reports."


# Compatibility name for callers from the original SmartCart source.
IsCompany = IsSeller
