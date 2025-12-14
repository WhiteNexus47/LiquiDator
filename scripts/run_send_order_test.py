import json
import os

# Ensure function modules import from netlify/functions
import sys

sys.path.insert(0, "netlify/functions")

from send_order import handler

# Minimal test payload
payload = {
    "customer": {"name": "Test User", "email": "test@example.com"},
    "address": "123 Test St",
    "items": [{"name": "Widget", "qty": 1, "price": 9.99}],
    "total": 9.99,
    "channel": "whatsapp",
}

event = {"body": json.dumps(payload)}

res = handler(event, None)
print(res)
