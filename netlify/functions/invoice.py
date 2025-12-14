from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
import os


# ----------------------------
# Generate PDF Invoice
# ----------------------------
def generate_invoice(order: dict) -> str:
    """
    Generates a PDF invoice for the given order.
    Returns the file path to the generated PDF.
    """

    filename = f"/tmp/invoice_{order['orderId']}.pdf"
    c = canvas.Canvas(filename, pagesize=A4)

    width, height = A4

    # ----------------------------
    # Header
    # ----------------------------
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, height - 50, "INVOICE")

    c.setFont("Helvetica", 10)
    c.drawRightString(width - 40, height - 45, f"Order ID: {order['orderId']}")
    c.drawRightString(width - 40, height - 60, f"Date: {order['timestamp']}")

    # ----------------------------
    # Shop info
    # ----------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, height - 100, "Your Shop Name")

    c.setFont("Helvetica", 9)
    c.drawString(40, height - 115, "support@yourshop.com")
    c.drawString(40, height - 130, "www.yourshop.com")

    # ----------------------------
    # Customer info
    # ----------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, height - 170, "Bill To:")

    c.setFont("Helvetica", 10)
    c.drawString(40, height - 185, order["customer"]["name"])
    c.drawString(40, height - 200, order["customer"]["email"])
    c.drawString(40, height - 215, order["address"])

    # ----------------------------
    # Items table
    # ----------------------------
    table_data = [["Item", "Qty", "Price", "Subtotal"]]

    for item in order["items"]:
        subtotal = item["qty"] * item["price"]
        table_data.append([
            item["name"],
            str(item["qty"]),
            f"${item['price']}",
            f"${subtotal}"
        ])

    table = Table(
        table_data,
        colWidths=[80*mm, 20*mm, 30*mm, 30*mm]
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
    ]))

    table.wrapOn(c, width, height)
    table.drawOn(c, 40, height - 450)

    # ----------------------------
    # Total
    # ----------------------------
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 40, height - 480, f"Total: ${order['total']}")

    # ----------------------------
    # Footer
    # ----------------------------
    c.setFont("Helvetica", 8)
    c.drawCentredString(
        width / 2,
        40,
        "Thank you for your order! This invoice is generated automatically."
    )

    c.save()

    return filename
