import sys

sys.path.insert(0, "netlify/functions")
try:
    import send_order

    print("Imported send_order OK")
except Exception as e:
    import traceback

    traceback.print_exc()
