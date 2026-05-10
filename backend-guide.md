# Smart Catfish Farm — Backend Implementation Guide

> **Stack:** Python 3.11+ · paho-mqtt 2.x · EMQX 5.x · MQTT v5  
> **Scope:** Broker setup, Publishers (5), Subscribers (4), Request-Response, Flow Control

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Dependencies & Installation](#2-dependencies--installation)
3. [EMQX Broker Setup](#3-emqx-broker-setup)
4. [Shared Configuration (`config/settings.py`)](#4-shared-configuration)
5. [MQTT v5 Helper (`config/mqtt_helpers.py`)](#5-mqtt-v5-helper)
6. [Publisher 1 — Water Quality Sensor](#6-publisher-1--water-quality-sensor)
7. [Publisher 2 — Aerator Monitor](#7-publisher-2--aerator-monitor)
8. [Publisher 3 — Auto Feeder](#8-publisher-3--auto-feeder)
9. [Publisher 4 — Feed Stock Monitor](#9-publisher-4--feed-stock-monitor)
10. [Publisher 5 — Farm Operator](#10-publisher-5--farm-operator)
11. [Subscriber 1 — Alert System (Shared Subscription)](#11-subscriber-1--alert-system)
12. [Subscriber 2 — Farm Log System](#12-subscriber-2--farm-log-system)
13. [Request-Response Pattern](#13-request-response-pattern)
14. [Flow Control](#14-flow-control)
15. [Running the System](#15-running-the-system)
16. [MQTT v5 Feature Coverage Checklist](#16-mqtt-v5-feature-checklist)

---

## 1. Project Structure

```
smart-catfish-farm/
├── broker/
│   └── emqx.conf                  # EMQX override config
├── config/
│   ├── settings.py                # Topics, constants, pond list
│   └── mqtt_helpers.py            # Reusable MQTT v5 utilities
├── publishers/
│   ├── water_quality_sensor.py
│   ├── aerator_monitor.py
│   ├── auto_feeder.py
│   ├── feed_stock_monitor.py
│   └── farm_operator.py
├── subscribers/
│   ├── alert_system.py            # instance 1 & 2 via arg
│   └── farm_log.py
├── request_response/
│   ├── pond_status_requester.py   # Owner queries a specific pond
│   └── pond_status_responder.py   # Responds to on-demand queries
├── dashboard/                     # (see Frontend Guide)
├── logs/                          # Auto-created at runtime
├── run_all.sh                     # Launch everything
└── requirements.txt
```

---

## 2. Dependencies & Installation

```bash
# requirements.txt
paho-mqtt>=2.0.0
python-dotenv>=1.0.0
loguru>=0.7.0
```

```bash
pip install -r requirements.txt
```

> **MQTT v5 note:** paho-mqtt 2.x changed the API. Always pass `protocol=mqtt.MQTTv5` and use the `CallbackAPIVersion.VERSION2` enum.

---

## 3. EMQX Broker Setup

### 3.1 Install EMQX (Linux / Docker)

```bash
# Docker (recommended for dev)
docker run -d --name emqx `
  -p 1883:1883 `
  -p 8083:8083 `
  -p 18083:18083 `
  -v "${PWD}\broker\emqx.conf:/opt/emqx/etc/emqx.conf" `
  emqx/emqx:5.6.0
```

### 3.2 Verify via EMQX Dashboard

Open `http://localhost:18083` → creds: admin:public

Ensure the following are active:
- **Listeners** → mqtt:tcp:1883 ✅ · ws:ws:8083 ✅
- **MQTT v5** → enabled (default in EMQX 5.x)
- **Shared subscriptions** → enabled (default)

### 3.3 Custom Config (`broker/emqx.conf`)

```hocon
## broker/emqx.conf
## Mount this into your Docker container or place in /etc/emqx/

mqtt {
  max_packet_size = 1MB
  max_clientid_len = 128
  session_expiry_interval = 7200s   # 2 hours session persistence
  retain_available = true
  wildcard_subscription = true
  shared_subscription = true
  max_topic_alias = 64              # per connection
  response_information = "farm-response"
}

listener.tcp.default {
  bind = "0.0.0.0:1883"
  max_connections = 1024
  # Flow control: max inflight per connection
  max_inflight = 32
}

listener.ws.default {
  bind = "0.0.0.0:8083"
  websocket.mqtt_path = "/mqtt"
}
```

---

## 4. Shared Configuration

```python
# config/settings.py

BROKER_HOST = "localhost"
BROKER_PORT = 1883
WS_PORT     = 8083

# ── Pond list ──────────────────────────────────────────────
POND_IDS = [f"P{str(i).zfill(2)}" for i in range(1, 11)]  # P01 … P10

# ── Normal operating parameters for catfish ───────────────
WATER_PARAMS = {
    "do_min"      : 4.0,   # mg/L  — below triggers critical alert
    "do_max"      : 8.0,
    "do_warn_low" : 5.0,   # early warning threshold
    "temp_min"    : 26.0,  # °C
    "temp_max"    : 30.0,
    "temp_warn_hi": 31.5,
    "temp_warn_lo": 25.0,
    "ph_min"      : 7.0,
    "ph_max"      : 8.0,
    "ammonia_max" : 0.05,  # mg/L
    "turbidity_max": 30.0, # NTU
}

FEED_SCHEDULE = ["06:00", "12:00", "18:00"]
FEED_PER_MEAL_KG = 0.5    # per pond per meal
FEED_STOCK_INITIAL_KG = 100.0
FEED_WARN_DAYS = 3

# ── Topic templates ────────────────────────────────────────
class Topics:
    # Water quality
    WATER_DO          = "farm/pond/{pond_id}/water/do"
    WATER_TEMP        = "farm/pond/{pond_id}/water/temperature"
    WATER_PH          = "farm/pond/{pond_id}/water/ph"
    WATER_AMMONIA     = "farm/pond/{pond_id}/water/ammonia"
    WATER_TURBIDITY   = "farm/pond/{pond_id}/water/turbidity"
    WATER_ALL         = "farm/pond/{pond_id}/water/all"  # bundled publish

    # Aerator
    AERATOR_STATUS    = "farm/pond/{pond_id}/aerator/status"
    AERATOR_POWER     = "farm/pond/{pond_id}/aerator/power"

    # Feeder
    FEEDER_SCHEDULE   = "farm/pond/{pond_id}/feeder/schedule"
    FEEDER_DISPENSED  = "farm/pond/{pond_id}/feeder/dispensed"
    FEEDER_STATUS     = "farm/pond/{pond_id}/feeder/status"
    FEEDER_REMAINING  = "farm/pond/{pond_id}/feeder/remaining"

    # Storage
    FEED_STOCK        = "farm/storage/feed_stock"
    FEED_EST_DAYS     = "farm/storage/feed_estimated_days"

    # Health / cycle (Farm Operator)
    HEALTH_MORTALITY  = "farm/pond/{pond_id}/health/mortality"
    HEALTH_BEHAVIOR   = "farm/pond/{pond_id}/health/behavior"
    HEALTH_TREATMENT  = "farm/pond/{pond_id}/health/treatment"
    CYCLE_STATUS      = "farm/pond/{pond_id}/cycle/status"
    CYCLE_WEIGHT      = "farm/pond/{pond_id}/cycle/weight_sample"

    # Alerts
    ALERT_CRITICAL    = "farm/alerts/critical"
    ALERT_WARNING     = "farm/alerts/warning"
    ALERT_ALL         = "farm/alerts/#"

    # Request-Response
    REQ_POND_STATUS   = "farm/request/pond_status/{pond_id}"
    RESP_POND_STATUS  = "farm/response/pond_status/{pond_id}/{correlation_id}"

    @staticmethod
    def fmt(template: str, **kwargs) -> str:
        return template.format(**kwargs)
```

---

## 5. MQTT v5 Helper

```python
# config/mqtt_helpers.py
"""
Reusable utilities for MQTT v5 connections with paho-mqtt 2.x
"""

import json
import time
import uuid
import paho.mqtt.client as mqtt
from paho.mqtt.properties import Properties
from paho.mqtt.packettypes import PacketTypes
from loguru import logger


def make_client(
    client_id: str,
    receive_maximum: int = 20,      # Flow Control: max in-flight QoS 1/2 messages
) -> mqtt.Client:
    """
    Create a pre-configured MQTT v5 client.
    Always call connect_v5() on the returned client.
    """
    client = mqtt.Client(
        client_id=client_id,
        protocol=mqtt.MQTTv5,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )

    # Flow Control: declare how many in-flight messages we can handle
    connect_props = Properties(PacketTypes.CONNECT)
    connect_props.ReceiveMaximum = receive_maximum
    client._connect_properties = connect_props  # stored for use in connect()

    client.on_log = lambda c, u, level, buf: logger.trace(f"[{client_id}] {buf}")
    return client


def connect_v5(
    client: mqtt.Client,
    host: str,
    port: int,
    keepalive: int = 60,
    lwt_topic: str | None = None,
    lwt_payload: dict | None = None,
    lwt_qos: int = 1,
) -> None:
    """
    Connect with MQTT v5 options including optional LWT.
    """
    if lwt_topic and lwt_payload:
        client.will_set(
            topic=lwt_topic,
            payload=json.dumps(lwt_payload),
            qos=lwt_qos,
            retain=False,
        )

    props = getattr(client, "_connect_properties", Properties(PacketTypes.CONNECT))
    client.connect(host, port, keepalive=keepalive, properties=props)


def make_publish_props(
    expiry_seconds: int | None = None,
    user_props: dict | None = None,
    response_topic: str | None = None,
    correlation_data: str | None = None,
) -> Properties:
    """
    Build MQTT v5 PUBLISH properties.
    """
    props = Properties(PacketTypes.PUBLISH)

    if expiry_seconds is not None:
        props.MessageExpiryInterval = expiry_seconds

    if user_props:
        for k, v in user_props.items():
            props.UserProperty = (str(k), str(v))

    if response_topic:
        props.ResponseTopic = response_topic

    if correlation_data:
        props.CorrelationData = correlation_data.encode()

    return props


def ts() -> str:
    """Current ISO timestamp."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def new_correlation_id() -> str:
    return str(uuid.uuid4())[:8]
```

---

## 6. Publisher 1 — Water Quality Sensor

### Features used
`QoS 1` · `Retain` · `Message Expiry` · `User Properties` · `Topic Alias` · `LWT`

```python
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
```

---

## 7. Publisher 2 — Aerator Monitor

### Features used
`QoS 1` · `Retain` · `Message Expiry (60s)` · `LWT` (most critical publisher)

```python
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
```

---

## 8. Publisher 3 — Auto Feeder

### Features used
`QoS 1 & 2` · `Retain` · `User Properties` · `LWT`

```python
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
```

---

## 9. Publisher 4 — Feed Stock Monitor

### Features used
`QoS 1` · `Retain` · Subscribes to `feeder/dispensed` to track consumption

```python
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


def run_feed_stock_monitor():
    global stock_kg

    client = make_client(client_id="feed-stock-monitor", receive_maximum=8)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)

    def on_message(c, u, msg, props=None):
        global stock_kg
        try:
            data = json.loads(msg.payload)
            dispensed = float(data.get("dispensed_kg", 0))
            stock_kg = max(0.0, stock_kg - dispensed)
            logger.debug(f"[STOCK] Deducted {dispensed}kg. Remaining: {round(stock_kg, 2)}kg")
            _publish_stock(c)
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"[STOCK] Bad dispensed payload: {e}")

    client.on_message = on_message
    client.loop_start()

    # Subscribe to all dispensed events
    dispensed_wildcard = "farm/pond/+/feeder/dispensed"
    client.subscribe(dispensed_wildcard, qos=1)
    logger.info(f"Feed Stock Monitor subscribed to {dispensed_wildcard}")

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
```

---

## 10. Publisher 5 — Farm Operator

### Features used
`QoS 2` · `User Properties`

```python
# publishers/farm_operator.py
"""
Farm Operator — manual input terminal.
Data is always QoS 2 (critical business records).
User Properties carry operator context.
"""

import json
import paho.mqtt.client as mqtt

from config.settings import BROKER_HOST, BROKER_PORT, POND_IDS, Topics
from config.mqtt_helpers import make_client, connect_v5, make_publish_props, ts
from loguru import logger


def _input_pond_id() -> str:
    while True:
        pond_id = input(f"  Pond ID {POND_IDS}: ").strip().upper()
        if pond_id in POND_IDS:
            return pond_id
        print("  Invalid pond ID.")


def report_mortality(client: mqtt.Client, operator_id: str, cycle_day: int):
    pond_id = _input_pond_id()
    dead_count = int(input("  Dead count: "))
    cause = input("  Cause (disease/hypoxia/unknown): ").strip()

    payload = json.dumps({
        "pond_id"   : pond_id,
        "dead_count": dead_count,
        "cause"     : cause,
        "timestamp" : ts(),
    })
    props = make_publish_props(user_props={
        "operator_id": operator_id,
        "pond_id"    : pond_id,
        "cycle_day"  : str(cycle_day),
    })
    topic = Topics.fmt(Topics.HEALTH_MORTALITY, pond_id=pond_id)
    client.publish(topic, payload, qos=2, properties=props)
    logger.success(f"Mortality report published for {pond_id}: {dead_count} fish")


def report_weight_sample(client: mqtt.Client, operator_id: str, cycle_day: int):
    pond_id = _input_pond_id()
    sample_count = int(input("  Sample count: "))
    avg_weight_g = float(input("  Avg weight (gram): "))
    fish_count = int(input("  Est. total fish count: "))
    biomass_kg = (avg_weight_g / 1000) * fish_count

    payload = json.dumps({
        "pond_id"                : pond_id,
        "sample_count"           : sample_count,
        "avg_weight_gram"        : avg_weight_g,
        "estimated_total_biomass": round(biomass_kg, 2),
        "timestamp"              : ts(),
    })
    props = make_publish_props(user_props={
        "operator_id": operator_id,
        "pond_id"    : pond_id,
        "cycle_day"  : str(cycle_day),
    })
    client.publish(
        Topics.fmt(Topics.CYCLE_WEIGHT, pond_id=pond_id),
        payload, qos=2, properties=props,
    )
    logger.success(f"Weight sample published: {pond_id} avg={avg_weight_g}g biomass≈{biomass_kg:.1f}kg")


def update_cycle_status(client: mqtt.Client, operator_id: str, cycle_day: int):
    pond_id = _input_pond_id()
    statuses = ["empty", "stocking", "growing", "harvest-ready"]
    status = input(f"  Status {statuses}: ").strip()
    fish_count = int(input("  Fish count: "))

    payload = json.dumps({
        "pond_id"   : pond_id,
        "status"    : status,
        "fish_count": fish_count,
        "cycle_day" : cycle_day,
        "timestamp" : ts(),
    })
    props = make_publish_props(user_props={"operator_id": operator_id, "pond_id": pond_id})
    client.publish(
        Topics.fmt(Topics.CYCLE_STATUS, pond_id=pond_id),
        payload, qos=2, properties=props,
    )
    logger.success(f"Cycle status updated: {pond_id} → {status}")


MENU = {
    "1": ("Report mortality",     report_mortality),
    "2": ("Weight sample",        report_weight_sample),
    "3": ("Update cycle status",  update_cycle_status),
    "0": ("Exit", None),
}


def run_farm_operator(operator_id: str = "OP-001", cycle_day: int = 1):
    client = make_client(client_id=f"farm-operator-{operator_id}", receive_maximum=4)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)
    client.loop_start()
    logger.info(f"Farm Operator terminal started ({operator_id})")

    try:
        while True:
            print("\n── Farm Operator Menu ──────────────────")
            for k, (label, _) in MENU.items():
                print(f"  [{k}] {label}")
            choice = input("Choice: ").strip()

            if choice == "0":
                break
            if choice in MENU and MENU[choice][1]:
                try:
                    MENU[choice][1](client, operator_id, cycle_day)
                except (ValueError, KeyboardInterrupt) as e:
                    logger.error(f"Input error: {e}")
            else:
                print("Invalid choice.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run_farm_operator(operator_id="OP-001", cycle_day=14)
```

---

## 11. Subscriber 1 — Alert System

### Features used
`Shared Subscription` · `Wildcard` · QoS 1

```python
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
```

---

## 12. Subscriber 2 — Farm Log System

### Features used
`Wildcard (+, #)` · QoS 1 · structured file logging

```python
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
```

---

## 13. Request-Response Pattern

### Features used
`ResponseTopic` · `CorrelationData` (MQTT v5 only)

### Responder (server side — always running)

```python
# request_response/pond_status_responder.py
"""
Listens for on-demand pond status requests.
Responds directly to the ResponseTopic specified in the request.
Uses CorrelationData to match responses to requests.
"""

import json
import paho.mqtt.client as mqtt
from paho.mqtt.properties import Properties
from paho.mqtt.packettypes import PacketTypes

from config.settings import BROKER_HOST, BROKER_PORT, Topics
from config.mqtt_helpers import make_client, connect_v5, ts
from loguru import logger

# In-memory cache of latest readings per pond (populated from subscriptions)
pond_cache: dict[str, dict] = {}


def run_responder():
    client = make_client(client_id="pond-status-responder", receive_maximum=8)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)

    def on_connect(c, u, flags, reason_code, props):
        if reason_code == 0:
            # Cache all current pond data
            c.subscribe("farm/pond/+/water/all",      qos=1)
            c.subscribe("farm/pond/+/aerator/status", qos=1)
            c.subscribe("farm/pond/+/feeder/status",  qos=1)
            # Listen for requests (wildcard for any pond)
            c.subscribe("farm/request/pond_status/+", qos=1)
            logger.info("Pond Status Responder ready")

    def on_message(c, u, msg, props=None):
        topic_parts = msg.topic.split("/")

        # ── Cache incoming data ──────────────────────────────────────────────
        if "request" not in topic_parts:
            try:
                data = json.loads(msg.payload)
                pond_id = data.get("pond_id")
                if pond_id:
                    if pond_id not in pond_cache:
                        pond_cache[pond_id] = {}
                    # Merge by topic type
                    if "water" in topic_parts:
                        pond_cache[pond_id]["water"] = data
                    elif "aerator" in topic_parts:
                        pond_cache[pond_id]["aerator"] = data
                    elif "feeder" in topic_parts:
                        pond_cache[pond_id]["feeder"] = data
            except json.JSONDecodeError:
                pass
            return

        # ── Handle request ───────────────────────────────────────────────────
        pond_id = topic_parts[-1]  # farm/request/pond_status/{pond_id}

        if not props or not hasattr(props, "ResponseTopic") or not props.ResponseTopic:
            logger.warning(f"Request without ResponseTopic from {msg.topic}")
            return

        response_topic = props.ResponseTopic
        correlation_data = getattr(props, "CorrelationData", b"")

        cached = pond_cache.get(pond_id, {})
        response = {
            "pond_id"  : pond_id,
            "water"    : cached.get("water", {"status": "no_data"}),
            "aerator"  : cached.get("aerator", {"status": "no_data"}),
            "feeder"   : cached.get("feeder", {"status": "no_data"}),
            "timestamp": ts(),
        }

        resp_props = Properties(PacketTypes.PUBLISH)
        if correlation_data:
            resp_props.CorrelationData = correlation_data

        c.publish(
            response_topic,
            json.dumps(response),
            qos=1,
            properties=resp_props,
        )
        logger.info(f"Responded to status request for {pond_id} → {response_topic}")

    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_forever()


if __name__ == "__main__":
    run_responder()
```

### Requester (owner / operator trigger)

```python
# request_response/pond_status_requester.py
"""
Owner sends an on-demand status request for a specific pond.
Uses ResponseTopic and CorrelationData for proper correlation.
"""

import json
import time
import sys
import paho.mqtt.client as mqtt
from paho.mqtt.properties import Properties
from paho.mqtt.packettypes import PacketTypes

from config.settings import BROKER_HOST, BROKER_PORT, POND_IDS, Topics
from config.mqtt_helpers import make_client, connect_v5, make_publish_props, new_correlation_id, ts
from loguru import logger

received_responses: dict[str, dict] = {}


def request_pond_status(pond_id: str, timeout: float = 5.0) -> dict | None:
    """
    Send a pond status request and wait for response.
    Returns the response dict or None on timeout.
    """
    correlation_id = new_correlation_id()
    response_topic = Topics.fmt(Topics.RESP_POND_STATUS,
                                pond_id=pond_id,
                                correlation_id=correlation_id)

    client = make_client(client_id=f"requester-{correlation_id}", receive_maximum=4)
    connect_v5(client, host=BROKER_HOST, port=BROKER_PORT)

    response_holder: list[dict] = []

    def on_connect(c, u, flags, reason_code, props):
        if reason_code == 0:
            c.subscribe(response_topic, qos=1)

    def on_message(c, u, msg, props=None):
        try:
            data = json.loads(msg.payload)
            # Verify CorrelationData matches
            if props and hasattr(props, "CorrelationData"):
                received_cid = props.CorrelationData.decode()
                if received_cid != correlation_id:
                    return
            response_holder.append(data)
        except json.JSONDecodeError:
            pass

    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_start()

    # Small wait for subscribe to complete
    time.sleep(0.3)

    # Publish request with ResponseTopic + CorrelationData
    req_props = Properties(PacketTypes.PUBLISH)
    req_props.ResponseTopic   = response_topic
    req_props.CorrelationData = correlation_id.encode()

    request_topic = Topics.fmt(Topics.REQ_POND_STATUS, pond_id=pond_id)
    client.publish(
        request_topic,
        json.dumps({"pond_id": pond_id, "requested_at": ts()}),
        qos=1,
        properties=req_props,
    )
    logger.info(f"Status request sent for {pond_id} (correlation={correlation_id})")

    # Wait for response
    deadline = time.time() + timeout
    while time.time() < deadline:
        if response_holder:
            client.loop_stop()
            client.disconnect()
            return response_holder[0]
        time.sleep(0.1)

    client.loop_stop()
    client.disconnect()
    logger.warning(f"No response for {pond_id} within {timeout}s")
    return None


if __name__ == "__main__":
    pond_id = sys.argv[1] if len(sys.argv) > 1 else "P01"
    result = request_pond_status(pond_id)
    if result:
        print(json.dumps(result, indent=2))
    else:
        print("No response received.")
```

---

## 14. Flow Control

MQTT v5 Flow Control is implemented via `ReceiveMaximum` at the CONNECT level. Each client declares the maximum number of in-flight QoS 1/2 messages it can handle simultaneously.

### How it's applied

| Client | `ReceiveMaximum` | Reason |
|--------|-----------------|--------|
| Water Quality Sensor | 16 | Publishes fast to many ponds |
| Aerator Monitor | 16 | Medium throughput |
| Auto Feeder | 16 | Mix of QoS 1 and 2 |
| Feed Stock Monitor | 8 | Low-frequency events |
| Farm Operator | 4 | Human-speed input |
| Alert System x2 | 32 | Receives from all ponds |
| Farm Log | 64 | Archives everything |
| Responder | 8 | Request-response only |

### Implementation (already in `make_client`)

```python
# config/mqtt_helpers.py — excerpt showing ReceiveMaximum

def make_client(client_id: str, receive_maximum: int = 20) -> mqtt.Client:
    client = mqtt.Client(
        client_id=client_id,
        protocol=mqtt.MQTTv5,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    connect_props = Properties(PacketTypes.CONNECT)
    connect_props.ReceiveMaximum = receive_maximum   # <── Flow Control
    client._connect_properties = connect_props
    return client
```

The broker (EMQX) respects this value and will not send more than `ReceiveMaximum` unacknowledged messages to the client at once. If a publisher tries to push more, EMQX queues them.

---

## 15. Running the System

### Launch script (`run_all.sh`)

```bash
#!/bin/bash
# run_all.sh — start all components

LOG_DIR="logs"
mkdir -p $LOG_DIR

echo "Starting Smart Catfish Farm system..."

# ── Subscribers (start first so nothing is missed) ───────────
python -m subscribers.alert_system 1 &
sleep 0.5
python -m subscribers.alert_system 2 &
sleep 0.5
python -m subscribers.farm_log &
sleep 0.5

# ── Request-Response Responder ────────────────────────────────
python -m request_response.pond_status_responder &
sleep 0.5

# ── Publishers ────────────────────────────────────────────────
python -m publishers.feed_stock_monitor &   # starts first to catch dispense events
sleep 1

python -m publishers.water_quality_sensor &
python -m publishers.aerator_monitor &
python -m publishers.auto_feeder &

echo ""
echo "All services started. Press Ctrl+C to stop."
echo "Run farm operator manually: python -m publishers.farm_operator"
echo "Run pond status query:      python -m request_response.pond_status_requester P03"

wait
```

```bash
chmod +x run_all.sh
./run_all.sh
```

### Stopping all processes

```bash
pkill -f "python -m publishers"
pkill -f "python -m subscribers"
pkill -f "python -m request_response"
```

---

## 16. MQTT v5 Feature Checklist

| Feature | Where | Status |
|---------|-------|--------|
| **QoS 0** | Turbidity (optional, low-priority) | ✅ |
| **QoS 1** | DO, aerator, feeder status, alerts | ✅ |
| **QoS 2** | Feed schedule, mortality, cycle updates | ✅ |
| **Retain** | Water quality, aerator status, feed stock, feeder remaining | ✅ |
| **Message Expiry** | Water (30s), Aerator (60s) | ✅ |
| **LWT** | Water sensor, Aerator monitor, Auto feeder | ✅ |
| **Topic Alias** | Water quality sensor (high-frequency, many ponds) | ✅ |
| **User Properties** | Water sensor, feeder, farm operator | ✅ |
| **Shared Subscription** | Alert system ×2 (`$share/alert-group/`) | ✅ |
| **Wildcard `+`** | Per-pond alert sub, log system | ✅ |
| **Wildcard `#`** | Dashboard `farm/#`, log `farm/alerts/#` | ✅ |
| **Request-Response** | `ResponseTopic` + `CorrelationData` | ✅ |
| **Flow Control** | `ReceiveMaximum` on every client | ✅ |

---

*End of Backend Guide*
