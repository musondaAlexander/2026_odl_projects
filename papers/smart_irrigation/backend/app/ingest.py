"""Reading ingestion: persist a reading, run the threshold engine, update pump
state, log the irrigation decision. Shared by the HTTP endpoint and the MQTT
subscriber so both transports behave identically.
"""
from datetime import datetime

from sqlalchemy.orm import Session

from .models import IrrigationEvent, Reading, SensorNode
from .threshold import decide


def process_reading(db: Session, node_id: str, payload: dict) -> dict:
    node = db.query(SensorNode).filter(SensorNode.node_id == node_id).first()
    if node is None:
        node = SensorNode(node_id=node_id, name=node_id)
        db.add(node); db.flush()

    reading = Reading(
        node_id=node_id,
        soil_moisture=payload.get("soil_moisture"),
        temperature=payload.get("temperature"),
        humidity=payload.get("humidity"),
        rainfall=payload.get("rainfall"),
        ts=datetime.utcnow(),
    )
    db.add(reading)

    decision = decide(
        soil_moisture=payload.get("soil_moisture", 100),
        lower=node.lower_moisture, upper=node.upper_moisture,
        pump_currently_on=node.pump_on, override=node.manual_override,
    )
    changed = node.pump_on != decision.pump_on
    node.pump_on = decision.pump_on
    node.last_seen = datetime.utcnow()

    if changed or decision.action != "hold":
        db.add(IrrigationEvent(node_id=node_id, action=decision.action, pump_on=decision.pump_on,
                               reason=decision.reason, manual=node.manual_override is not None))
    db.commit()

    return {
        "node_id": node_id,
        "reading": {"soil_moisture": reading.soil_moisture, "temperature": reading.temperature,
                    "humidity": reading.humidity, "rainfall": reading.rainfall,
                    "ts": reading.ts.isoformat()},
        "pump_on": node.pump_on, "action": decision.action, "reason": decision.reason,
        "pump_changed": changed,
    }
