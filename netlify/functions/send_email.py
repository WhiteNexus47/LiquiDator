import json
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
load_dotenv()  # loads your local .env file


# ----------------------------
# HTML Email Template
# ----------------------------
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Order {{order_id}}</title>
</head>
<body style="font-family: Arial, sans-serif; margin:0; padding:0; background:#f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:8px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#4a90e2; color:#fff; text-align:center; padding:20px;">
              <h1 style="margin:0;">🎉 New Order Received!</h1>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding:20px;">
              <h2 style="margin-top:0;">Customer Info</h2>
              <p><strong>Name:</strong> {{customer_name}}</p>
              <p><strong>Email:</strong> {{customer_email}}</p>
              <p><strong>Address:</strong> {{customer_address}}</p>
              <p><strong>Payment Method:</strong> {{payment_method}}</p>
            </td>
          </tr>

          <!-- Order Items -->
          <tr>
            <td style="padding:0 20px 20px 20px;">
              <h2 style="margin-top:0;">Order Items</h2>
              {{items_html}}
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding:0 20px 20px 20px; text-align:right;">
              <h3>Total: ${{order_total}}</h3>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding:20px; text-align:center;">
              <a href="{{order_link}}" style="background:#4a90e2; color:#fff; text-decoration:none; padding:12px 25px; border-radius:5px; display:inline-block;">View Order / Pay Now</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f1f1; color:#555; text-align:center; padding:15px;">
              <p style="margin:0;">Thank you for shopping with Prime Liquidator!<br>If you did not place this order, contact us immediately.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

# ----------------------------
# Helper to generate items HTML
# ----------------------------
def generate_items_html(items):
    rows = []
    for i in items:
        total_price = float(i["qty"]) * float(i["price"])
        rows.append(f"""
        <p style="margin:5px 0;"><strong>{i['name']}</strong> × {i['qty']} = ${total_price:.2f}</p>
        """)
    return "\n".join(rows)

# ----------------------------
# Main handler
# ----------------------------
def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        pending_order = body.get("order")
        message_text = body.get("message")

        if not pending_order or not message_text:
            return response(400, "Missing order data or message")

        EMAIL_USER = os.environ.get("EMAIL_USER")
        EMAIL_PASS = os.environ.get("EMAIL_PASS")
        EMAIL_TO = os.environ.get("EMAIL_TO")

        if not EMAIL_USER or not EMAIL_PASS or not EMAIL_TO:
            return response(500, "Email environment variables not set")

        # Build HTML body
        html_body = HTML_TEMPLATE
        html_body = html_body.replace("{{order_id}}", pending_order["orderId"])
        html_body = html_body.replace("{{customer_name}}", pending_order["customer"]["name"])
        html_body = html_body.replace("{{customer_email}}", pending_order["customer"]["email"])
        html_body = html_body.replace("{{customer_address}}", pending_order["address"])
        html_body = html_body.replace("{{payment_method}}", pending_order["paymentMethod"])
        html_body = html_body.replace("{{items_html}}", generate_items_html(pending_order["items"]))
        html_body = html_body.replace("{{order_total}}", pending_order["total"])
        html_body = html_body.replace("{{order_link}}", f"https://yourshop.com/orders/{pending_order['orderId']}")

        # Create email
        msg = EmailMessage()
        msg["From"] = f"Prime Liquidator Orders <{EMAIL_USER}>"
        msg["To"] = EMAIL_TO
        msg["Subject"] = f"New Order {pending_order['orderId']}"

        # Plain text fallback
        msg.set_content(message_text)

        # HTML version
        msg.add_alternative(html_body, subtype="html")

        # Send via Gmail
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)

        return response(200, "Email sent successfully")

    except Exception as e:
        print("Email error:", str(e))
        return response(500, f"Failed to send email: {str(e)}")


def response(status, message):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"success": status == 200, "message": message})
    }
