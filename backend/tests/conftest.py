"""pytest configuration for the IoTMart backend test suite."""
import sys
import os

# Make sure `backend/` is on the path so `from app.xxx import` works
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
