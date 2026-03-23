# DepoCat

DepoCat is a secure deposition tracking app for a small legal team.

## Current capabilities

- Database-backed login for an owner and paralegal
- Hashed passwords stored in the configured Postgres database
- Revocable server-side sessions backed by the database
- Login attempt tracking and brute-force throttling
- Matter, deponent, and opposing-counsel tracking
- Excel import for bulk matter updates
- Outlook-friendly `mailto:` links
- Lightweight audit trail for sign-ins, imports, and matter updates

## Local setup

1. Review `.env` and change the owner/paralegal emails and passwords.
2. Run `npm install`.
3. Run `npm run setup`.
4. Run `npm run dev`.

## Important security note

This repo is now suitable for local development and a hosted pilot. For real online production use, the next step should be:

- Deploy behind HTTPS
- Store secrets in the host environment, not in `.env`
- Add MFA and password reset flows
- Add role-managed user administration
- Add encrypted backups and operational logging

## Security posture

DepoCat now includes:

- Password hashing with `bcrypt`
- Signed `httpOnly` session cookies
- Server-side session revocation
- Login throttling after repeated failed attempts
- Strict security headers and `no-store` responses
- Owner-only visibility into team accounts and audit activity

It is stronger than a basic internal app, but it should not be presented as fully hardened legal-tech production security until it is deployed with managed infrastructure, TLS, MFA, backup strategy, and monitored operations.
