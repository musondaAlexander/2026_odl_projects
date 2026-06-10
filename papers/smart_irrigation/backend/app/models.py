from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from .db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="farmer")  # farmer | admin | viewer
    is_active = Column(Boolean, default=True)


class SensorNode(Base):
    __tablename__ = "sensor_nodes"
    id = Column(Integer, primary_key=True)
    node_id = Column(String(60), unique=True, nullable=False)  # e.g. "field-1"
    name = Column(String(120))
    crop = Column(String(80))
    lower_moisture = Column(Float, default=30.0)   # % — turn pump ON below this
    upper_moisture = Column(Float, default=60.0)   # % — turn pump OFF at/above this
    pump_on = Column(Boolean, default=False)
    manual_override = Column(String(10))           # "on" | "off" | None
    last_seen = Column(DateTime)


class Reading(Base):
    __tablename__ = "readings"
    id = Column(Integer, primary_key=True)
    node_id = Column(String(60), index=True, nullable=False)
    soil_moisture = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    rainfall = Column(Float)
    ts = Column(DateTime, default=datetime.utcnow, index=True)


class IrrigationEvent(Base):
    __tablename__ = "irrigation_events"
    id = Column(Integer, primary_key=True)
    node_id = Column(String(60), index=True)
    action = Column(String(10))          # on | off | hold
    pump_on = Column(Boolean)
    reason = Column(String(200))
    manual = Column(Boolean, default=False)
    ts = Column(DateTime, default=datetime.utcnow)
