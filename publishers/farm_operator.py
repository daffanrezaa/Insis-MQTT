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
