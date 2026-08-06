"""pytest configuration for the IoTMart backend test suite."""
import sys
import os
from contextlib import asynccontextmanager
from unittest.mock import patch

# Make sure `backend/` is on the path so `from app.xxx import` works
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Patch SMTP before app is imported so tests never touch real email sending.
_SEND_PATCH = patch("app.email_service._send_sync", return_value=None)
_SEND_PATCH.start()
