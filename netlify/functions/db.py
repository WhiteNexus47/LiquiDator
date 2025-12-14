import sqlite3
import json
import os
import tempfile

# Netlify allows write access ONLY to /tmp but locally (Windows) use system temp
_tmp_dir = (
    "/tmp"
    if os.path.exists("/tmp") and os.access("/tmp", os.W_OK)
    else tempfile.gettempdir()
)
DB_PATH = os.environ.get("ORDERS_DB_PATH") or os.path.join(_tmp_dir, "orders.db")


# ----------------------------
# Database connection
# ----------------------------
def get_connection():
    return sqlite3.connect(DB_PATH)


# ----------------------------
# Initialize database
# ----------------------------
def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE,
            customer_name TEXT,
            customer_email TEXT,
            address TEXT,
            items_json TEXT,
            total REAL,
            created_at TEXT
        )
    """
    )

    conn.commit()
    conn.close()


# ----------------------------
# Save order
# ----------------------------
def save_order(order: dict):
    """
    Saves an order dictionary into SQLite.
    Expects validated order payload.
    """

    init_db()  # Safe to call multiple times

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO orders (
            order_id,
            customer_name,
            customer_email,
            address,
            items_json,
            total,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (
            order["orderId"],
            order["customer"]["name"],
            order["customer"]["email"],
            order["address"],
            json.dumps(order["items"]),
            order["total"],
            order["timestamp"],
        ),
    )

    conn.commit()
    conn.close()
