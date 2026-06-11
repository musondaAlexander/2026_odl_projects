# WORKLOG — `papers` (session continuity)

> **Purpose:** Claude's running journal. On resume, READ THE "Current state" block
> first — it says exactly what is done and what the next action is. This file is
> updated continuously as work proceeds. `PROGRESS.md` holds the detailed
> build-status table; this file holds *where I am and what's next*.

---

## ▶ Current state — _updated 2026-06-11 (ALL 8 DONE)_

**Project #5 Online Exam COMPLETE & VERIFIED → all 8/8 built.** Committing as batch 8/8.
- Stack: Spring Boot 3 / Java 17 (`zm.zut.exam`, 49 src files) + Python FastAPI TF-IDF service +
  React/Vite (7 pages) + MySQL `exam`. Roles STUDENT/LECTURER/ADMIN, JWT+RBAC.
- Build tooling: no global Maven → downloaded Apache Maven 3.9.9 to `..\.tools` (git-ignored);
  committed a script-only **Maven wrapper** (`mvnw`) so students run `./mvnw`.
- Tests: **JUnit 5 = 11/11** (grading, plagiarism degradation, full MockMvc exam flow + RBAC +
  lazy-load guards); **pytest = 4/4**. Live MySQL smoke: login→randomised delivery→timer→
  auto-grade 100%→PDF reports (valid %PDF)→analytics→admin dashboard→RBAC 403, all green.
- Plagiarism verified live: a copied written answer **flagged at 100%** (evidence + matched corpus),
  an original answer stayed clear.
- **Key fix (recorded to memory):** JVM→uvicorn POSTs need **HTTP/1.1** forced on the JDK
  HttpClient; default HTTP/2 h2c upgrade made FastAPI see an empty body (422). Also fixed
  several `@Transactional(readOnly)` lazy-load gaps the live test exposed.
- Env note: local port 8080 is occupied by an unrelated Apache; verified backend on `SERVER_PORT=8088`.

**Next action after commit:** none required — batch complete. (Optional: push when user asks.)

---

## ▶ Prior state — _updated 2026-06-11_

**Project:** Batch of 8 ODL final-year student apps, each scaffolded from a
`*_Full_Proposal.docx` into a real working app (backend + frontend/extension,
auth/RBAC, admin layer, `.env.example`, seed, tests, README mapping to objectives).

**Done: 7 / 8** — all committed to `main` as "papers batch N/8":
- ✅ 1 Hospital System (`hospital_system/`) — tests 3/3, MySQL
- ✅ 2 Privacy Analytics (`privacy_analytics/`) — tests 4/4, MySQL
- ✅ 3 Phishing Detection (`phishing_detection/`) — tests 3/3, model trained + API
- ✅ 4 E-Commerce + collab filtering (`ecommerce_platform/`) — tests 3/3, MySQL+CF
- ✅ 6 Smart Irrigation IoT (`smart_irrigation/`) — tests 5/5, MySQL
- ✅ 7 AI Parking Finder (`ai_parking_finder/`) — tests 5/5, MySQL+sim
- ✅ 8 AI Skin Classifier (`skin_classifier/`) — tests 5/5, mock mode

**NEXT ACTION — Project #5: Online Exam (`online_exam/`)** ⬜ — the only unfinished one.
- Currently a STUB only (untracked): `online_exam/plagiarism-service/` with a partial
  FastAPI service — `app/main.py`, `app/plagiarism.py`, `tests/test_plagiarism.py`,
  `requirements.txt`, `.venv`. No main exam app yet.
- To build (match the pattern of the other 7), from `Group19_Online_Exam_Full_Proposal.docx`:
  1. Read the Group19 proposal → confirm objectives/features.
  2. Build main exam app: backend + frontend, RBAC (student/instructor/admin),
     question bank, timed exams, proctoring hooks, grading/results, `.env.example`, seed.
  3. Wire to the plagiarism microservice (finish/verify that service too).
  4. Tests + README (objectives-addressed mapping).
  5. Live verify against MySQL (`exam` DB — already noted as created in PROGRESS.md).
  6. Signed commit "Add Online Exam … (papers batch 8/8)" + push when user asks.

**Blockers / open questions:** none recorded. Commit/push only when user requests.

---

## Log (newest first)

### 2026-06-11
- Created this `WORKLOG.md` at user's request: maintain one MD file as continuous
  memory of what I'm doing and where I left off; update it as work proceeds.
- Reviewed repo state: 7/8 projects built & committed; `online_exam/` is the remaining
  one (stub `plagiarism-service` only). Recorded next action above.
