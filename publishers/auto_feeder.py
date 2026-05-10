# publishers/auto_feeder.py
"""
Auto Feeder:
- Watches the clock for scheduled feeding times (3x/day per pond)
- QoS 2 for schedule messages (exactly-once delivery)
- QoS 1 for status updates
- Retains `remaining` topic so dashboard always shows last known stock
- Publishes to shared feed_stock_monitor via event
"""

import json
import random
import time
import threading
import paho.mqtt.client as mqtt

from config.settings import (
    BROKER_HOST, BROKER_PORT, POND_IDS,
    FEED_SCHEDULE, FEED_PER_MEAL_KG, Topics,
)
from config.mqtt_helpers import make_client, connect_v5, make_publish_props, ts
from loguru import logger


class FeederSimulator:
    def __init__(self, pond_id: str):
        self.pond_id = pond_id
        self.status = "standby"
        self.remaining_kg = 10.0  # per-feeder hopper
        self.last_fed = None
        self.last_fed_kg = 0.0

    def dispense(self) -> dict | None:
        """Attempt to dispense feed. Returns None if jammed or empty."""
        if self.remaining_kg < 0.1:
            self.status = "offline"
            return None
        if random.random() < 0.04:   # 4% jam chance
            self.status = "jammed"
            logger.warning(f"[FEEDER] {self.pond_id} JAMMED")
            return None

        amount = FEED_PER_MEAL_KG * random.uniform(0.95, 1.05)
        self.remaining_kg = max(0.0, self.remaining_kg - amount)
        self.status = "dispensing"
        self.last_fed = ts()
        self.last_fed_kg = round(amount, 3)
        return {
            "pond_id"     : self.pond_id,
            "dispensed_kg": self.last_fed_kg,
            "remaining_kg": round(self.remaining_kg, 2),
            "timestamp"   : self.last_fed,
        }


feeders = {pid: FeederSimulator(pid) for pid in POND_IDS}
_last_fed_minute: dict[str, str] = {}  # pond_id → HH:MM of last feed


def _current_hhmm() -> str:
    return time.strftime("%H:%M")


def _is_feed_time() -> bool:
    return _current_hhmm() in FEED_SCHEDULE


def run_auto_feeder(cycle_day: int = 1):
    client = make_client(client_id="auto-feeder", receive_maximum=16)
    connect_v5(
        client,
        host=BROKER_HOST,
        port=BROKER_PORT,
        lwt_topic=Topics.ALERT_WARNING,
        lwt_payload={"device": "auto-feeder-all", "status": "OFFLINE", "timestamp": ts()},
        lwt_qos=1,
    )
    client.loop_start()
    logger.info("Auto Feeder started")

    def publish_schedule():
        """Publish feeding schedule for all ponds at startup (QoS 2)."""
        for pond_id in POND_IDS:
            topic = Topics.fmt(Topics.FEEDER_SCHEDULE, pond_id=pond_id)
            payload = json.dumps({
                "pond_id" : pond_id,
                "schedule": FEED_SCHEDULE,
                "timestamp": ts(),
            })
            props = make_publish_props(
                user_props={"pond_id": pond_id, "cycle_day": str(cycle_day)},
            )
            client.publish(topic, payload, qos=2, retain=True, properties=props)
        logger.info("Feed schedules published (QoS 2)")

    publish_schedule()

    try:
        while True:
            now_hhmm = _current_hhmm()
            is_feed = now_hhmm in FEED_SCHEDULE

            for pond_id, feeder in feeders.items():
                # ── Feed event ────────────────────────────────────────────────
                if is_feed and _last_fed_minute.get(pond_id) != now_hhmm:
                    _last_fed_minute[pond_id] = now_hhmm
                    result = feeder.dispense()

                    if result:
                        # Dispensed — publish QoS 1
                        props = make_publish_props(
                            user_props={
                                "pond_id"  : pond_id,
                                "cycle_day": str(cycle_day),
                                "device_id": f"feeder-{pond_id}",
                            },
                        )
                        client.publish(
                            Topics.fmt(Topics.FEEDER_DISPENSED, pond_id=pond_id),
                            json.dumps(result),
                            qos=1,
                            properties=props,
                        )
                        # Retained remaining
                        client.publish(
                            Topics.fmt(Topics.FEEDER_REMAINING, pond_id=pond_id),
                            json.dumps({"pond_id": pond_id,
                                        "remaining_kg": result["remaining_kg"],
                                        "timestamp": ts()}),
                            qos=1,
                            retain=True,
                        )
                        logger.info(f"[FEEDER] {pond_id} dispensed {result['dispensed_kg']}kg")

                    else:
                        # Jam or empty alert
                        alert = {
                            "pond_id": pond_id,
                            "device" : f"feeder-{pond_id}",
                            "status" : feeder.status,
                            "severity": "warning",
                            "message": f"Feeder {pond_id} failed to dispense: {feeder.status}",
                            "timestamp": ts(),
                        }
                        client.publish(Topics.ALERT_WARNING, json.dumps(alert), qos=1)

                # ── Status heartbeat every 10s ────────────────────────────────
                status_payload = json.dumps({
                    "pond_id"     : pond_id,
                    "status"      : feeder.status,
                    "remaining_kg": round(feeder.remaining_kg, 2),
                    "last_fed"    : feeder.last_fed,
                    "timestamp"   : ts(),
                })
                # Reset status back to standby after dispensing
                if feeder.status == "dispensing":
                    feeder.status = "standby"

                client.publish(
                    Topics.fmt(Topics.FEEDER_STATUS, pond_id=pond_id),
                    status_payload,
                    qos=1,
                    retain=True,
                )

            time.sleep(10)

    except KeyboardInterrupt:
        logger.info("Auto Feeder stopping")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run_auto_feeder(cycle_day=14)
