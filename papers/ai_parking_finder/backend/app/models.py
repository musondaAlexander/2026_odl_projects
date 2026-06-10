from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from .db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="operator")  # operator | admin
    is_active = Column(Boolean, default=True)


class Bay(Base):
    __tablename__ = "bays"
    id = Column(Integer, primary_key=True)
    bay_id = Column(String(40), unique=True, nullable=False)   # e.g. "A1"
    lat = Column(Float)            # map pin position
    lng = Column(Float)
    status = Column(String(12), default="available")           # available | occupied
    override = Column(String(12))                              # available | occupied | None
    updated_at = Column(DateTime, default=datetime.utcnow)


class OccupancyEvent(Base):
    __tablename__ = "occupancy_events"
    id = Column(Integer, primary_key=True)
    bay_id = Column(String(40), index=True)
    status = Column(String(12))
    source = Column(String(20))    # detection | override
    actor = Column(String(120))    # operator email for overrides
    ts = Column(DateTime, default=datetime.utcnow, index=True)
