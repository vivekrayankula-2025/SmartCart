```python
"""SmartCart Django settings for local SQLite and Vercel deployments."""

import os
import secrets
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(int(default))).lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def env_list(name: str, default: str = "") -> list[str]:
    return [
        item.strip()
        for item in os.getenv(name, default).split(",")
        if item.strip()
    ]


# =========================================================
# BASIC SETTINGS
# =========================================================

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or secrets.token_urlsafe(48)

DEBUG = env_bool("DJANGO_DEBUG", False)


# =========================================================
# ALLOWED HOSTS
# =========================================================

# Read hosts from environment first.
ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1,0.0.0.0,.vercel.app,.onrender.com",
)

# Vercel automatically provides VERCEL_URL for deployments.
# Add it dynamically if available.
vercel_url = os.getenv("VERCEL_URL", "").strip()

if vercel_url:
    # VERCEL_URL normally does not contain https://
    vercel_url = vercel_url.replace("https://", "").replace("http://", "")
    if vercel_url not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(vercel_url)


# =========================================================
# INSTALLED APPS
# =========================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "django_filters",
    "corsheaders",

    "catalog",
    "accounts",
    "orders",
]


# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =========================================================
# URL / WSGI / ASGI
# =========================================================

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

ASGI_APPLICATION = "config.asgi.application"


# =========================================================
# TEMPLATES
# =========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "frontend_dist"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# =========================================================
# DATABASE
# =========================================================

# Production:
#   Set DATABASE_URL in Vercel to use a hosted database.
#
# Local:
#   If DATABASE_URL is not present and DB_ENGINE=sqlite,
#   Django uses db.sqlite3.

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
        )
    }

    # MySQL support
    if DATABASES["default"]["ENGINE"].endswith("mysql"):
        import pymysql

        pymysql.install_as_MySQLdb()

        DATABASES["default"].setdefault(
            "OPTIONS",
            {}
        ).setdefault(
            "charset",
            "utf8mb4",
        )

elif os.getenv("DB_ENGINE", "sqlite").lower() == "sqlite":

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.getenv(
                "SQLITE_PATH",
                str(BASE_DIR / "db.sqlite3"),
            ),
        }
    }

else:
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(
        "Set DATABASE_URL or choose DB_ENGINE=sqlite."
    )


# =========================================================
# GENERAL DJANGO SETTINGS
# =========================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME":
        "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME":
        "django.contrib.auth.password_validation.MinimumLengthValidator"
    },
    {
        "NAME":
        "django.contrib.auth.password_validation.CommonPasswordValidator"
    },
    {
        "NAME":
        "django.contrib.auth.password_validation.NumericPasswordValidator"
    },
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# =========================================================
# STATIC FILES
# =========================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_DIRS = [
    BASE_DIR / "frontend_dist"
]

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage"
    },
    "staticfiles": {
        "BACKEND":
        "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}


# =========================================================
# CORS
# =========================================================

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://my-frontend-smartcart.vercel.app",
)

# Allow Vercel frontend preview/deployment URLs
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[a-zA-Z0-9.-]+\.vercel\.app$",
    r"^https://[a-zA-Z0-9.-]+\.manus\.computer$",
]


# =========================================================
# FRONTEND ORIGIN ALLOWLIST
# =========================================================

FRONTEND_ORIGIN_ALLOWLIST = env_list(
    "FRONTEND_ORIGIN_ALLOWLIST",
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://my-frontend-smartcart.vercel.app",
)


# =========================================================
# CSRF
# =========================================================

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,"
    "http://127.0.0.1:3000,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://my-frontend-smartcart.vercel.app",
)

# Allow Vercel preview URLs for CSRF
CSRF_TRUSTED_ORIGINS += [
    "https://*.vercel.app",
]


# =========================================================
# FRAME OPTIONS
# =========================================================

X_FRAME_OPTIONS = "ALLOWALL"


# =========================================================
# STRIPE
# =========================================================

STRIPE_SECRET_KEY = os.getenv(
    "STRIPE_SECRET_KEY",
    ""
)

STRIPE_WEBHOOK_SECRET = os.getenv(
    "STRIPE_WEBHOOK_SECRET",
    ""
)


# =========================================================
# DJANGO REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],

    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],

    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination.PageNumberPagination"
    ),

    "PAGE_SIZE": 24,

    "COERCE_DECIMAL_TO_STRING": False,
}


# =========================================================
# JWT
# =========================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}
```
