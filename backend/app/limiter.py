"""Shared rate-limiter instance.

Defined here (not in main.py) so routers can import it without
creating a circular dependency with main.py.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
