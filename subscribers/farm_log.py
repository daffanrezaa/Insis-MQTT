# subscribers/farm_log.py
"""
Farm Log System — archives all events to rotating log files.
- One log file per pond per day
- Separate logs for storage and alerts
"""

import json
import os
import time
from datetime import date
import paho.mqtt.client as mqtt

from config.settings import BROKER_HOST, BROKER_PORT, Topics
from config.mqtt_helpers import make_client, connect_v5, ts
from loguru import logger

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)


def _log_path(category: str) -> str:
    today = date.today().isoformat()
    return os.path.join(LOG_DIR, f"{category}_{today}.jsonl")


def _append_log(category: str, record: dict):
    path = _log_path(category)
    with open(path, "a") as f:
        f.write(json.dumps(record) + "\n")


SUBSCRIPTIONS = [
    ("farm/pond/+/water/#",   1),   # all water params
    ("farm/pond/+/health/#",  1),   # mortality, behaviour, treatment
    ("farm/pond/+/cycle/#",   1),   # cycle status, weight samples
    ("farm/pond/+/feeder/#",  1),   # feeder events
    ("farm/pond/+/aerator/#", 1),   # aerator status
    ("farm/storage/#",        1),   # feed stock
    ("farm/alerts/#",         1),   # all alerts
]


def run_farm_log():
    client = make_client(client_id="farm-log-system", receive_maximum=64)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)

    def on_connect(c, u, flags, reason_code, props):
        if reason_code == 0:
            for topic, qos in SUBSCRIPTIONS:
                c.subscribe(topic, qos=qos)
            logger.info("Farm Log subscribed to all topics")

    def on_message(c, u, msg, props=None):
        try:
            payload = json.loads(msg.payload)
        except json.JSONDecodeError:
            payload = {"raw": msg.payload.decode(errors="replace")}

        parts = msg.topic.split("/")
        # Determine category from topic structure
        if "pond" in parts:
            pond_idx = parts.index("pond")
            pond_id = parts[pond_idx + 1] if pond_idx + 1 < len(parts) else "unknown"
            category = f"pond_{pond_id}"
        elif "storage" in parts:
            category = "storage"
        elif "alerts" in parts:
            category = "alerts"
        else:
            category = "misc"

        record = {
            "topic"    : msg.topic,
            "qos"      : msg.qos,
            "retained" : msg.retain,
            "payload"  : payload,
            "logged_at": ts(),
        }
        # User Properties from MQTT v5
        if props and hasattr(props, "UserProperty") and props.UserProperty:
            record["user_props"] = dict(props.UserProperty)

        _append_log(category, record)
        logger.debug(f"[LOG] {msg.topic}")

    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_forever()


if __name__ == "__main__":
    run_farm_log()
