import json

from db import save_order
from utils import generate_order_id, now_iso
from emailer import send_order_email
from whatsapp import send_whatsapp
import traceback

def handler(event, context):
    try:
        payload = json.loads(event.get("body", "{}"))

        # ----------------------------
        # Build normalized order
        # ----------------------------
        order = {
            "orderId": generate_order_id(),
            "timestamp": now_iso(),
            "customer": payload["customer"],
            "address": payload["address"],
            "items": payload["items"],
            "total": payload["total"],
            "channel": payload["channel"],
        }
        
        for item in order["items"]:
            item["price"] = float(item["price"])


        # ----------------------------
        # 1️⃣ Store order
        # ----------------------------
        save_order(order)

        # ----------------------------
        # 2️⃣ Send via selected channel
        # ----------------------------
        if order["channel"] == "email":
            # Emailer handles invoice generation internally
            try:
                send_order_email(order)
            except Exception as e:
                return response(502, {"error": "email_failed", "details": str(e)})

        elif order["channel"] == "whatsapp":
            try:
                send_whatsapp(order)
            except Exception as e:
                return response(502, {"error": "whatsapp_failed", "details": str(e)})

        else:
            return response(400, {"error": "Invalid channel"})

        return response(200, {"status": "success", "orderId": order["orderId"]})

    except Exception as e:
        print("SEND_ORDER TRACEBACK:")
        traceback.print_exc()
        return response(500, {"error": str(e)})

def response(status, body):
    return {
        "statusCode": status,
        "body": json.dumps(body),
    }

