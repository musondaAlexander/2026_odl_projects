# Password Manager with Zero-Knowledge Encryption

Implementation of the ZUCT 2026 proposal (`Group10_Password_Manager_Full_Proposal`).

A cross-platform **desktop** password manager where **all encryption happens on
your device**. The master password derives the vault key via PBKDF2; entries are
stored as AES-256-GCM ciphertext in a local SQLite file. Nothing secret is ever
written to disk in plaintext, and there is **no server** — true zero-knowledge.

## Security model (proposal §2.4)
- **Key derivation:** PBKDF2-SHA256, **600,000 iterations** (OWASP 2023), random
  16-byte salt. The derived AES-256 key lives only in main-process memory while
  unlocked and is dropped on lock/auto-lock.
- **Encryption:** AES-256-GCM (authenticated — tampering is detected on decrypt,
  NIST SP 800-38D).
- **Master-password check:** a "verifier" ciphertext is decrypted on unlock — the
  password itself is never stored.
- **Process isolation:** crypto and the DB live in the Electron **main** process;
  the renderer reaches them only through a locked-down `contextBridge` IPC API.
- **Clipboard hygiene:** copied passwords auto-clear after 30 s.
- **Auto-lock:** the vault locks and purges the key after N minutes of inactivity.

## Architecture
```
Renderer (React)  ──contextBridge IPC──▶  Main process (Node)
  UI only, no key                          PBKDF2 · AES-256-GCM · better-sqlite3 vault.db
```

## Project layout
```
src/main/crypto.js     PBKDF2 + AES-256-GCM core (pure Node, unit-tested)
src/main/vault.js      Encrypted SQLite vault + CRUD + change-master + export/import
src/main/index.js      Electron main: IPC, auto-lock, clipboard auto-clear
src/preload/index.js   contextBridge bridge (the only renderer↔main surface)
src/renderer/          React UI (Lock, VaultView, EntryForm, Settings)
tests/crypto.test.js   Crypto correctness + zero-knowledge property tests
```

## Run
```bash
npm install            # builds better-sqlite3 + fetches Electron
npm test               # crypto + zero-knowledge tests (no Electron needed)
npm run dev            # Vite renderer (5175) + Electron shell
```
`npm run build:renderer` then `npm start` runs the packaged renderer.

> Note: `better-sqlite3` is a native module compiled against Electron's ABI; the
> first `npm install`/run may trigger a rebuild (`electron-rebuild`) on some
> setups. The crypto core and its tests run under plain Node with no native deps.

## Features
- Master-password create / unlock / change (re-encrypts the whole vault).
- Add / view / edit / delete credentials (title, username, password, URL, notes).
- CSPRNG password generator (configurable length 8–64 + character sets).
- Copy-to-clipboard with 30 s auto-clear.
- Inactivity auto-lock (configurable).
- Encrypted vault export / import (AES-256-GCM, passphrase-protected).

## "User management" note
By design this is a **single-user, local-only** app (zero cloud, zero server),
so there is no server-side admin. The user-account lifecycle here is the
master-password lifecycle: set, unlock, change, lock — all enforced locally.

## ✅ Objectives addressed (proposal → implementation → evidence)
| # | Proposal objective | Where it's implemented | Verified by |
|---|--------------------|------------------------|-------------|
| 1 | PBKDF2 key-derivation module with configurable iterations, brute-force resistant | `src/main/crypto.js` (`deriveKey`, 600k iters, random salt) | `tests/crypto.test.js` (derive + verifier) |
| 2 | Client-side AES-256 engine; server never receives plaintext | `src/main/crypto.js` (AES-256-GCM), `src/main/vault.js` (ciphertext-only storage) | `tests/crypto.test.js` (round-trip, wrong-pw, tamper) + Node vault integration |
| 3 | Cross-platform Electron + React vault with encrypted SQLite | `src/main/vault.js` (better-sqlite3), `src/renderer/` (React UI) | renderer builds; vault E2E (init/lock/unlock/rotate/export) |

**Test evidence:** `npm test` → 5 passing (round-trip, wrong-password rejection,
verifier, GCM tamper detection, generator). Vault layer validated end-to-end
under Node (init → add → lock → unlock → master-password rotation → encrypted export).

## Project structure
```
group_10_password_manager/
├── src/
│   ├── main/
│   │   ├── crypto.js      # PBKDF2 + AES-256-GCM + CSPRNG generator (pure Node)
│   │   ├── vault.js       # encrypted SQLite vault + CRUD + rotate + export/import
│   │   └── index.js       # Electron main: IPC, auto-lock, clipboard auto-clear
│   ├── preload/index.js   # contextBridge (only renderer↔main surface)
│   └── renderer/          # React: Lock, VaultView, EntryForm, Settings
├── tests/crypto.test.js
└── vite.config.js
```

## Troubleshooting
- **`better-sqlite3` rebuild on first run:** it's a native module compiled
  against Electron's ABI; if `npm run dev` errors on the native module, run
  `npx electron-rebuild`. The crypto core + its tests run under plain Node and
  need no native build.
- **Forgot master password:** by design it is unrecoverable — there is no
  backdoor and the key is never stored. Keep an encrypted export as backup.
