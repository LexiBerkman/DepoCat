# DepoCat IT Review Notes

## Current Security Controls

- Session cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` in production.
- Sessions are signed server-side and backed by a database session table.
- Protected pages require a validated session and owner-only actions use role checks.
- Login attempts are rate-limited by recent failed attempts on email and IP.
- Security headers are applied in middleware/proxy, including CSP, HSTS in production, frame denial, and restricted permissions policy.
- All database writes happen in server actions; secrets remain server-side.
- Workbook import is limited to `.xlsx` and `.csv`, with a 10 MB file-size cap and basic type validation.
- Audit logging exists for login/logout, password events, imports, matter updates, note updates, communication logging, and deletes.

## Current Operational Constraints

- Roles today are `OWNER` and `PARALEGAL`.
- Password resets generate a temporary password in-app for owner use.
- Imports are available to authenticated users.
- The app currently uses username/password auth only.

## Likely IT Review Questions

- Multi-factor authentication is not implemented yet.
- CSP still allows inline styles/scripts due to the current Next.js app setup.
- Temporary password display in the owner reset flow may need policy approval.
- If the team wants tighter separation of duties, import permissions may need to be restricted to `OWNER`.
- If this will hold production legal matter data long-term, IT may want backup/retention guidance and confirmation of encryption-at-rest from hosting.

## Recommended Next Steps

1. Add MFA or SSO for production deployment.
2. Decide whether imports should remain available to paralegals.
3. Replace temporary-password display with a more controlled reset workflow if policy requires it.
4. Review Vercel environment-variable handling, access controls, and audit access for the production project.
5. Confirm database backup, retention, and incident-response expectations with hosting.
