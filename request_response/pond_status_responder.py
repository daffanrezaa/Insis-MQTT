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
