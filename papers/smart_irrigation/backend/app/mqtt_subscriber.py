"""MQTT subscriber bridge (proposal objective 1).

Subscribes to `farm/+/readings` on the Mosquitto broker (QoS 1), validates each
JSON payload, and feeds it through the same ingestion + threshold pipeline as the
HTTP endpoint. Run alongside the API:  python -m app.mqtt_subscriber
Requires a running broker (e.g. `docker run -p 1883:1883 eclipse-mosquitto`).
"""
import json

import paho.mqtt.client as mqtt

from .config import settings
from .db import SessionLocal
from .ingest import process_reading


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"MQTT connected ({reason_code}); subscribing to {settings.mqtt_topic}")
    client.subscribe(settings.mqtt_topic, qos=1)


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except Exception:
        print("Bad payload on", msg.topic)
        return
    # topic: farm/<node_id>/readings
    parts = msg.topic.split("/")
    node_id = parts[1] if len(parts) >= 2 else payload.get("node_id", "unknown")
    db = SessionLocal()
    try:
        result = process_reading(db, node_id, payload)
        print(f"[{node_id}] soil={payload.get('soil_moisture')} -> pump {result['pump_on']} ({result['action']})")
    finally:
        db.close()


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(settings.mqtt_host, settings.mqtt_port, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
