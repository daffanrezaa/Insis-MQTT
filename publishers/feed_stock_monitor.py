# publishers/feed_stock_monitor.py
"""
Feed Stock Monitor:
- Listens to all feeder dispense events
- Deducts from central stock
- Publishes retained stock status
- Triggers warning alert when < 3 days remaining
"""

import json
import time
import paho.mqtt.client as mqtt

from config.settings import (
    BROKER_HOST, BROKER_PORT, POND_IDS,
    FEED_STOCK_INITIAL_KG, FEED_WARN_DAYS, FEED_PER_MEAL_KG, Topics,
)
from config.mqtt_helpers import make_client, connect_v5, ts
from loguru import logger

# State
stock_kg = FEED_STOCK_INITIAL_KG
daily_consumption = FEED_PER_MEAL_KG * 3 * len(POND_IDS)  # estimated


def _stock_status(stock: float, daily: float) -> str:
    days = stock / daily if daily > 0 else 999
    if days < 1:    return "critical"
    if days < FEED_WARN_DAYS: return "low"
    return "sufficient"


def _publish_stock(client: mqtt.Client):
    global stock_kg, daily_consumption
    days_remaining = stock_kg / daily_consumption if daily_consumption > 0 else 999
    status = _stock_status(stock_kg, daily_consumption)

    payload = {
        "stock_kg"                : round(stock_kg, 2),
        "daily_consumption_kg"    : round(daily_consumption, 2),
        "estimated_days_remaining": round(days_remaining, 1),
        "status"                  : status,
        "timestamp"               : ts(),
    }
    client.publish(Topics.FEED_STOCK, json.dumps(payload), qos=1, retain=True)
    client.publish(Topics.FEED_EST_DAYS,
                   json.dumps({"days": round(days_remaining, 1), "timestamp": ts()}),
                   qos=1, retain=True)

    if status in ("low", "critical"):
        alert = {
            "type"    : "feed_stock",
            "severity": "warning" if status == "low" else "critical",
            "message" : f"Feed stock low: {round(stock_kg, 1)} kg remaining ({round(days_remaining, 1)} days)",
            "timestamp": ts(),
        }
        client.publish(Topics.ALERT_WARNING, json.dumps(alert), qos=1)
        logger.warning(f"[STOCK] Low feed: {round(days_remaining, 1)} days remaining")

    logger.info(f"[STOCK] {round(stock_kg, 2)}kg | {round(days_remaining, 1)} days | {status}")


def on_connect(client, userdata, flags, reason_code, props):
    if reason_code == 0:
        dispensed_wildcard = "farm/pond/+/feeder/dispensed"
        client.subscribe(dispensed_wildcard, qos=1)
        logger.info(f"Feed Stock Monitor subscribed to {dispensed_wildcard}")


def run_feed_stock_monitor():
    global stock_kg

    client = make_client(client_id="feed-stock-monitor", receive_maximum=8)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)

    def on_message(client, userdata, msg):
        global stock_kg
        try:
            data = json.loads(msg.payload)
            dispensed = float(data.get("dispensed_kg", 0))
            stock_kg = max(0.0, stock_kg - dispensed)
            logger.debug(f"[STOCK] Deducted {dispensed}kg. Remaining: {round(stock_kg, 2)}kg")
            _publish_stock(client)
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"[STOCK] Bad dispensed payload: {e}")

    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_start()

    # Publish initial stock
    _publish_stock(client)

    try:
        while True:
            # Periodic publish every 60s (even without dispense events)
            time.sleep(60)
            _publish_stock(client)
    except KeyboardInterrupt:
        logger.info("Feed Stock Monitor stopping")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run_feed_stock_monitor()
