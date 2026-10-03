# Admin Implementation Plan

## Current State

- Repository-local copies of the SOW and approved prototype exist under `docs/reference/`.
- The current workspace started as a non-git starter folder with `AGENTS.md` and `START_HERE.md`.
- Local Node is `22.18.0`; the target is Node 24 LTS, so full install/build verification is blocked until Node 24 is available.

## Phase 0 - Foundation

- [x] Preserve existing starter files.
- [x] Copy immutable SOW and prototype references into `docs/reference/`.
- [x] Create scope, architecture, database, security, API and traceability docs.
- [x] Create pnpm/Turborepo workspace skeleton.
- [x] Add CI and Dockerfile scaffolds for the intended Node 24 deployment path.
- [ ] Install dependencies and commit `pnpm-lock.yaml` under Node 24.
- [ ] Generate Prisma migration from the initial schema.
- [ ] Run format, lint, type-check, unit tests and production builds.
- [ ] Verify CI after dependency install and lockfile generation.

Acceptance:

- Workspace layout matches the documented monorepo.
- Docs clearly distinguish SOW scope from prototype-only exclusions.
- No customer/staff portal UI is implemented in Phase 0.

## Phase 1 - Authentication, RBAC and Audit

- Implement Better Auth admin login, invite activation, forgot/reset/change password, session inventory and TOTP 2FA.
- Implement dynamic RBAC tables, default-deny policy middleware and object-access helpers.
- Implement append-only audit logs and security events.
- Add tests for enumeration resistance, throttling, reset expiry/single use, session revocation, 2FA, RBAC denial and last-super-admin protection.

## Phase 2 - Admin Shell and User/Role Management

- Build responsive admin shell with mobile drawer, collapsible desktop sidebar, top bar, breadcrumbs, theme switcher and account menu.
- Build admin users list/detail/invite/status/sessions.
- Build roles list/create/edit/archive and permission matrix.
- Add loading, empty, error, success and destructive-confirmation states.
- Verify at 390, 768, 1024 and 1440 px with accessibility checks.

## Phase 3 - Catalogue

- Build category/subcategory CRUD with max one nested level, sibling slug uniqueness, cycle rejection and archive dependency checks.
- Build service CRUD with images, duration, paise pricing, GST field, inclusions/exclusions, add-ons, skills, zones, SEO and publish/archive workflow.
- Add audit trail, permission tests and hierarchy/domain tests.

## Phase 4 - Staff Management

- Build staff profile, employee ID, contact, engagement classification (`SALARIED` or `GIG`), skills, services, zones, availability, schedules and documents.
- Build invite/activate/suspend/offboard controls.
- Show ratings/job performance only from real booking data.
- Exclude payroll, earnings, commission and payout UI.

## Phase 5 - Content and Contact List

- Build Privacy Policy and Terms content management with draft, preview, publish, revision history and rollback.
- Use client-supplied legal text or clearly labeled draft placeholders only.
- Build contact submission list/detail/search/filters/status/assignment/internal notes/export.
- Add retention setting and PII-safe logs.

## Phase 6 - Operational Admin Modules

- Build dashboard, bookings, customers, payments/invoices, reports and notifications.
- Implement booking state machine, atomic staff assignment and double-booking prevention.
- Implement Razorpay adapter, signed webhook verification, idempotent webhook processing and invoice/receipt output.
- Implement bounded exportable reports and provider readiness states.
