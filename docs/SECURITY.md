# Security Model

## Threat Model

Primary risks:

- Account takeover of admin, customer or staff accounts.
- Privilege escalation through weak RBAC or client-side-only checks.
- Cross-tenant/object access to customer, staff, booking or payment data.
- Payment/webhook replay or signature bypass.
- Sensitive data exposure through logs, errors, exports or audit trails.
- Stored XSS through rich policy/content editing.
- Abuse of login, reset, invitation, OTP, export or contact endpoints.

## Authentication Controls

- Admin registration is invite-only; no public admin signup route.
- Seed the first `SUPER_ADMIN` through a documented bootstrap command and environment input, never a hardcoded password.
- Forgot-password always returns the same user-facing response for existing and non-existing addresses.
- Reset tokens and OTPs are short-lived, hashed where stored, single-use and rate-limited.
- Password reset revokes other sessions and records a security event.
- Change password requires an active session and current-password verification.
- TOTP 2FA is required for `SUPER_ADMIN` and supported for other admin roles.
- Sessions use secure `HttpOnly`, `Secure`, `SameSite` cookies and rotate after authentication/security changes.

## Authorization Controls

- Default deny every protected route.
- API middleware enforces authentication, account status, RBAC permission and object-level ownership.
- Menus and buttons may be permission-aware, but they are only UX.
- Prevent self-promotion and privilege escalation.
- Prevent demotion/removal/disablement of the last active super admin.
- Protect system roles while allowing authorized custom roles.

## Data Protection

- Never log passwords, OTPs, reset tokens, session tokens, raw webhook secrets, provider secrets or full sensitive PII.
- Use Pino redaction and request IDs across API and worker logs.
- Prefer archive/disable over hard delete for business entities.
- Store money as integer paise or exact decimals.
- Store timestamps in UTC and display through the business timezone.
- Sanitize rich text on the server before storage or rendering.

## API and Platform Hardening

- Helmet with deliberate CSP, HSTS and secure headers in production.
- Strict CORS allowlist and correct proxy trust.
- CSRF protection for cookie-authenticated mutations.
- Input size limits, file type/size validation, safe filenames and presigned media uploads.
- Parameterized Prisma queries; no SQL string concatenation from user input.
- Rate limits for auth, reset, invitation, OTP, contact, export and provider endpoints.
- Health/readiness endpoints, graceful shutdown and DB connection cleanup.

## Audit Logging

Append-only audit records cover:

- Auth successes/failures and security changes.
- Admin invitations, activation, suspension and session revocation.
- Role and permission changes.
- Category, service, staff, content create/update/archive/publish actions.
- Booking assignment/status changes.
- Payment/refund/invoice state changes.
- Exports and sensitive record access where appropriate.

Audit entries include actor, action, resource type/id, safe before/after summary, request ID, timestamp and privacy-safe context.

## Residual Risks and Client Responsibilities

Security also depends on client-owned production accounts, legal notices, policy wording, credential rotation, KYC/provider approval, infrastructure backups and staff operational processes. The application must document these responsibilities and must not claim to be "fully secure."
