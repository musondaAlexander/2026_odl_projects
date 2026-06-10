"""Seed users + two sensor nodes."""
from app.db import Base, engine, SessionLocal
from app.auth import hash_password
from app.models import SensorNode, User

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for email, name, role in [
    ("admin@farm.zm", "Irrigation Admin", "admin"),
    ("farmer@farm.zm", "Farmer Muleya", "farmer"),
    ("viewer@farm.zm", "Agronomist", "viewer"),
]:
    if not db.query(User).filter(User.email == email).first():
        db.add(User(name=name, email=email, role=role, password_hash=hash_password("password123")))
for nid, crop in [("field-1", "Maize"), ("field-2", "Tomatoes")]:
    if not db.query(SensorNode).filter(SensorNode.node_id == nid).first():
        db.add(SensorNode(node_id=nid, name=nid, crop=crop, lower_moisture=30, upper_moisture=60))
db.commit()
print("Seed complete. Logins (password123): admin@farm.zm / farmer@farm.zm / viewer@farm.zm")
