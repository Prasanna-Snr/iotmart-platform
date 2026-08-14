"""Shared rate-limiter instance.

Defined here (not in main.py) so routers can import it without
creating a circular dependency with main.py.

Counters live in Redis (``settings.redis_url``) so limits are shared
across all uvicorn workers/processes instead of per-process memory.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
