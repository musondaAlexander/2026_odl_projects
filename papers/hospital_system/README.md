# Hospital Appointment & Records Management System

Implementation of the ZUCT 2026 proposal (`Group1_Hospital_System_Full_Proposal`).

A full-stack web system that digitises appointment scheduling, patient
registration and medical records, and billing for a single hospital, with
**JWT auth + role-based access control** across Administrator, Doctor, Nurse, and
Patient.

## Architecture
```
React + Vite (role-aware SPA)  ──REST/JWT──▶  Express + Sequelize  ──▶  MySQL
                                              RBAC middleware · MVC
```

## Roles & capabilities
- **Administrator** — user management (create/role/disable/delete), billing/invoices, admin dashboard.
- **Doctor** — own daily schedule, patient records, add consultation notes, doctor dashboard.
- **Nurse** — register walk-in patients, record vital signs.
- **Patient** — book/reschedule/cancel own appointments, view own record.

## Features
- JWT login + refresh tokens, bcrypt password hashing, RBAC on every route.
- Appointment scheduling with **double-booking conflict detection** (overlap guard per doctor).
- Patient registration (self + nurse-initiated) and medical-record CRUD + vital signs.
- Billing: invoice creation, payment recording, auto mark-paid when settled.
- Admin dashboard (utilisation, daily patient count, outstanding billing) + Doctor dashboard (today's schedule).
- Search/filter across patients.

## Run
```bash
# backend
cd backend && npm install
copy .env.example .env        # set MySQL creds, or DB_DIALECT=sqlite for quick dev
npm run seed                  # demo users + data
npm run dev                   # http://localhost:4200
npm test                      # conflict-detection + RBAC tests

# frontend
cd ../frontend && npm install
copy .env.example .env
npm run dev                   # http://localhost:5180
```
Demo logins (password `password123`): `admin@hospital.zm`, `doctor@hospital.zm`, `nurse@hospital.zm`, `patient@hospital.zm`.

## ✅ Objectives addressed
| # | Objective | Implementation | Verified |
|---|-----------|----------------|----------|
| 1 | RBAC enforcing differentiated permissions for Admin/Doctor/Nurse/Patient | `src/middleware/auth.js` (`authenticate`+`authorize`), applied in `src/routes/index.js`; ownership checks in controllers | Smoke test: patient→`/admin/users` = **403** |
| 2 | Full-stack MVC system + normalised MySQL for appointments, records, billing | `src/models/index.js` (8 entities), controllers per domain, React SPA | Seeded + ran on live MySQL |
| 3 | Doctor & Admin dashboards with real-time metrics | `src/controllers/dashboardController.js`, `frontend/src/pages/Dashboard.jsx` | `/dashboard/admin` + `/dashboard/doctor` return live metrics |

**Tests:** `npm test` → appointment conflict-detection + acceptance (3/3). Smoke-tested
end-to-end on live MySQL (admin dashboard, doctor schedule, RBAC 403, **409 on double-booking**).

## Project structure
```
hospital_system/
├── backend/  src/{config,db,models,middleware,controllers,routes,app,server}; tests/
└── frontend/ src/{api,App,pages/{Login,Dashboard,Appointments,Patients,Admin}}
```

## Troubleshooting
- **Port in use:** set `PORT` in `.env` (default 4200) if another app holds it.
- **MySQL refused:** set `DB_DIALECT=sqlite` for a zero-setup dev DB.
- **403 everywhere:** you're logged in with a role that lacks access — RBAC is enforced.
