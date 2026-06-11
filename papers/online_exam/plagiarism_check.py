"""Deterministic plagiarism-path verification against the running stack."""
import json, urllib.request, urllib.error
BASE = "http://127.0.0.1:8088"

def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None: req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            c = r.read(); return r.status, (json.loads(c) if c else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")

def login(email):
    s, r = call("POST", "/api/auth/login", body={"email": email, "password": "password123"})
    assert s == 200, r; return r["token"]

lec = login("lecturer@exam.zm")
s, qs = call("GET", "/api/questions", lec)
written = [q for q in qs if q["type"] == "WRITTEN"]
print("Written questions in bank:", [(q["id"], q["text"][:40]) for q in written])

# Dedicated exam whose pool is ONLY the two written questions.
s, exam = call("POST", "/api/exams", lec, body={
    "title": "Written Plagiarism Verification", "description": "written-only",
    "durationMinutes": 30, "questionCount": len(written), "plagiarismThreshold": 0.6})
eid = exam["id"]
call("POST", f"/api/exams/{eid}/questions", lec, body={"questionIds": [q["id"] for q in written]})
call("POST", f"/api/exams/{eid}/publish?published=true", lec)
print(f"Created written-only exam {eid}, pool={len(written)}, published")

stu = login("student2@exam.zm")
s, att = call("POST", f"/api/exams/{eid}/start", stu)
aid = att["attemptId"]
for q in att["questions"]:
    t = q["text"].lower()
    if "photosynthesis" in t:
        resp = ("Photosynthesis converts sunlight into chemical energy in plant cells, producing "
                "glucose and oxygen from carbon dioxide and water using the green pigment chlorophyll.")
    else:  # normalization -> deliberately original / unrelated wording
        resp = "Keeping spreadsheets neat so the same fact is not typed in twice helps avoid mistakes."
    call("POST", f"/api/attempts/{aid}/answer", stu, body={"questionId": q["questionId"], "response": resp})

s, res = call("POST", f"/api/attempts/{aid}/submit", stu)
print("\n--- RESULT ---")
flagged_seen, clear_seen = False, False
for a in res["answers"]:
    p = a["plagiarism"]
    kind = "photosynthesis(copied)" if "photosynthesis" in a["questionText"].lower() else "normalization(original)"
    print(f"  {kind:<26} analyzed={p['analyzed']} similarity={p['similarity']*100:5.1f}% "
          f"flagged={p['flagged']} matched={p['matchedId']}")
    if p["flagged"]: flagged_seen = True
    if p["analyzed"] and not p["flagged"]: clear_seen = True
    if p["flagged"] and p["evidence"]:
        print(f"      evidence: \"{p['evidence'][:90]}\"")

print("\n--- lecturer plagiarism review ---")
s, rows = call("GET", f"/api/exams/{eid}/plagiarism", lec)
for r in rows:
    print(f"  {r['studentName']:<18} sim={r['similarity']*100:5.1f}% flagged={r['flagged']}")

assert flagged_seen, "FAIL: copied answer was not flagged"
assert clear_seen, "FAIL: original answer should be analyzed and clear"
print("\nPASS: copied answer flagged, original answer analyzed & clear, live TF-IDF working.")
