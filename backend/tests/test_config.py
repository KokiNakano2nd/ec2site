import os
import subprocess
import sys


def _import_config(**overrides: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    for name in (
        "APP_ENV",
        "CORS_ORIGINS",
        "DATABASE_URL",
        "EMAIL_DELIVERY",
        "FRONTEND_URL",
        "SECRET_KEY",
        "SMTP_HOST",
        "SMTP_PASSWORD",
        "SMTP_PORT",
        "SMTP_USER",
        "FROM_EMAIL",
        "LOG_LEVEL",
        "STRIPE_ENABLED",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
    ):
        env.pop(name, None)
    env.update(overrides)
    return subprocess.run(
        [sys.executable, "-c", "import app.config"],
        check=False,
        capture_output=True,
        cwd=os.path.dirname(os.path.dirname(__file__)),
        env=env,
        text=True,
    )


def test_production_rejects_missing_required_settings():
    result = _import_config(APP_ENV="production")

    assert result.returncode != 0
    assert "production requires SECRET_KEY" in result.stderr


def test_enabled_stripe_requires_secret_key():
    result = _import_config(APP_ENV="local", STRIPE_ENABLED="true")

    assert result.returncode != 0
    assert "STRIPE_ENABLED=true requires STRIPE_SECRET_KEY" in result.stderr


def test_invalid_boolean_setting_is_rejected():
    result = _import_config(APP_ENV="local", STRIPE_ENABLED="sometimes")

    assert result.returncode != 0
    assert "STRIPE_ENABLED must be a boolean" in result.stderr


def test_production_with_stripe_requires_webhook_secret():
    result = _import_config(
        APP_ENV="production",
        CORS_ORIGINS="https://shop.example.com",
        DATABASE_URL="postgresql://app:password@db.example.com/shop",
        EMAIL_DELIVERY="disabled",
        FRONTEND_URL="https://shop.example.com",
        SECRET_KEY="a-secure-production-secret-key-value",
        STRIPE_ENABLED="true",
        STRIPE_SECRET_KEY="sk_live_dummy",
    )

    assert result.returncode != 0
    assert "requires STRIPE_WEBHOOK_SECRET" in result.stderr


def test_production_accepts_explicit_secure_settings():
    result = _import_config(
        APP_ENV="production",
        CORS_ORIGINS="https://shop.example.com",
        DATABASE_URL="postgresql://app:password@db.example.com/shop",
        EMAIL_DELIVERY="disabled",
        FRONTEND_URL="https://shop.example.com",
        SECRET_KEY="a-secure-production-secret-key-value",
        STRIPE_ENABLED="false",
    )

    assert result.returncode == 0, result.stderr
