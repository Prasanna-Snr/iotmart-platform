from pydantic_settings import BaseSettings
from functools import lru_cache


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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
