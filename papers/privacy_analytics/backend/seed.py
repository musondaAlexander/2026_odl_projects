"""Seed an admin + analyst account."""
from app.db import Base, engine, SessionLocal
from app.auth import hash_password
from app.models import User

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for email, name, role in [
    ("admin@privacy.zm", "Privacy Admin", "admin"),
    ("analyst@privacy.zm", "Data Analyst", "analyst"),
]:
    if not db.query(User).filter(User.email == email).first():
        db.add(User(name=name, email=email, role=role, password_hash=hash_password("password123")))
db.commit()
print("Seed complete. Logins (password123): admin@privacy.zm / analyst@privacy.zm")
