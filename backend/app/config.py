import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
