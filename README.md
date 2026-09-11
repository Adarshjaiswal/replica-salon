# Replica Home Salon

Admin-first modular monolith for Replica Home Salon.

## Current Status

This repository has been bootstrapped with:

- Immutable SOW/prototype references in `docs/reference/`.
- Scope, architecture, database, security, API and traceability docs.
- pnpm/Turborepo workspace skeleton for `apps/web`, `apps/api`, `apps/worker` and shared packages.

The target runtime is Node.js 24 LTS. The local shell currently reports Node 22.18.0, so dependency installation, lockfile generation and verification should be run after switching to Node 24.

## Setup

```sh
nvm use
pnpm install
docker compose up -d mysql mailpit
pnpm db:generate
pnpm type-check
pnpm test
pnpm build
```

## Source Material

- `docs/reference/replica-home-salon-sow-v1.1.pdf`
- `docs/reference/salon-replica-ux-prototype-responsive.html`

The SOW controls scope. Prototype-only excluded features such as payroll, delay charges, wallet/membership behavior and production AI assistant must not be implemented.
