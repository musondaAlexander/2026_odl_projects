"""Simulated field sensor node(s).

Publishes soil-moisture/temperature/humidity/rainfall readings. Soil moisture
drifts DOWN (drying) over time and jumps back up when the pump is on (irrigation),
so the threshold engine visibly cycles the pump.

  python sensor_node.py                 # publish via MQTT to farm/<node>/readings
  python sensor_node.py --http URL      # POST to the API /api/ingest instead (no broker)
"""
import argparse
import json
import random
import sys
import time

NODES = ["field-1", "field-2"]


def step(state):
    # Drift moisture down; if pumping (low), bump it up.
    for n in NODES:
        m = state[n]["soil"]
        if m < state[n]["lower"]:
            state[n]["pumping"] = True
        if m >= state[n]["upper"]:
            state[n]["pumping"] = False
        m += 6 if state[n]["pumping"] else -3
        state[n]["soil"] = max(5, min(95, m + random.uniform(-1, 1)))
    return state


def reading(node, state):
    return {
        "node_id": node,
        "soil_moisture": round(state[node]["soil"], 1),
        "temperature": round(random.uniform(22, 34), 1),
        "humidity": round(random.uniform(40, 80), 1),
        "rainfall": round(random.choice([0, 0, 0, 0.2, 1.0]), 1),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--http", help="POST readings to this API base URL instead of MQTT")
    ap.add_argument("--count", type=int, default=20)
    ap.add_argument("--interval", type=float, default=1.0)
    args = ap.parse_args()

    state = {n: {"soil": 50.0, "lower": 30, "upper": 60, "pumping": False} for n in NODES}

    if args.http:
        import urllib.request
        url = args.http.rstrip("/") + "/api/ingest"
        for _ in range(args.count):
            step(state)
            for n in NODES:
                data = json.dumps(reading(n, state)).encode()
                req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
                try:
                    urllib.request.urlopen(req, timeout=5).read()
                except Exception as e:
                    print("POST failed:", e)
            print("published", {n: round(state[n]["soil"], 1) for n in NODES})
            time.sleep(args.interval)
        return

    import paho.mqtt.client as mqtt
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect("localhost", 1883, 60)
    client.loop_start()
    for _ in range(args.count):
        step(state)
        for n in NODES:
            client.publish(f"farm/{n}/readings", json.dumps(reading(n, state)), qos=1)
        print("published", {n: round(state[n]["soil"], 1) for n in NODES})
        time.sleep(args.interval)
    client.loop_stop()


if __name__ == "__main__":
    main()
