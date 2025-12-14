import json
import requests

url = "http://localhost:8888/.netlify/functions/send_order"

payload = {
    "customer": {"name": "Test User", "email": "test@example.com"},
    "address": "123 Test St",
    "items": [{"name": "Widget", "qty": 1, "price": 9.99}],
    "total": 9.99,
    "channel": "whatsapp",
}

r = requests.post(url, json=payload)
print("status", r.status_code)
print("body", r.text)
