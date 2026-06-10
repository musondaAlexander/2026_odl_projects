# Reusable Prompt — "Scaffold & Build Apps From Proposal Documents"

Paste the prompt below to Claude Code (adjusting the bracketed parts) whenever you
want to turn one or more written project proposals into production-grade,
runnable applications using the same workflow that produced this repo.

---

## 📋 The prompt (copy from here)

> You are a **senior software engineer**. There are **[N]** project proposal
> document(s) in this folder (`.docx`/`.pdf`/`.pptx`).
>
> **Step 1 — Understand.** Read every proposal in full (extract text from the
> Office/PDF files). For each, summarise back to me: the problem, objectives,
> scope, intended architecture, and any tech stack the proposal names. Wait for
> my confirmation before building if anything is ambiguous.
>
> **Step 2 — Choose the stack.** For each project, select the correct tech stack
> based on the *problem and objectives* (not just fashion). Default to the stack
> the proposal specifies unless a production concern justifies a refinement —
> document every choice and every deviation in `TECH_STACK_DECISIONS.md`.
> Use **[shared infra I already have, e.g. "the MySQL server already running on
> localhost"]** where applicable.
>
> **Step 3 — Scaffold all projects in parallel, then build them one after
> another.** Lay down every project's structure/config/runnable skeleton first;
> then implement features project by project.
>
> **Step 4 — Production-grade, not toy.** Real authentication; **role-based
> access control and a full admin user-management layer wherever the app manages
> users**; input validation; centralized error handling; `.env.example` with
> secrets git-ignored; a README per project with run instructions; and automated
> tests for the security-critical / core logic (run them and show results).
>
> **Step 5 — Track progress.** Maintain a root `PROGRESS.md` with a per-project
> checklist (done / in-progress / todo), updated as you go, plus a root
> `README.md` overview and `TECH_STACK_DECISIONS.md`.
>
> **Step 6 — Verify.** Install dependencies, run migrations/seeds, run the tests,
> and smoke-test each backend's core flow. Report real results (including
> failures). Fall back to a local dev DB (SQLite) only to prove correctness if
> the production DB isn't reachable, and say so.
>
> **Step 7 — Commit.** Initialize git on `main`, write a clear `.gitignore`, and
> commit. Then **push to GitHub** (ask me for the remote/repo if needed).
>
> Proceed once you understand. Ask me only when a decision is genuinely mine to
> make (credentials, repo URL, an ambiguous requirement).

---

## 🔁 Why this workflow works (the method behind it)

1. **Understand before building.** Binary proposal files are parsed to text; each
   spec's problem/objectives drive the stack — the proposal is the source of truth.
2. **Parallel scaffold, sequential build.** Skeletons for all projects go down
   first (cheap, parallelizable); feature work is then focused one project at a
   time so quality stays high.
3. **Stack = problem-fit, documented.** Every choice and deviation is written down
   with its rationale, so reviewers can trace design back to the spec.
4. **Production-grade bar.** Auth + RBAC + admin layer + validation + tests +
   per-project README + git-ignored secrets — the difference between a demo and
   something shippable.
5. **Verify with real runs.** Migrations, seeds, tests, and an API smoke test are
   actually executed; results (pass or fail) are reported honestly. A SQLite
   fallback proves correctness when the prod DB is unreachable.
6. **Living tracker.** `PROGRESS.md` always reflects what's done vs left, so the
   work is resumable across sessions.

## 🧱 Conventions this repo follows (reuse them)

- **Layout:** each project is a top-level folder; web apps split `backend/` +
  `frontend/`; desktop apps use `src/main` + `src/preload` + `src/renderer`.
- **Backends:** layered (routes → controllers/views → services → models),
  centralized errors, schema validation (Zod / DRF serializers), JWT auth, RBAC
  middleware, `.env.example`, a seed script, and a DB dev-fallback toggle.
- **Security-critical code is unit-tested** and tests are run before claiming done
  (e.g. crypto round-trips, the audit-chain tamper test, the gamification flow).
- **Docs:** root `README.md`, `PROGRESS.md`, `TECH_STACK_DECISIONS.md`, and a
  README in every project.

## ✍️ Tips when reusing

- Tell me the **shared infrastructure** you already have (DB server + credentials,
  cloud, etc.) so I wire to it instead of standing up new infra.
- If a proposal names a stack, I'll honor it by default; say so if you'd rather I
  optimise purely for the problem.
- Give me the **GitHub repo URL** up front if you want the push to be hands-off.
- Say **"keep building until X is done"** for long runs; I'll keep `PROGRESS.md`
  current so we can stop and resume anytime.
