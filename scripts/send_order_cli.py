import sys
import json
import os

# ensure module path
sys.path.insert(0, os.path.join(os.getcwd(), "netlify/functions"))

from send_order import handler


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}
    # debug: show payload on stderr
    print("DEBUG payload:", payload, file=sys.stderr)
    event = {"body": json.dumps(payload)}

    res = handler(event, None)

    # handler returns a dict with 'statusCode' and 'body' (body is JSON string)
    print(json.dumps(res))


if __name__ == "__main__":
    main()
