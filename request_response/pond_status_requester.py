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
