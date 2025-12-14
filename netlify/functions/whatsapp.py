import requests

WHATSAPP_TOKEN = "YOUR_META_WHATSAPP_TOKEN"
PHONE_NUMBER_ID = "YOUR_PHONE_NUMBER_ID"
BUSINESS_NUMBER = "15307659545"


def send_whatsapp(order):
    api_url = f"https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }

    # 1️⃣ Send images first
    for item in order["items"]:
        img = item.get("image")
        if not img:
            continue

        payload = {
            "messaging_product": "whatsapp",
            "to": BUSINESS_NUMBER,
            "type": "image",
            "image": {"link": img},
        }

        r = requests.post(api_url, headers=headers, json=payload)
        if r.status_code >= 300:
            raise Exception(f"WhatsApp image failed: {r.text}")

    # 2️⃣ Send formatted text
    text = format_order_text(order)

    payload = {
        "messaging_product": "whatsapp",
        "to": BUSINESS_NUMBER,
        "type": "text",
        "text": {"body": text},
    }

    r = requests.post(api_url, headers=headers, json=payload)
    if r.status_code >= 300:
        raise Exception(f"WhatsApp text failed: {r.text}")


def format_order_text(order):
    lines = [
        "🛒 NEW ORDER",
        f"Order ID: {order['orderId']}",
        f"Time: {order['timestamp']}",
        "",
        f"Name: {order['customer']['name']}",
        f"Email: {order['customer']['email']}",
        f"Address: {order['address']}",
        "",
        "Items:",
    ]

    for i in order["items"]:
        lines.append(f"• {i['name']} × {i['qty']} = ${i['price'] * i['qty']}")

    lines.append("")
    lines.append(f"Total: ${order['total']}")

    return "\n".join(lines)
