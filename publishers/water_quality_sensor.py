# publishers/water_quality_sensor.py
"""
Simulates water quality sensors for all ponds.
- Cycles through all ponds every 5 seconds
- Uses Topic Alias to compress repeated topic strings
- Occasionally injects anomalies (DO drop, ammonia spike, temperature extremes)
"""

import json
import random
import time
import paho.mqtt.client as mqtt
from paho.mqtt.properties import Properties
from paho.mqtt.packettypes import PacketTypes

from config.settings import BROKER_HOST, BROKER_PORT, POND_IDS, WATER_PARAMS, Topics
from config.mqtt_helpers import make_client, connect_v5, make_publish_props, ts
from loguru import logger

# ── Topic Alias mapping (must be established once per connection) ──────────────
# Alias numbers 1..N map to full topic strings
ALIAS_MAP: dict[str, int] = {}
ALIAS_COUNTER = 1


def _get_or_register_alias(client: mqtt.Client, topic: str) -> tuple[str, Properties]:
    """
    Return (publish_topic, props) where:
    - First publish for a topic: sends full topic + alias registration
    - Subsequent: sends empty topic string, alias only (bandwidth saving)
    """
    global ALIAS_COUNTER

    props = Properties(PacketTypes.PUBLISH)
    props.MessageExpiryInterval = 30  # data considered stale after 30s

    if topic not in ALIAS_MAP:
        alias = ALIAS_COUNTER
        ALIAS_MAP[topic] = alias
        ALIAS_COUNTER += 1
        props.TopicAlias = alias
        logger.debug(f"Registering Topic Alias {alias} → {topic}")
        return topic, props  # first time: send full topic
    else:
        props.TopicAlias = ALIAS_MAP[topic]
        return "", props  # broker already knows the alias


# ── Anomaly simulation state ───────────────────────────────────────────────────
class AnomalyState:
    def __init__(self):
        self.do_drop_ponds: set[str] = set()      # ponds with low DO
        self.ammonia_ponds: dict[str, float] = {}  # pond → current ammonia
        self.temp_spike_ponds: set[str] = set()

    def maybe_inject(self, pond_id: str):
        """Randomly start or recover anomalies."""
        r = random.random()
        if r < 0.005 and pond_id not in self.do_drop_ponds:
            self.do_drop_ponds.add(pond_id)
            logger.warning(f"[ANOMALY] DO drop started on {pond_id}")
        elif r < 0.003 and pond_id in self.do_drop_ponds:
            self.do_drop_ponds.discard(pond_id)
        if random.random() < 0.004 and pond_id not in self.temp_spike_ponds:
            self.temp_spike_ponds.add(pond_id)
        elif random.random() < 0.003:
            self.temp_spike_ponds.discard(pond_id)


anomaly = AnomalyState()


def generate_water_data(pond_id: str) -> dict:
    anomaly.maybe_inject(pond_id)

    do_val = (
        random.uniform(2.0, 3.9) if pond_id in anomaly.do_drop_ponds
        else random.uniform(WATER_PARAMS["do_min"], WATER_PARAMS["do_max"])
    )
    temp = (
        random.uniform(32.0, 35.0) if pond_id in anomaly.temp_spike_ponds
        else random.uniform(WATER_PARAMS["temp_min"], WATER_PARAMS["temp_max"])
    )

    # Ammonia creeps up and recovers slowly
    prev_ammonia = anomaly.ammonia_ponds.get(pond_id, 0.01)
    delta = random.uniform(-0.003, 0.005)
    ammonia = max(0.0, min(0.15, prev_ammonia + delta))
    anomaly.ammonia_ponds[pond_id] = ammonia

    ph  = random.uniform(WATER_PARAMS["ph_min"], WATER_PARAMS["ph_max"])
    ntu = random.uniform(5.0, 25.0)

    def status(d, t, a) -> str:
        if d < WATER_PARAMS["do_min"] or a > WATER_PARAMS["ammonia_max"] * 2:
            return "critical"
        if (d < WATER_PARAMS["do_warn_low"] or t > WATER_PARAMS["temp_warn_hi"]
                or t < WATER_PARAMS["temp_warn_lo"] or a > WATER_PARAMS["ammonia_max"]):
            return "warning"
        return "normal"

    return {
        "pond_id"    : pond_id,
        "do"         : round(do_val, 2),
        "temperature": round(temp, 1),
        "ph"         : round(ph, 2),
        "ammonia"    : round(ammonia, 4),
        "turbidity"  : round(ntu, 1),
        "status"     : status(do_val, temp, ammonia),
        "timestamp"  : ts(),
    }


def run_water_quality_sensor(cycle_day: int = 1, operator_id: str = "SYS"):
    client = make_client(
        client_id="water-quality-sensor",
        receive_maximum=16,
    )

    connect_v5(
        client,
        host=BROKER_HOST,
        port=BROKER_PORT,
        lwt_topic=Topics.ALERT_CRITICAL,
        lwt_payload={"device": "water-sensor-all", "status": "OFFLINE", "timestamp": ts()},
        lwt_qos=1,
    )
    client.loop_start()
    logger.info("Water Quality Sensor started")

    try:
        while True:
            for pond_id in POND_IDS:
                data = generate_water_data(pond_id)
                payload = json.dumps(data)

                topic_full = Topics.fmt(Topics.WATER_ALL, pond_id=pond_id)
                pub_topic, props = _get_or_register_alias(client, topic_full)

                # User Properties — metadata without polluting payload
                props.UserProperty = ("pond_id", pond_id)
                props.UserProperty = ("operator_id", operator_id)
                props.UserProperty = ("cycle_day", str(cycle_day))

                result = client.publish(
                    topic=pub_topic,
                    payload=payload,
                    qos=1,
                    retain=True,
                    properties=props,
                )
                result.wait_for_publish(timeout=5)
                logger.info(f"[WATER] {pond_id} → {data['status']} | DO={data['do']} "
                            f"T={data['temperature']} NH3={data['ammonia']}")

                time.sleep(0.5)  # stagger between ponds

    except KeyboardInterrupt:
        logger.info("Water Quality Sensor stopping")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run_water_quality_sensor(cycle_day=14, operator_id="OP-001")
