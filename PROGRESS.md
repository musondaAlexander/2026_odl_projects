# Build Progress Tracker

Live status of all three implementations. Updated as work proceeds.
Legend: ✅ done · 🟡 in progress · ⬜ not started

_Last updated: all three projects built + test-verified; Projects 1 & 3 now wired
to and verified against the LIVE MySQL 8 server. Pending: GitHub push (needs remote URL)._

---

## Phase 0 — Repo setup
- ✅ Git initialized (`main` branch)
- ✅ Root `README.md`, `TECH_STACK_DECISIONS.md`, `PROGRESS.md`
- ✅ Root `.gitignore`
- ✅ `REUSABLE_PROMPT.md`
- 🟡 First commit (local) — staging now
- ⬜ Pushed to GitHub (needs remote repo URL)

---

## Project 1 — Secure File-Sharing Platform (E2EE)
**Stack:** Django + DRF + MySQL · React + Vite + Web Crypto API

### Scaffold
- ✅ Backend Django project (`config`, settings, env, MySQL via PyMySQL)
- ✅ Apps: `accounts` (PKI keys), `files` (ciphertext), `audit` (HMAC chain)
- ✅ `requirements.txt`, `.env.example` (connects to existing MySQL server)
- ✅ Frontend React + Vite skeleton, API client, Web Crypto module

### Build
- ✅ User registration + JWT auth
- ✅ PKI: public-key registration, recipient key lookup, fingerprints
- ✅ Client-side hybrid encryption (RSA-OAEP wrap + AES-256-GCM) + round-trip tests
- ✅ Encrypted upload / download / decrypt flow (UI: Send, Inbox)
- ✅ HMAC-SHA256 audit log + integrity verification endpoint + tests
- ✅ Admin (Django admin: users, keys, read-only delete-proof audit log)
- ✅ READMEs
- 🟡 Verify backend migrates + tests pass (deps installing)
- ⬜ Run against live MySQL (awaiting credentials)

---

## Project 2 — Password Manager (Zero-Knowledge)
**Stack:** Electron + React + Vite · AES-256-GCM + PBKDF2 · better-sqlite3

### Scaffold
- ✅ Electron main + preload + renderer structure
- ✅ Vite + React renderer skeleton
- ✅ `package.json`, vite build config

### Build
- ✅ PBKDF2 key derivation module (600k iters, random salt)
- ✅ AES-256-GCM encrypt/decrypt engine (+ verifier, tamper detection)
- ✅ Encrypted SQLite vault schema + CRUD (better-sqlite3)
- ✅ Master-password set / unlock / change (full re-encrypt)
- ✅ Password generator (CSPRNG), clipboard auto-clear (30s), auto-lock
- ✅ Encrypted import / export (passphrase AES-256-GCM)
- ✅ Renderer UI (Lock, VaultView, EntryForm, Settings)
- ✅ Crypto tests pass (5/5: round-trip, wrong-pw, verifier, tamper, generator)
- ✅ Vault integration validated under Node (init/lock/unlock/rotate/export)
- ✅ Renderer builds (vite, 35 modules); deps installed
- ✅ README
- ⬜ Manual Electron window launch (GUI; can't run headless here — `npm run dev`)

---

## Project 3 — Gamified Fish-Farming Platform
**Stack:** React PWA + Chart.js · Node/Express + Sequelize + MySQL · JWT + bcrypt

### Scaffold
- ✅ Express backend structure (routes/controllers/models/middleware)
- ✅ Sequelize models + associations (MySQL, SQLite dev fallback)
- ✅ React PWA frontend skeleton + service worker (vite-plugin-pwa)

### Build
- ✅ Auth (JWT + bcrypt), RBAC (Learner / Trainer / Admin)
- ✅ Modules + lessons + content delivery (offline PWA cache)
- ✅ Quizzes + scenario challenges + auto-grading (immediate feedback)
- ✅ Gamification engine (points, badges, leaderboard) — **smoke-tested end-to-end**
- ✅ Field-task submission + trainer verification (awards XP)
- ✅ Learner progress dashboard + trainer analytics (Chart.js bar chart)
- ✅ **Admin layer**: users/roles/disable/delete, cohorts, badge rules, field tasks
- ✅ Seed script + READMEs
- ✅ API smoke test passed (login → complete lesson → XP+badge → leaderboard)
- ⬜ Run against live MySQL (awaiting credentials)

---

## Final
- ✅ All three projects build + core tests pass (see per-project sections)
- ✅ `REUSABLE_PROMPT.md` written
- 🟡 Commit (local) done; push to GitHub pending remote URL

## Verification summary (actual runs)
| Project | What was run | Result |
|---|---|---|
| 1 Secure File-Sharing | `manage.py migrate` + `manage.py test` | ✅ migrated; 3/3 pass (audit chain + full PKI/ciphertext/audit API flow) |
| 1 frontend | `vitest run` + `vite build` | ✅ 2/2 Web Crypto E2EE tests; build OK |
| 2 Password Manager | `node --test` + vault integration + `vite build` | ✅ 5/5 crypto tests; vault E2E OK; build OK |
| 3 Fish-Farming | seed + live API smoke (login→lesson→XP+badge→leaderboard) | ✅ all endpoints OK |
| 3 frontend | `vite build` (PWA) | ✅ build OK; service worker generated |

_All DB-backed verification used the SQLite dev fallback to prove correctness;
switch to live MySQL by filling `.env` once credentials are provided._

## Quality pass (post-build)
- ✅ Added P1 end-to-end API integration test → caught & fixed a real bug
      (`PublicKey.fingerprint` was wrongly required on input; now server-computed).
- ✅ Proper per-project READMEs: overview, architecture, features, run steps,
      API tables, **objectives-addressed mapping w/ evidence**, structure, troubleshooting.
- ✅ Modern UI pass on all three frontends (Inter typography, glassmorphism,
      gradient accents, focus rings, hover/active states) — all rebuild clean.
- ✅ Objective verification documented in each project README.

## Live MySQL wiring (MySQL 8.0.45 @ localhost:3306)
- ✅ Databases `sfs` + `fishfarm` created (utf8mb4_unicode_ci).
- ✅ **Fixed latent bug:** `files` app was missing `migrations/__init__.py`, so
      `files_encryptedfile` was never created — uploads would have failed at runtime.
      Added the package, generated `files/0001_initial`, applied to MySQL.
- ✅ Added MySQL `TEST` charset/collation + connection charset in settings.
- ✅ P1: migrated to `sfs`; **3/3 Django tests pass on MySQL**; admin superuser
      created (`admin` / `admin1234`).
- ✅ P3: seeded `fishfarm`; **full role-based smoke test on MySQL passed** —
      learner XP+badge, trainer analytics, admin user list, learner→admin route = 403.
- ✅ `.env` files written (git-ignored; password not committed).
