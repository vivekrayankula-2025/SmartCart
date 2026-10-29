from .models import Profile


def get_role(user) -> str:
    """Role of a user. Users created before profiles existed count as customers."""
    profile = getattr(user, "profile", None)
    return profile.role if profile else Profile.Role.CUSTOMER
