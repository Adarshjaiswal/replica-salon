# Replica Home Salon Repository Instructions

## Read before working

Before planning or editing, read:

1. `docs/SCOPE_MATRIX.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DATABASE.md`
4. `docs/SECURITY.md`
5. `docs/ADMIN_IMPLEMENTATION_PLAN.md`
6. The SOW and approved responsive prototype in `docs/reference/`

The SOW controls included/excluded functionality. The prototype is the visual baseline only for in-scope features.

## Product boundaries

- Build admin first. Do not start customer or staff portal UI unless the current task explicitly says so.
- Support account types `CUSTOMER`, `STAFF` and `ADMIN` in the identity/data model.
- Staff may be classified as `SALARIED` or `GIG`.
- Do not implement payroll, salary/commission calculations, incentives, deductions, payouts or earnings statements in current scope.
- Do not implement customer-delay timers/charges, native mobile apps, guaranteed background GPS, inventory, memberships, wallet/loyalty, subscriptions, gift cards or a production generative-AI assistant.
- Never invent legal policy text. Privacy, Terms, refund and cancellation content must be client supplied or clearly marked as draft placeholder content.

## Architecture

- Use the pnpm/Turborepo monorepo layout documented in `docs/ARCHITECTURE.md`.
- Use current patched stable releases within the approved major versions: Node.js 24 LTS, Next.js 16, React 19, Express 5, Tailwind CSS 4, Prisma and MySQL.
- Use strict TypeScript everywhere. Do not use `any`; use `unknown` plus narrowing.
- Keep public SEO pages server-first. Add client components only when interaction requires them.
- Keep business rules in API/domain services, not React components or route handlers.
- Keep provider integrations behind interfaces/adapters.
- Do not add a production dependency without documenting why existing tools cannot solve the need.
- Do not introduce Redis, GraphQL, microservices or Kubernetes without measured need and explicit approval.

## Code standards

- Prefer small cohesive modules, explicit names and dependency injection at boundaries.
- Validate all environment variables at startup and every external input at the boundary.
- Use shared Zod schemas for API requests/responses and generate OpenAPI from those schemas.
- Use a consistent API error envelope with a request ID; never expose stack traces in production.
- Store money as integer paise or an exact decimal type, never JavaScript floating-point.
- Store timestamps in UTC; display through the configured business timezone.
- Use Prisma transactions for multi-record invariants.
- Use idempotency keys for payment, webhook and retryable command flows.
- Prefer archive/disable to hard delete. Explain and test any hard-delete path.
- Keep migrations append-only after sharing; never rewrite an applied production migration.
- Keep components accessible: semantic HTML, labels, focus states, keyboard support and WCAG 2.2 AA contrast.
- Use semantic theme tokens; do not scatter raw brand colors through components.

## Authentication and authorization

- Admin registration is invite-only. Never add a public admin signup route.
- Enforce authentication, account status, RBAC permission and record ownership on the server for every protected operation.
- UI visibility is not authorization.
- Default-deny permissions.
- Forgot-password responses must not reveal whether an account exists.
- Reset tokens/OTPs are short-lived, hashed where stored, single-use and rate-limited.
- Change password requires a valid session and current-password verification.
- Revoke other sessions after password reset; rotate sessions after authentication/security changes.
- Require TOTP 2FA for `SUPER_ADMIN`.
- Never log passwords, session tokens, OTPs, reset tokens, provider secrets, raw webhook secrets or full sensitive PII.
- Audit login/security events, permission changes, publishing, assignment, payment/refund state changes and destructive actions.

## Admin UI rules

- Preserve the approved lavender-led visual direction while improving it into an enterprise-grade admin experience.
- Implement light, dark and system modes without hydration flicker.
- Design and verify at 390, 768, 1024 and 1440 px.
- Use a mobile drawer/collapsible navigation; never make mobile users depend on a desktop-only table.
- Data tables must support appropriate search, filters, sorting, column visibility and 10/25/50/100 pagination.
- Every page needs loading, empty, error, success and destructive-confirmation states.
- Do not ship decorative buttons or fake interactions. Every enabled control must work end to end.
- Do not display seeded/mock values as if they were live production data.

## Testing and verification

- Add/update tests with the implementation.
- Test permission denial as well as success paths.
- Test object-level access to prevent cross-customer and cross-staff data exposure.
- Test auth throttling, generic reset responses, token expiry/single use and session revocation.
- Test category hierarchy/cycle rules, slug uniqueness and dependency-safe archive behavior.
- Test payment/webhook signature and idempotency logic with provider test fixtures.
- Run format, lint, type-check, unit tests, API integration tests and production builds before declaring work complete.
- Run critical Playwright flows and accessibility checks for affected screens.
- Review the final diff for security regressions, scope creep, dead code and accidental secrets.

## Completion report

At the end of each phase, report:

- What was implemented
- Migrations/API routes/UI routes added
- Tests and checks run with results
- Security/scope decisions made
- Remaining blockers or client-owned credentials/content needed

Do not claim completion when a required check is failing. Do not silently replace a blocked third-party integration with production-looking fake behavior; use an explicit development adapter and document the production prerequisite.

