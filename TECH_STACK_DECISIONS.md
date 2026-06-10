# Tech Stack Decisions

Stack selection for each project, justified against the problem being solved and
the objectives stated in the proposal. Each proposal already nominated a stack;
as the implementing engineer I validated those choices and, where production
concerns warranted, refined them. Deviations from the proposal are flagged.

---

## 1. Secure File-Sharing Platform with End-to-End Encryption

**Core constraint driving the stack:** the server must *never* be able to decrypt
files. Encryption/decryption must happen in the client; the server stores only
ciphertext + an HMAC-chained audit log.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Client crypto | **Web Crypto API** (RSA-OAEP + AES-GCM hybrid) | Browser-native, audited, no third-party crypto lib (matches proposal §3.5). RSA wraps a per-file AES key so large files are encrypted efficiently. |
| Frontend | **React 18 + Vite** | Proposal-specified. Vite over CRA for speed and modern tooling. |
| Backend | **Django 5 + Django REST Framework** | Proposal-specified. DRF gives clean serialization, auth, permissions. |
| Auth | **JWT (SimpleJWT)** | Stateless API auth suited to a SPA. |
| PKI / keys | Django models storing **public keys + self-signed certs only** | Private keys never leave the browser. |
| Audit log | **HMAC-SHA256 chain** in MySQL | Each entry hashes the previous → tamper-evident (proposal objective 3). |
| Database | **MySQL 8** (SQLite for local dev) | A MySQL server already runs in this environment, so MySQL is used instead of the proposal's PostgreSQL — functionally equivalent for this relational workload (ciphertext blobs + audit chain). |

**Refinements vs proposal:**
- Proposal mentions "RSA-OAEP or ECIES". For implementation I use **RSA-OAEP to
  wrap a per-file AES-256-GCM key** (hybrid encryption) — the standard, performant
  way to E2EE-encrypt arbitrary-size files, since RSA alone cannot encrypt large
  payloads.
- **Database changed from PostgreSQL → MySQL** because a MySQL server is already
  provisioned in the target environment. Django's ORM makes this swap transparent.

---

## 2. Password Manager with Zero-Knowledge Encryption

**Core constraint:** zero-knowledge — keys derived from the master password on the
device; vault stored locally as ciphertext; nothing secret ever transmitted.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Shell | **Electron** | Proposal-specified cross-platform desktop. |
| UI | **React 18 + Vite** | Proposal-specified. |
| KDF | **PBKDF2-SHA256, ≥600,000 iterations** | Proposal §2.4 / OWASP 2023 guidance. |
| Cipher | **AES-256-GCM** (Node `crypto` / Web Crypto) | Authenticated encryption (proposal §2.2.2, NIST SP 800-38D). |
| Storage | **better-sqlite3** (+ SQLCipher option) | Proposal-specified local encrypted vault. |
| Tests | **Vitest/Jest** | Crypto correctness + CRUD. |

**Note:** this app is **single-user, local-only** by design (zero cloud). "User
management" here = master-password lifecycle (set, change, lock, auto-lock) — there
is no server-side admin, consistent with the zero-knowledge threat model.

---

## 3. Gamified Learning Platform with Performance Analytics (Fish Farming)

**Core constraint:** rural low-bandwidth users; trainers need real-time analytics;
multi-actor (Learner / Trainer / Admin) with role-based access.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | **React 18 + Vite, as a PWA** (service worker) | Offline module access on 2G/3G (proposal §3.4.2). |
| Charts | **Chart.js** (react-chartjs-2) | Proposal-specified analytics dashboard. |
| Backend | **Node.js + Express** | Proposal-specified REST API. |
| ORM | **Sequelize** | Clean MySQL modelling, migrations, portability. |
| Database | **MySQL 8** (SQLite for local dev via Sequelize) | Proposal-specified normalized schema. |
| Auth | **JWT (24h)** + **bcrypt** password hashing | Proposal §3.4.2. |
| Roles | **Learner / Trainer / Admin** RBAC | Multi-actor system → full admin user management. |

**This is the project with the richest user management** → it gets a complete
**admin layer**: manage users, roles, cohorts, content, and badge rules.

---

## Cross-cutting standards (all projects)

- `.env.example` committed; real secrets git-ignored.
- Layered structure (routes/controllers/services/models or DRF apps).
- Input validation, centralized error handling, RBAC where applicable.
- README per project with run instructions.
- Docker Compose for the databases (Postgres, MySQL).
