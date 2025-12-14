import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from invoice import generate_invoice


# ----------------------------
# Send Order Email dipc tqaz amvg iaac
# ----------------------------
def send_order_email(order: dict):
    """Sends an order confirmation email with PDF invoice attached."""

    email_user = os.environ.get("EMAIL_USER")
    email_pass = os.environ.get("EMAIL_PASS")
    email_to = os.environ.get("EMAIL_TO")

    if not email_user or not email_pass or not email_to:
        raise Exception("Missing email environment variables")

    # Generate invoice PDF
    pdf_path = generate_invoice(order)

    # Create email
    msg = MIMEMultipart()
    msg["From"] = email_user
    msg["To"] = email_to
    msg["Subject"] = f"New Order – {order['orderId']}"

    # ----------------------------
    # HTML Body
    # ----------------------------
    items_html = "".join(
        f"<tr><td>{i['name']}</td><td>{i['qty']}</td><td>${i['price']}</td></tr>"
        for i in order["items"]
    )

    html = f"""
<div style="font-family:Arial;max-width:600px;margin:auto;border:1px solid #e5e5e5">
  <div style="background:#6b4f3f;color:white;padding:12px">
    <h2>New Order Received</h2>
  </div>

  <div style="padding:16px;color:#333">
    <p><b>Order ID:</b> {order['orderId']}</p>
    <p><b>Date:</b> {order['timestamp']}</p>

    <p>
      <b>{order['customer']['name']}</b><br>
      {order['customer']['email']}<br>
      {order['address']}
    </p>

    <table width="100%" cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse">
      <tr style="background:#f5efe9">
        <th align="left">Item</th>
        <th>Qty</th>
        <th>Price</th>
      </tr>
      {items_html}
    </table>

    <h3 style="text-align:right">Total: ${order['total']}</h3>
  </div>

  <div style="background:#f5efe9;padding:10px;font-size:12px;text-align:center">
    This is an automated order notification.
  </div>
</div>
"""

    msg.attach(MIMEText(html, "html"))

    # ----------------------------
    # Attach PDF
    # ----------------------------
    with open(pdf_path, "rb") as f:
        part = MIMEBase("application", "pdf")
        part.set_payload(f.read())

    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition", f'attachment; filename="invoice_{order["orderId"]}.pdf"'
    )
    msg.attach(part)

    # ----------------------------
    # Send Email
    # ----------------------------
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(email_user, email_pass)
        server.send_message(msg)
