# subscribers/alert_system.py
"""
Alert System — run two instances concurrently:
  python alert_system.py 1
  python alert_system.py 2

Both share $share/alert-group/... so EMQX distributes messages between them
(round-robin load balancing).
"""

import json
import sys
import paho.mqtt.client as mqtt

from config.settings import BROKER_HOST, BROKER_PORT, Topics, WATER_PARAMS
from config.mqtt_helpers import make_client, connect_v5, ts
from loguru import logger


ALERT_RULES = [
    # (check_fn, severity, message_fn)
    (lambda d: d.get("do", 99) < WATER_PARAMS["do_min"],
     "critical", lambda d: f"[{d['pond_id']}] DO CRITICAL: {d['do']} mg/L (min {WATER_PARAMS['do_min']})"),

    (lambda d: d.get("do", 99) < WATER_PARAMS["do_warn_low"],
     "warning",  lambda d: f"[{d['pond_id']}] DO low: {d['do']} mg/L"),

    (lambda d: d.get("ammonia", 0) > WATER_PARAMS["ammonia_max"],
     "warning",  lambda d: f"[{d['pond_id']}] Ammonia HIGH: {d['ammonia']} mg/L"),

    (lambda d: d.get("temperature", 28) > WATER_PARAMS["temp_warn_hi"],
     "warning",  lambda d: f"[{d['pond_id']}] Temp HIGH: {d['temperature']}°C"),

    (lambda d: d.get("temperature", 28) < WATER_PARAMS["temp_warn_lo"],
     "warning",  lambda d: f"[{d['pond_id']}] Temp LOW: {d['temperature']}°C"),
]

AERATOR_RULES = [
    (lambda d: d.get("status") in ("offline", "error"),
     "critical", lambda d: f"[{d['pond_id']}] AERATOR {d['status'].upper()}!"),
]


def evaluate_and_log(topic: str, payload: dict, instance_id: str):
    rules = []
    if "/water/all" in topic or "/water/" in topic:
        rules = ALERT_RULES
    elif "/aerator/" in topic:
        rules = AERATOR_RULES
    elif "farm/alerts/" in topic:
        sev = "CRITICAL" if "critical" in topic else "WARNING"
        logger.opt(colors=True).warning(
            f"<red>[ALERT-{instance_id}]</red> {sev}: {payload.get('message', str(payload))}"
        )
        return

    for check_fn, severity, msg_fn in rules:
        try:
            if check_fn(payload):
                icon = "🚨" if severity == "critical" else "⚠️"
                logger.warning(f"{icon} [ALERT-{instance_id}] {severity.upper()}: {msg_fn(payload)}")
        except (KeyError, TypeError):
            pass


def run_alert_system(instance_id: str = "1"):
    client_id = f"alert-system-{instance_id}"
    client = make_client(client_id=client_id, receive_maximum=32)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)

    def on_connect(c, u, flags, reason_code, props):
        if reason_code == 0:
            # Shared subscriptions — EMQX distributes among all instances
            shared_prefix = "$share/alert-group/"
            subs = [
                (f"{shared_prefix}farm/alerts/#",          1),
                (f"{shared_prefix}farm/pond/+/water/all",  1),
                (f"{shared_prefix}farm/pond/+/aerator/status", 1),
                (f"{shared_prefix}farm/pond/+/feeder/status",  1),
            ]
            for topic, qos in subs:
                c.subscribe(topic, qos=qos)
                logger.info(f"[ALERT-{instance_id}] Subscribed: {topic}")

    def on_message(c, u, msg, props=None):
        try:
            payload = json.loads(msg.payload)
        except json.JSONDecodeError:
            payload = {"raw": msg.payload.decode(errors="replace")}
        evaluate_and_log(msg.topic, payload, instance_id)

    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_start()
    logger.info(f"Alert System instance {instance_id} running")

    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info(f"Alert System {instance_id} stopping")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    instance = sys.argv[1] if len(sys.argv) > 1 else "1"
    run_alert_system(instance)
