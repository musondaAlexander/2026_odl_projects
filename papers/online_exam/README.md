# Online Exam & Plagiarism Detection Platform

Implementation of the ZUCT 2026 proposal (`Group19_Online_Exam_Full_Proposal`, Group 19:
Luwita Elizabeth, Longwe Tivwale, Kabuka Given).

A secure **randomised online examination engine** with countdown timer and auto-submission,
**instant auto-grading** of objective questions, **TF-IDF cosine-similarity plagiarism detection**
of written answers, and **automated PDF reports** — built on **Java 17 / Spring Boot 3**, a
**Python NLP microservice**, **React + Vite**, and **MySQL 8**.

## Architecture
```
React + Vite SPA  ──REST / JWT──▶  Spring Boot 3 (Java 17)  ──JPA──▶  MySQL 8 (exam)
  student / lecturer / admin          exam engine · auto-grading              question bank,
                                      RBAC · iText PDF reports                 attempts, results
                                              │
                                     HTTP /analyze │ (graceful degrade if down)
                                              ▼
                              Python FastAPI plagiarism microservice
                              (scikit-learn TF-IDF + Porter stemmer, cosine similarity)
```

Three roles: **STUDENT** (sit exams, view results), **LECTURER** (question bank, corpus,
exam config, analytics, plagiarism review, PDF), **ADMIN** (user management + dashboard).

## How the objectives are met

| # | Proposal objective | Implementation | Verified (live, MySQL) |
|---|--------------------|----------------|------------------------|
| 1 | Secure online exam module: randomised delivery from a MySQL question bank, countdown timer with auto-submit, instant auto-grading of objective questions | `AttemptService` shuffles the exam pool and freezes a random subset per attempt; server-side `deadlineAt` + a `@Scheduled` sweeper auto-submit on expiry; `GradingService` scores MCQ/TRUE_FALSE/SHORT_ANSWER by normalised match | Student sat the seeded exam → 6 random questions delivered, **objective score 100%**, timer + auto-submit exercised |
| 2 | NLP TF-IDF cosine-similarity plagiarism detection vs a reference corpus with a configurable threshold + evidence excerpt | `plagiarism-service` (FastAPI + scikit-learn TF-IDF, Porter stemmer); `PlagiarismClient` (JDK HttpClient, HTTP/1.1) calls it on each written answer and stores `PlagiarismFlag`; per-exam threshold | Copied written answer **flagged at 100%** similarity (matched corpus doc + evidence excerpt); an original answer scored 0% and stayed clear |
| 3 | Automated PDF reporting (iText) compiling results + plagiarism flags, per-student and per-exam | `ReportService` (iText 8) renders a per-attempt result report and a per-exam summary report | Both endpoints returned valid `%PDF` documents |

Non-functional: **JWT auth on every endpoint**, question bank restricted to lecturers/admins
(RBAC, 403 enforced), centralized error handling, input validation, mobile-friendly UI.

## Run

The Spring Boot app builds with the bundled **Maven wrapper** (`./mvnw`) — no global Maven needed
(Java 17 is required and present).

```bash
# 1) Plagiarism microservice (Python)
cd plagiarism-service
python -m venv .venv && .venv/Scripts/activate      # (Windows) ; or: source .venv/bin/activate
pip install -r requirements.txt
pytest                                                # 4 passed
uvicorn app.main:app --port 8090                      # http://localhost:8090

# 2) Backend (Spring Boot, Java 17)
cd ../backend
cp .env.example .env                                  # MySQL creds (exam DB), JWT, plagiarism URL
./mvnw test                                            # 11 passed (JUnit 5)
./mvnw spring-boot:run                                 # http://localhost:8080  (seeds demo data)

# 3) Frontend (React + Vite)
cd ../frontend
cp .env.example .env                                  # VITE_API_URL=http://localhost:8080
npm install && npm run dev                             # http://localhost:5179
```

**Demo logins** (password `password123`): `admin@exam.zm`, `lecturer@exam.zm`,
`student1@exam.zm` … `student3@exam.zm`.

## Tests
- **Backend — JUnit 5: 11 passed.** `GradingServiceTest` (5: objective auto-grading, case/whitespace
  tolerance, blank/written handling), `PlagiarismClientTest` (1: graceful degradation when the NLP
  service is down), `ExamFlowTest` (5: MockMvc + H2 — full login→randomised-delivery→answer→submit
  →auto-grade flow, RBAC 403, unauthenticated 4xx, and lazy-collection serialisation on read paths).
- **Plagiarism service — pytest: 4 passed** (preprocessing/stemming, near-duplicate flagged,
  original cleared, empty-corpus safety).
- **Live end-to-end on MySQL** (`smoketest.py`): student sat the seeded exam (randomised delivery,
  timer, auto-grade 100%), a copied written answer was flagged at 73.6% with evidence, an original
  one stayed clear, both PDF reports downloaded as valid `%PDF`, lecturer analytics + plagiarism
  rows returned, admin dashboard returned, and a student was correctly 403'd from the question bank.

## Notes / deviations (see root `TECH_STACK_DECISIONS.md`)
- **MySQL** used for the relational store (shared infra) — the proposal's MySQL choice is honoured directly.
- **Maven wrapper** bootstraps Maven since no global `mvn` is installed; Java 17 is present.
- **Plagiarism stays a separate Python microservice** (proposal mandates Python NLTK/scikit-learn);
  the JVM never loads the NLP stack and degrades gracefully if the service is offline.
- **Scope:** auto-grading covers objective types (MCQ/TRUE_FALSE/SHORT_ANSWER) and drives the
  percentage score; **WRITTEN** answers are plagiarism-screened (and available for manual grading),
  matching the proposal's exclusion of automated essay grading.
- If port **8080** is occupied locally, start the backend on another port
  (`SERVER_PORT=8088 ./mvnw spring-boot:run`) and point `VITE_API_URL` at it.
