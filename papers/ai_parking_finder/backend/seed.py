"""Seed operator/admin users and a grid of parking bays around a Lusaka car park."""
from app.db import Base, engine, SessionLocal
from app.auth import hash_password
from app.models import Bay, User

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for email, name, role in [
    ("admin@parking.zm", "Parking Admin", "admin"),
    ("operator@parking.zm", "Lot Operator", "operator"),
]:
    if not db.query(User).filter(User.email == email).first():
        db.add(User(name=name, email=email, role=role, password_hash=hash_password("password123")))

# A 3x4 grid of bays near Lusaka CBD (~ -15.4167, 28.2833).
base_lat, base_lng = -15.4167, 28.2833
rows, cols = 3, 4
i = 0
for r in range(rows):
    for c in range(cols):
        i += 1
        bay_id = f"{chr(ord('A') + r)}{c + 1}"
        if not db.query(Bay).filter(Bay.bay_id == bay_id).first():
            db.add(Bay(bay_id=bay_id, lat=base_lat + r * 0.00012, lng=base_lng + c * 0.00012, status="available"))
db.commit()
print(f"Seed complete: {rows * cols} bays. Logins (password123): admin@parking.zm / operator@parking.zm")
