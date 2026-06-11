"""End-to-end live smoke test against the running stack (no external deps)."""
import json, urllib.request, urllib.error

BASE = "http://127.0.0.1:8088"

def call(method, path, token=None, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            content = r.read()
            return r.status, (content if raw else (json.loads(content) if content else None))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="ignore")

def login(email):
    s, r = call("POST", "/api/auth/login", body={"email": email, "password": "password123"})
    assert s == 200, f"login {email}: {s} {r}"
    return r["token"], r["user"]

ANSWER_KEY = [
    ("fifo", "Queue"),
    ("sql clause filters", "HAVING"),
    ("http is a stateless", "true"),
    ("tcp is a connectionless", "false"),
    ("abbreviation cpu", "central processing unit"),
    ("binary search", "O(log n)"),
    # written: near-verbatim copy of the seeded corpus -> should FLAG
    ("photosynthesis", "Photosynthesis converts sunlight into chemical energy in plant cells, "
                       "producing glucose and oxygen from carbon dioxide and water using chlorophyll."),
    # written: original answer -> should stay clear
    ("normalization", "I think tables should be tidy and not repeat the same value twice."),
]

def answer_for(text):
    t = text.lower()
    for key, val in ANSWER_KEY:
        if key in t:
            return val
    return "n/a"

print("=" * 64)
print("LIVE END-TO-END SMOKE TEST")
print("=" * 64)

# --- Student flow ---
stoken, suser = login("student1@exam.zm")
print(f"[1] Student login OK: {suser['fullName']} ({suser['role']})")

s, exams = call("GET", "/api/exams/available", stoken)
print(f"[2] Available exams: {[e['title'] for e in exams]}")
exam_id = exams[0]["id"]

s, attempt = call("POST", f"/api/exams/{exam_id}/start", stoken)
assert s == 200, attempt
qs = attempt["questions"]
print(f"[3] Started attempt {attempt['attemptId']}: {len(qs)} questions delivered, "
      f"timer={attempt['secondsRemaining']}s (deadline {attempt['deadlineAt']})")
print(f"    Delivered types: {[q['type'] for q in qs]}")

for q in qs:
    resp = answer_for(q["text"])
    s, _ = call("POST", f"/api/attempts/{attempt['attemptId']}/answer", stoken,
                body={"questionId": q["questionId"], "response": resp})
    assert s == 200
print(f"[4] Saved {len(qs)} answers")

s, result = call("POST", f"/api/attempts/{attempt['attemptId']}/submit", stoken)
assert s == 200, result
print(f"[5] Submitted -> status={result['status']}, score={result['scorePercent']}% "
      f"({result['awardedMarks']}/{result['totalMarks']} marks)")
for a in result["answers"]:
    pl = a.get("plagiarism")
    tag = ""
    if pl:
        tag = f"  PLAGIARISM sim={pl['similarity']*100:.1f}% flagged={pl['flagged']} analyzed={pl['analyzed']}"
    mark = "OK" if a["correct"] else ("X" if a["correct"] is False else "-")
    print(f"    [{mark}] {a['type']:<12} {a['awarded']}/{a['marks']}{tag}")

# --- Student PDF ---
s, pdf = call("GET", f"/api/attempts/{attempt['attemptId']}/report.pdf", stoken, raw=True)
ok_pdf = s == 200 and pdf[:4] == b"%PDF"
print(f"[6] Student PDF report: {s}, {'valid %PDF, ' + str(len(pdf)) + ' bytes' if ok_pdf else 'INVALID'}")

# --- RBAC: student must NOT manage questions ---
s, _ = call("GET", "/api/questions", stoken)
print(f"[7] RBAC student -> /api/questions: HTTP {s} (expect 403)")

# --- Lecturer flow ---
ltoken, luser = login("lecturer@exam.zm")
print(f"[8] Lecturer login OK: {luser['fullName']}")
s, an = call("GET", f"/api/exams/{exam_id}/analytics", ltoken)
print(f"[9] Analytics: participants={an['participants']}, avg={an['averageScore']}%, "
      f"flagRate={an['plagiarismFlagRate']}%, flagged={an['flaggedAnswers']}/{an['writtenAnswers']}")
s, flags = call("GET", f"/api/exams/{exam_id}/plagiarism", ltoken)
print(f"[10] Plagiarism rows: {len(flags)}")
for f in flags:
    print(f"     {f['studentName']:<20} sim={f['similarity']*100:5.1f}% flagged={f['flagged']}")
s, epdf = call("GET", f"/api/exams/{exam_id}/report.pdf", ltoken, raw=True)
print(f"[11] Exam summary PDF: {s}, {'valid %PDF, ' + str(len(epdf)) + ' bytes' if epdf[:4]==b'%PDF' else 'INVALID'}")

# --- Admin flow ---
atoken, auser = login("admin@exam.zm")
s, dash = call("GET", "/api/admin/dashboard", atoken)
print(f"[12] Admin dashboard: {dash}")

print("=" * 64)
print("SMOKE TEST COMPLETE")
