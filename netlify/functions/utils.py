import uuid
from datetime import datetime, timezone


def generate_order_id():
    return f"ORD-{uuid.uuid4().hex[:10].upper()}"


def now_iso():
    return datetime.now(timezone.utc).isoformat()
