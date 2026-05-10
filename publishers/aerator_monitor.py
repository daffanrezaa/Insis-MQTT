# publishers/aerator_monitor.py
"""
Aerator Monitor — most safety-critical publisher.
LWT fires if this process dies unexpectedly, signalling aerator comms failure.
Simulates random aerator failures (especially dangerous at night).
"""

import json
import random
import time
import paho.mqtt.client as mqtt

from config.settings import BROKER_HOST, BROKER_PORT, POND_IDS, Topics
from config.mqtt_helpers import make_client, connect_v5, make_publish_props, ts
from loguru import logger

AERATOR_STATES = ["active", "idle", "offline", "error"]


class AeratorSimulator:
    def __init__(self, pond_id: str):
        self.pond_id = pond_id
        self.status = "active"
        self.power_w = random.uniform(150, 300)
        self.uptime_minutes = 0
        self.failure_countdown = None  # None = no pending failure

    def tick(self) -> dict:
        """Advance state by one tick (5 seconds = 1/12 minute)."""
        if self.failure_countdown is not None:
            self.failure_countdown -= 1
            if self.failure_countdown <= 0:
                self.status = "offline" if random.random() < 0.7 else "error"
                self.failure_countdown = None
        elif self.status in ("offline", "error"):
            # Auto-recover after 30–90 seconds
            if random.random() < 0.03:
                self.status = "active"
                logger.info(f"[AERATOR] {self.pond_id} recovered")
        else:
            # 0.3% chance each tick of a new failure
            if random.random() < 0.003:
                self.failure_countdown = random.randint(2, 6)
                logger.warning(f"[AERATOR] {self.pond_id} failure imminent")

        if self.status == "active":
            self.uptime_minutes += 1 / 12
            self.power_w = random.uniform(150, 300)
        else:
            self.power_w = 0

        return {
            "pond_id"         : self.pond_id,
            "status"          : self.status,
            "power_consumption": round(self.power_w, 1),
            "uptime_minutes"  : round(self.uptime_minutes, 1),
            "timestamp"       : ts(),
        }


def run_aerator_monitor():
    simulators = {pid: AeratorSimulator(pid) for pid in POND_IDS}

    client = make_client(client_id="aerator-monitor", receive_maximum=16)
    connect_v5(
        client,
        host=BROKER_HOST,
        port=BROKER_PORT,
        lwt_topic=Topics.ALERT_CRITICAL,
        lwt_payload={
            "device": "aerator-monitor-all",
            "status": "OFFLINE",
            "message": "Aerator monitor process died. Manual check required!",
            "timestamp": ts(),
        },
        lwt_qos=1,
    )
    client.loop_start()
    logger.info("Aerator Monitor started")

    try:
        while True:
            for pond_id, sim in simulators.items():
                data = sim.tick()

                props = make_publish_props(
                    expiry_seconds=60,
                    user_props={"pond_id": pond_id, "device_id": f"aerator-{pond_id}"},
                )

                for topic_tmpl in [Topics.AERATOR_STATUS, Topics.AERATOR_POWER]:
                    topic = Topics.fmt(topic_tmpl, pond_id=pond_id)
                    field = "status" if "status" in topic_tmpl else "power_consumption"
                    payload = json.dumps({
                        "pond_id": pond_id,
                        field: data[field],
                        "timestamp": data["timestamp"],
                    })
                    client.publish(topic, payload, qos=1, retain=True, properties=props)

                if data["status"] in ("offline", "error"):
                    # Publish a critical alert as well
                    alert = {
                        "pond_id": pond_id,
                        "device": f"aerator-{pond_id}",
                        "status": data["status"],
                        "severity": "critical",
                        "message": f"Aerator on {pond_id} is {data['status']}! Immediate action required.",
                        "timestamp": ts(),
                    }
                    client.publish(
                        Topics.ALERT_CRITICAL,
                        json.dumps(alert),
                        qos=1,
                        retain=False,
                    )

                logger.info(f"[AERATOR] {pond_id} → {data['status']} | {data['power_consumption']}W")
            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("Aerator Monitor stopping")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run_aerator_monitor()
