# publishers/aerator_monitor.py
"""
Aerator Monitor — most safety-critical publisher.
LWT fires if this process dies unexpectedly, signalling aerator comms failure.
Simulates random aerator failures (especially dangerous at night).
Now also subscribes to manual control commands from the Dashboard.
"""

import json
import random
import time
import paho.mqtt.client as mqtt

from config.settings import BROKER_HOST, BROKER_PORT, POND_IDS, Topics
from config.mqtt_helpers import make_client, connect_v5, make_publish_props, ts
from loguru import logger

AERATOR_STATES = ["active", "idle", "offline", "error", "boost"]


class AeratorSimulator:
    def __init__(self, pond_id: str):
        self.pond_id = pond_id
        self.status = "active"
        self.power_w = random.uniform(150, 300)
        self.uptime_minutes = 0
        self.failure_countdown = None  # None = no pending failure

    def handle_command(self, action: str):
        if action == "boost":
            self.status = "boost"
            self.power_w = random.uniform(350, 450)
            logger.success(f"[AERATOR CONTROL] {self.pond_id} switched to BOOST mode")
            # Force an immediate publish update could be done here, but tick() will handle it within 5s
        elif action == "shutdown":
            self.status = "offline"
            self.power_w = 0
            logger.warning(f"[AERATOR CONTROL] {self.pond_id} forced SHUTDOWN")

    def tick(self) -> dict:
        """Advance state by one tick (5 seconds = 1/12 minute)."""
        if self.failure_countdown is not None:
            self.failure_countdown -= 1
            if self.failure_countdown <= 0:
                self.status = "offline" if random.random() < 0.7 else "error"
                self.failure_countdown = None
        elif self.status in ("offline", "error"):
            # Auto-recover after 30–90 seconds (unless forced shutdown, but for simulation we let it recover)
            if random.random() < 0.03:
                self.status = "active"
                logger.info(f"[AERATOR] {self.pond_id} recovered")
        elif self.status not in ("boost",):
            # 0.3% chance each tick of a new failure
            if random.random() < 0.003:
                self.failure_countdown = random.randint(2, 6)
                logger.warning(f"[AERATOR] {self.pond_id} failure imminent")

        if self.status == "active":
            self.uptime_minutes += 1 / 12
            self.power_w = random.uniform(150, 300)
        elif self.status == "boost":
            self.uptime_minutes += 1 / 12
            self.power_w = random.uniform(350, 450)
            # 5% chance each tick to automatically return to normal active from boost
            if random.random() < 0.05:
                self.status = "active"
                logger.info(f"[AERATOR] {self.pond_id} boost mode ended naturally")
        else:
            self.power_w = 0

        return {
            "pond_id"         : self.pond_id,
            "status"          : self.status,
            "power_consumption": round(self.power_w, 1),
            "uptime_minutes"  : round(self.uptime_minutes, 1),
            "timestamp"       : ts(),
        }


simulators = {pid: AeratorSimulator(pid) for pid in POND_IDS}

def on_connect(client, userdata, flags, reason_code, props):
    if reason_code == 0:
        client.subscribe("farm/pond/+/aerator/control", qos=1)
        logger.info("Aerator Monitor subscribed to control topics")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload)
        topic_parts = msg.topic.split("/")
        pond_id = topic_parts[2] # farm/pond/P01/aerator/control
        action = payload.get("action")
        
        if pond_id in simulators and action:
            sim = simulators[pond_id]
            sim.handle_command(action)
            # Immediately publish updated status so frontend gets instant feedback
            props = make_publish_props(
                expiry_seconds=60,
                user_props={"pond_id": pond_id, "device_id": f"aerator-{pond_id}"},
            )
            status_payload = json.dumps({
                "pond_id": pond_id,
                "status": sim.status,
                "timestamp": ts(),
            })
            client.publish(
                Topics.fmt(Topics.AERATOR_STATUS, pond_id=pond_id),
                status_payload, qos=1, retain=True, properties=props,
            )
            power_payload = json.dumps({
                "pond_id": pond_id,
                "power_consumption": round(sim.power_w, 1),
                "timestamp": ts(),
            })
            client.publish(
                Topics.fmt(Topics.AERATOR_POWER, pond_id=pond_id),
                power_payload, qos=1, retain=True, properties=props,
            )
            logger.info(f"[AERATOR] Published immediate status update for {pond_id}: {sim.status}")
    except Exception as e:
        logger.error(f"[AERATOR] Error processing command: {e}")

def run_aerator_monitor():
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
    
    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_start()
    
    logger.info("Aerator Monitor started and listening for commands")

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
