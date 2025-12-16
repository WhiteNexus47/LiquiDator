import json
import os

def handler(event, context):
    try:
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "whatsapp_to": os.environ.get("WHATSAPP_TO", ""),
                "email_to": os.environ.get("EMAIL_TO", "")
            }),
        }
    except Exception as e:
        print("get_config error:", str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not load config"})
        }
