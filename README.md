# ODL Student Projects — Implementation Monorepo

Production-grade implementations of three final-year BSc Information Technology
projects (Zambia University College of Technology, 2026). Each application is
built from its approved project proposal located in the corresponding folder.

| # | Project | Folder | Stack | Status |
|---|---------|--------|-------|--------|
| 1 | Secure File-Sharing Platform (E2EE) | [`secure_file_sharing/`](./secure_file_sharing) | Django + DRF + MySQL · React + Web Crypto API | 🟡 Scaffolding |
| 2 | Password Manager (Zero-Knowledge) | [`group_10_password_manager/`](./group_10_password_manager) | Electron + React · AES-256-GCM + PBKDF2 · SQLite/SQLCipher | 🟡 Scaffolding |
| 3 | Gamified Fish-Farming Learning Platform | [`group_6_gamified_fishfarming_platform/`](./group_6_gamified_fishfarming_platform) | React PWA + Chart.js · Node/Express + MySQL | 🟡 Scaffolding |

## Repository layout

```
odl_student_projects/
├── README.md                      # this file
├── PROGRESS.md                    # live build tracker (done / in-progress / todo)
├── TECH_STACK_DECISIONS.md        # stack rationale per project (research-backed)
├── REUSABLE_PROMPT.md             # prompt template to repeat this workflow
├── .gitignore
├── secure_file_sharing/           # Project 1 (+ original proposal docs)
├── group_10_password_manager/     # Project 2 (+ original proposal docs)
└── group_6_gamified_fishfarming_platform/  # Project 3 (+ original proposal docs)
```

## Build philosophy

- **Scaffold in parallel, build sequentially.** All three project skeletons are
  laid down first; feature implementation then proceeds one project at a time.
- **Production-grade.** Real authentication, role-based access control, an admin
  management layer wherever the app manages users, input validation, and tests.
- **Faithful to the proposals.** Each app's architecture, security model, and
  technology choices trace directly to its Chapter 1–3 specification.

See [`PROGRESS.md`](./PROGRESS.md) for the current state of each project.
