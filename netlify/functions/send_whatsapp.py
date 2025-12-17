import json
import os
import requests


def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        message_text = body.get("message")

        if not message_text:
            return response(400, "Missing order message")

        # Environment variables
        WHATSAPP_TOKEN = os.environ.get("WHATSAPP_TOKEN")
        PHONE_NUMBER_ID = os.environ.get("PHONE_NUMBER_ID")
        TO_NUMBER = os.environ.get("WHATSAPP_TO")

        if not WHATSAPP_TOKEN or not PHONE_NUMBER_ID or not TO_NUMBER:
            return response(500, "WhatsApp environment variables not set")

        url = f"https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "to": TO_NUMBER,
            "type": "text",
            "text": {
                "body": message_text
            }
        }

        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }

        res = requests.post(url, headers=headers, json=payload, timeout=10)

        if res.status_code not in (200, 201):
            print("WhatsApp API error:", res.text)
            return response(500, "WhatsApp API failed")

        return response(200, "WhatsApp message sent")

    except Exception as e:
        print("WhatsApp error:", str(e))
        return response(500, "Failed to send WhatsApp message")


def response(status, message):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "success": status == 200,
            "message": message
        })
    }
