# DepoCat

DepoCat is a secure deposition tracking app for a small legal team.

## Current capabilities

- Database-backed login for an owner and paralegal
- Hashed passwords stored in SQLite
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

This repo is now suitable for local development and an internal pilot. For real online production use, the next step should be:

- Move from SQLite to a managed PostgreSQL database
- Deploy behind HTTPS
- Store secrets in the host environment, not in `.env`
- Add MFA and password reset flows
- Add role-managed user administration
- Add encrypted backups and operational logging
