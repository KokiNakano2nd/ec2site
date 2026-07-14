import os
from pathlib import Path

VALID_APP_ENVS = {"local", "test", "staging", "production"}
VALID_EMAIL_DELIVERY_MODES = {"console", "disabled", "smtp"}
VALID_LOG_LEVELS = {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}
TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


def _optional_bool(name: str) -> bool | None:
    raw_value = os.getenv(name)
    if raw_value is None:
        return None
    value = raw_value.strip().lower()
    if value in TRUE_VALUES:
        return True
    if value in FALSE_VALUES:
        return False
    raise RuntimeError(f"{name} must be a boolean")


def _port(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError as error:
        raise RuntimeError(f"{name} must be an integer") from error
    if not 1 <= value <= 65535:
        raise RuntimeError(f"{name} must be between 1 and 65535")
    return value


APP_ENV = os.getenv("APP_ENV", "local").strip().lower()

DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_DATABASE_URL = f"sqlite:///{DATA_DIR / 'ec_site.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or DEFAULT_DATABASE_URL

_secret_key = os.getenv("SECRET_KEY", "").strip()
SECRET_KEY = _secret_key or "dev-secret-key-change-in-production"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174").rstrip("/")
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
CORS_ORIGINS = [origin.strip().rstrip("/") for origin in _cors_origins.split(",") if origin.strip()] or [FRONTEND_URL]

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
_stripe_enabled_value = _optional_bool("STRIPE_ENABLED")
STRIPE_ENABLED = _stripe_enabled_value if _stripe_enabled_value is not None else bool(STRIPE_SECRET_KEY)

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = _port("SMTP_PORT", 587)
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@techstore.local").strip()
EMAIL_DELIVERY = os.getenv("EMAIL_DELIVERY", "smtp" if SMTP_HOST else "console").strip().lower()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").strip().upper()


def stripe_enabled() -> bool:
    if _stripe_enabled_value is None:
        return bool(STRIPE_SECRET_KEY)
    return STRIPE_ENABLED


def validate_settings() -> None:
    if APP_ENV not in VALID_APP_ENVS:
        choices = ", ".join(sorted(VALID_APP_ENVS))
        raise RuntimeError(f"APP_ENV must be one of: {choices}")
    if EMAIL_DELIVERY not in VALID_EMAIL_DELIVERY_MODES:
        choices = ", ".join(sorted(VALID_EMAIL_DELIVERY_MODES))
        raise RuntimeError(f"EMAIL_DELIVERY must be one of: {choices}")
    if LOG_LEVEL not in VALID_LOG_LEVELS:
        choices = ", ".join(sorted(VALID_LOG_LEVELS))
        raise RuntimeError(f"LOG_LEVEL must be one of: {choices}")
    if STRIPE_ENABLED and not STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_ENABLED=true requires STRIPE_SECRET_KEY")
    if EMAIL_DELIVERY == "smtp" and not SMTP_HOST:
        raise RuntimeError("EMAIL_DELIVERY=smtp requires SMTP_HOST")
    if SMTP_USER and not SMTP_PASSWORD:
        raise RuntimeError("SMTP_USER requires SMTP_PASSWORD")

    if APP_ENV != "production":
        return

    if not _secret_key or len(_secret_key) < 32:
        raise RuntimeError("production requires SECRET_KEY with at least 32 characters")
    if DATABASE_URL == DEFAULT_DATABASE_URL:
        raise RuntimeError("production requires an explicit DATABASE_URL")
    if not FRONTEND_URL.startswith("https://"):
        raise RuntimeError("production requires an HTTPS FRONTEND_URL")
    if not CORS_ORIGINS or any(not origin.startswith("https://") for origin in CORS_ORIGINS):
        raise RuntimeError("production requires HTTPS CORS_ORIGINS")
    if EMAIL_DELIVERY == "console":
        raise RuntimeError("production cannot use EMAIL_DELIVERY=console")


validate_settings()
