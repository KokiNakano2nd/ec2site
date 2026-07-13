import stripe as stripe_lib

from . import config

if config.STRIPE_SECRET_KEY:
    stripe_lib.api_key = config.STRIPE_SECRET_KEY
