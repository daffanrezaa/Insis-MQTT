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
