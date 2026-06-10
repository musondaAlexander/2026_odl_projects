"""Lightweight SQLite audit of predictions — metadata ONLY (no images stored),
enabling fairness monitoring without any patient-record persistence (privacy NFR).
"""
import os
import sqlite3
from datetime import datetime

DB = os.getenv("AUDIT_DB", "predictions.sqlite")


def _conn():
    c = sqlite3.connect(DB)
    c.execute("""CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT, top_condition TEXT, confidence REAL, low_confidence INTEGER,
        fitzpatrick_group TEXT, mode TEXT)""")
    return c


def log_prediction(top_condition: str, confidence: float, low_confidence: bool,
                   fitzpatrick_group: str | None, mode: str):
    c = _conn()
    c.execute("INSERT INTO predictions (ts, top_condition, confidence, low_confidence, fitzpatrick_group, mode) "
              "VALUES (?,?,?,?,?,?)",
              (datetime.utcnow().isoformat(), top_condition, confidence, int(low_confidence),
               fitzpatrick_group, mode))
    c.commit(); c.close()


def stats():
    c = _conn()
    total = c.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
    low = c.execute("SELECT COUNT(*) FROM predictions WHERE low_confidence=1").fetchone()[0]
    by_group = c.execute("SELECT fitzpatrick_group, COUNT(*), AVG(confidence) FROM predictions "
                         "GROUP BY fitzpatrick_group").fetchall()
    c.close()
    return {"total": total, "low_confidence": low,
            "by_fitzpatrick_group": [{"group": g or "unknown", "count": n, "avg_confidence": round(a or 0, 3)}
                                     for g, n, a in by_group]}
