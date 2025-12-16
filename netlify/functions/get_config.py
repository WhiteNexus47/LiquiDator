import json
import os


def handler(event, context):
    try:
        whatsapp_to = os.environ.get("WHATSAPP_TO", "")

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"whatsapp_to": whatsapp_to}),
        }
    except Exception as e:
        print("get_config error:", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Could not load config"}),
        }
