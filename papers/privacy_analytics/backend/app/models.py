"""Persistence: user accounts, anonymisation-job metadata, and audit records.
Raw dataset rows are NEVER persisted (security NFR) — only metadata/config/audit.
"""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, JSON

from .db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="analyst")  # analyst | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnonymizationJob(Base):
    __tablename__ = "anonymization_jobs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    dataset_name = Column(String(255))
    classification = Column(JSON)  # column -> role
    epsilon = Column(String(20))
    k = Column(Integer)
    records_in = Column(Integer)
    records_out = Column(Integer)
    records_suppressed = Column(Integer)
    information_loss = Column(String(20))
    k_compliant = Column(Boolean)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    action = Column(String(60))
    detail = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
