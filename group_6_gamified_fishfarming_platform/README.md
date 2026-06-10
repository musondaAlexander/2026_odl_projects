# Gamified Learning Platform with Performance Analytics — Fish Farming

Implementation of the ZUCT 2026 proposal (`Group6_Gamified_FishFarming_Proposal`).

A web platform that teaches small-scale Zambian fish farmers through a
**gamification engine** (points, badges, leaderboards, scenario challenges,
verified field tasks) and gives trainers a **real-time analytics dashboard**.
Built as a **PWA** for offline/low-bandwidth rural use.

## Architecture

```
React PWA + Chart.js  ──REST/JWT──▶  Express + Sequelize  ──▶  MySQL
 offline service worker             gamification engine · RBAC      normalized schema
```

Three roles (RBAC): **Learner**, **Trainer**, **Admin**.

## Features
- **Curriculum:** competency-based modules → lessons (downloadable for offline) → quizzes.
- **Gamification engine** (`src/services/gamification.js`): XP for measurable
  activities, badge-unlock rules evaluated after every scoring event, live leaderboard.
- **Auto-graded quizzes & scenario challenges** with immediate feedback.
- **Field-practice tasks:** learners submit photo evidence; trainers verify → awards XP.
- **Learner dashboard:** XP, rank, completion %, badges, quiz history.
- **Trainer analytics:** cohort KPIs, quiz-score distribution chart, individual
  learner cards with at-risk flags, inactivity alerts.
- **Admin layer:** full user management (create/role/disable/delete), cohorts, badge rules.

## Tech stack
Node.js + Express · Sequelize · MySQL 8 (SQLite dev fallback) · JWT + bcrypt ·
React 18 + Vite (PWA) · Chart.js · Zod validation.

## Backend — run
```bash
cd backend
npm install
copy .env.example .env          # set MySQL creds, or DB_DIALECT=sqlite for quick dev
npm run seed                    # creates demo users + curriculum
npm run dev                     # http://localhost:4000
```
Demo logins (password `password123`): `admin@fishfarm.zm`, `trainer@fishfarm.zm`, `bwalya@farm.zm`.

## Frontend — run
```bash
cd frontend
npm install
copy .env.example .env
npm run dev                     # http://localhost:5174
```

## Key API routes
| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/register` \| `/login` | public |
| GET | `/api/modules`, `/api/lessons/:id` | any |
| POST | `/api/lessons/:id/complete` | learner |
| POST | `/api/quizzes/:id/submit` | learner |
| POST | `/api/field-tasks/:id/submit` | learner |
| POST | `/api/field-tasks/submissions/:id/review` | trainer/admin |
| GET | `/api/me/progress`, `/api/leaderboard` | any |
| GET | `/api/analytics/dashboard`, `/api/analytics/alerts` | trainer/admin |
| GET/POST/PATCH/DELETE | `/api/admin/users` | admin |

## Offline (PWA)
The service worker caches the app shell and `/api/modules` + `/api/lessons`
responses (stale-while-revalidate) so downloaded lessons remain usable without
connectivity, syncing when the connection returns.

## ✅ Objectives addressed (proposal → implementation → evidence)
| # | Proposal objective | Where it's implemented | Verified by |
|---|--------------------|------------------------|-------------|
| 1 | Gamification engine: points, badges, leaderboard from measurable activities | `backend/src/services/gamification.js` (`awardPoints`, `evaluateBadges`, `getLeaderboard`) | API smoke test: complete lesson → +20 XP → "First Steps" badge → leaderboard rank |
| 2 | Real-time analytics dashboard: individual + cohort metrics | `backend/src/controllers/analyticsController.js`, `frontend/src/pages/Trainer.jsx` (Chart.js) | `/api/analytics/dashboard` returns cohort KPIs + score distribution + per-learner cards |
| 3 | Evaluate gamification effect on engagement (activity + assessment data) | `ActivityLog` ledger + `QuizAttempt` history power progress & analytics | Activity events logged per scoring action; dashboard exposes completion/at-risk metrics |

> Objective 3 is an *evaluation* objective fulfilled at the pilot site; the
> platform provides the instrumentation (activity ledger, quiz history, pre/post
> survey-ready metrics) that the study analyses.

**Test evidence:** end-to-end API smoke test — `login → complete lesson → XP +
badge awarded → leaderboard updated`, plus role-gated routes for learner/trainer/admin.

## Project structure
```
group_6_gamified_fishfarming_platform/
├── backend/
│   └── src/
│       ├── models/index.js       # User, Module, Lesson, Quiz, Badge, FieldTask, ActivityLog…
│       ├── services/gamification.js  # XP + badge engine + leaderboard
│       ├── controllers/          # auth, content, quiz, fieldTask, progress, analytics, admin
│       ├── middleware/           # JWT auth + RBAC + error handling
│       ├── routes/index.js       # role-gated REST routes
│       └── db/                   # sequelize, sync, seed
└── frontend/
    └── src/pages/                # Login, Register, Dashboard, Modules, Leaderboard, Trainer, Admin
```

## Troubleshooting
- **MySQL connection refused:** set `DB_DIALECT=sqlite` in `.env` for a zero-setup
  dev run, or provide MySQL creds + `CREATE DATABASE fishfarm`.
- **403 on a route:** RBAC is enforced — learners can't hit trainer/admin routes.
  Log in with the matching role (`trainer@fishfarm.zm` / `admin@fishfarm.zm`).
- **Seed resets data:** `npm run seed` drops & recreates tables (`sync({force:true})`).
