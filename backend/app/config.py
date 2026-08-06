from pydantic_settings import BaseSettings
from functools import lru_cache

_INSECURE_DEFAULTS = {
    "secret_key": "change-me-in-production-use-a-long-random-string",
    "database_url": "postgresql+asyncpg://iotmart:iotmart@localhost:5432/iotmart",
}


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://iotmart:iotmart@localhost:5432/iotmart"

    # JWT
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 days
    refresh_token_expire_days: int = 30

    # App
    debug: bool = False
    environment: str = "development"
    site_name: str = "IoTMart"

    # Uploads
    upload_quota_bytes: int = 100 * 1024 * 1024  # per-user storage quota (100 MB)

    # Comma-separated list of allowed CORS origins (e.g. "https://shop.example.com")
    cors_origins: str = "http://localhost:3000"

    # ─── Email / SMTP ─────────────────────────────────────────────────────────
    # Leave smtp_host empty to use console/log fallback (development mode).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@iotmart.com"
    smtp_use_tls: bool = False       # True = SMTP_SSL (port 465)
    smtp_tls_starttls: bool = True   # True = STARTTLS on plain connection (port 587)

    # ─── OTP settings ─────────────────────────────────────────────────────────
    otp_expire_minutes: int = 5
    otp_max_attempts: int = 5

    class Config:
        env_file = "../.env"
        extra = "ignore"

    def validate_runtime(self) -> None:
        """Fail fast on insecure production configuration.

        Called once at import time: a production boot with default/weak
        secrets or an unreplaced dev database URL aborts startup instead of
        silently running insecure.
        """
        if self.environment == "production":
            if self.secret_key in _INSECURE_DEFAULTS or len(self.secret_key) < 32:
                raise RuntimeError(
                    "Refusing to boot in production: SECRET_KEY must be set to a "
                    "unique random value of at least 32 characters."
                )
            if self.database_url in _INSECURE_DEFAULTS:
                raise RuntimeError(
                    "Refusing to boot in production: DATABASE_URL must be configured."
                )
        if self.debug and self.environment == "production":
            raise RuntimeError("Refusing to boot in production with DEBUG=true.")
        if self.environment == "production" and not self.smtp_host:
            raise RuntimeError(
                "Refusing to boot in production: SMTP_HOST must be configured "
                "(otherwise password-reset / OTP emails cannot be delivered)."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
settings.validate_runtime()
