# Secure File-Sharing Platform with End-to-End Encryption

Implementation of the ZUCT 2026 proposal (`SecureFileSharing_E2EE_Full_Proposal.docx`).

Files are encrypted **in the browser** with the recipient's public key before
upload. The server stores **only ciphertext** + an **HMAC-chained tamper-evident
audit log**. No private key ever reaches the server.

## Architecture

```
React + Web Crypto API  ──(ciphertext + wrapped key)──▶  Django REST API  ──▶  MySQL
   client-side crypto                                     PKI · audit chain      ciphertext only
```

- **Hybrid encryption:** each file → fresh AES-256-GCM key; that key is wrapped
  with the recipient's RSA-OAEP-2048 public key.
- **PKI:** users register a public key (private key stays in the browser);
  senders look up the recipient's key before encrypting.
- **Audit:** every event is HMAC-SHA256 chained; `/api/audit/verify/` recomputes
  the chain to detect tampering (admin only).

## Tech stack
Django 5 · DRF · SimpleJWT · MySQL (SQLite dev fallback) · React 18 + Vite · Web Crypto API.

## Backend — run

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
copy .env.example .env                               # then edit DATABASE_URL
python manage.py migrate
python manage.py createsuperuser                     # admin user
python manage.py runserver
```

Leave `DATABASE_URL` empty in `.env` to use SQLite for a quick start, or point it
at the running MySQL server: `mysql://user:pass@localhost:3306/sfs`.

## Frontend — run

```bash
cd frontend
npm install
copy .env.example .env
npm run dev          # http://localhost:5173
npm test             # Web Crypto round-trip tests
```

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/accounts/register/` | Create account |
| POST | `/api/auth/token/` | JWT login |
| GET/POST | `/api/accounts/keys/` | Get / register my public key |
| GET | `/api/accounts/keys/lookup/?q=` | Look up recipient's public key |
| GET | `/api/files/?box=received\|sent` | List files |
| POST | `/api/files/upload/` | Upload ciphertext |
| GET | `/api/files/{id}/download/` | Fetch ciphertext + wrapped key (recipient only) |
| DELETE | `/api/files/{id}/` | Delete |
| GET | `/api/audit/events/` | Audit log (own events; admin sees all) |
| GET | `/api/audit/verify/` | Verify HMAC chain (admin) |

## Admin / user management
- Django admin at `/admin/` — manage users, public keys, and view the read-only,
  delete-proof audit log.
- Audit chain verification endpoint for forensic integrity checks.

## Security model
The server is *untrusted* for confidentiality: a full server/database compromise
exposes only ciphertext and wrapped keys, which are useless without recipients'
private keys. Tampering with the audit log is detectable via the HMAC chain.

## ✅ Objectives addressed (proposal → implementation → evidence)
| # | Proposal objective | Where it's implemented | Verified by |
|---|--------------------|------------------------|-------------|
| 1 | Django PKI identity & key-exchange (registration, certificate, recipient lookup) | `accounts/models.py` (`PublicKey`), `accounts/views.py` (`PublicKeyView`, `RecipientKeyLookupView`) | `files/tests.py` PKI register + lookup flow |
| 2 | Client-side RSA/ECC encryption via Web Crypto API (server gets ciphertext only) | `frontend/src/crypto/webcrypto.js`, `files/models.py` stores blob + wrapped key only | `frontend/src/crypto/webcrypto.test.js` (E2EE round-trip, wrong-key rejection) |
| 3 | Tamper-proof audit logging via SHA-256 HMAC chaining | `audit/services.py` (`record_event`, `verify_chain`) | `audit/tests.py` (chain valid + tamper detected) |

**Test evidence:** `python manage.py test` → 3 passing (audit chain + full API flow);
`npm test` (frontend) → 2 passing (Web Crypto E2EE).

## Project structure
```
secure_file_sharing/
├── backend/
│   ├── config/            # settings, urls, wsgi (MySQL via PyMySQL)
│   ├── accounts/          # custom User + PKI PublicKey, register/lookup
│   ├── files/             # EncryptedFile (ciphertext only), upload/download
│   ├── audit/             # HMAC-chained AuditEvent + verify_chain
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── crypto/        # webcrypto.js (RSA-OAEP + AES-GCM) + keystore.js
        ├── api/client.js  # axios + JWT refresh
        └── pages/         # Login, Register, KeySetup, Send, Inbox, Audit
```

## Troubleshooting
- **`mysqlclient`/driver errors:** this project uses PyMySQL (pure Python) — no
  compiler needed. Ensure `.env` `DATABASE_URL` is `mysql://...`, or leave it
  empty to use SQLite.
- **CORS errors in the browser:** confirm `CORS_ALLOWED_ORIGINS` includes the
  Vite origin (`http://localhost:5173`).
- **"No private key on this device":** generate your identity key on the **My Key**
  page first — the private key is per-device and never uploaded.
