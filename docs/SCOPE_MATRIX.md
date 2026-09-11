# Replica Home Salon Scope Matrix

## Source Precedence

1. `docs/reference/replica-home-salon-sow-v1.1.pdf` controls contractual scope, acceptance, exclusions, commercial limits and client responsibilities.
2. `docs/reference/salon-replica-ux-prototype-responsive.html` is the visual and interaction baseline only for SOW-included screens.
3. Repository instructions and implementation docs clarify engineering approach and sequencing.

## Current Build Boundary

The repository is being built admin-first. Customer and staff data models, API contracts and provider adapters should be forward-compatible, but customer and staff portal UI must not be implemented until the admin release is approved or a task explicitly requests it.

## Included SOW Capability

| Area            | SOW Included                                                                                                 | Admin-First Handling                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Dashboard       | Booking, revenue, active staff, rating, live operation and active-booking summaries.                         | Build as authenticated admin dashboard with honest empty states until real booking/payment data exists. |
| Bookings        | Create, search, filter, assign/reassign, track, reschedule, cancel, complete and review payment state.       | Build admin operations queue, detail views, status history and assignment controls.                     |
| Customers       | Profiles, contact details, addresses, booking history, spend, ratings, support context and status/segment.   | Build admin customer management backed by customer-ready schema.                                        |
| Employees/staff | Profiles, employee IDs, skills, zones, availability, documents, schedules, ratings and job performance.      | Build staff management with `SALARIED` and `GIG` engagement classification only.                        |
| Catalogue       | Categories, subcategories, services, duration, price, GST/tax field, inclusions, eligible skills and status. | Build category/service CRUD, hierarchy rules, publishing and dependency-safe archive.                   |
| Payments        | Payment status, basic refunds/status recording, settlements, invoices and receipts.                          | Build Razorpay adapter boundary, webhook/idempotency model and admin finance views.                     |
| Reports         | Operational KPIs and exportable booking, revenue, customer, staff and service-performance views.             | Build bounded, permission-checked reports after source modules exist.                                   |
| Notifications   | Event-based OTP/SMS/email/WhatsApp/push rules where provider accounts/templates are available.               | Build templates/rules/outbox/logs and explicit unconfigured-provider states.                            |
| Roles           | Module-level view, create/edit, approve and delete controls.                                                 | Build dynamic database RBAC with server enforcement and audit.                                          |

## Explicit Exclusions

| Excluded Area                 | Examples                                                                                                 | Production Rule                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Payroll and earnings          | Salary, commission, incentives, deductions, payout statements, payroll approval, bank payout automation. | Do not create payroll routes, navigation, calculations or schemas beyond staff engagement classification. |
| Delay charges                 | Customer-delay timers, grace-period fees, per-minute charges, waivers and disputes.                      | Omit timer/charge UI and data behavior even if the prototype displays it.                                 |
| Native apps/background GPS    | Native Android/iOS and guaranteed browser-closed tracking.                                               | Build responsive web only; document browser/provider limitations.                                         |
| Advanced marketplace/dispatch | Multi-branch franchise marketplace, route optimization and complex dispatch.                             | Keep simple zone/assignment model.                                                                        |
| Extension commerce            | Inventory, memberships, wallet/loyalty, subscriptions, gift cards and product commerce.                  | Omit navigation and production behavior for these modules.                                                |
| Advanced AI                   | Generative AI chatbot, model/API charges, knowledge-base training and moderation tooling.                | Allow only contextual help/support links if later requested; no production AI assistant.                  |
| Complex integrations          | CRM/accounting/ERP, multiple payment gateways or multiple messaging/maps providers.                      | Implement one adapter per agreed provider family and dev/test adapters.                                   |
| Bulk migration                | Large legacy import or cleanup.                                                                          | Seed deterministic fake development data only.                                                            |

## Prototype-Only Items To Omit

The approved prototype includes visuals that are excluded by the SOW. They must not enter production navigation, schema behavior, API contracts or admin UI:

- Payroll navigation, payroll tables, fixed salary, commission, incentives, deductions and net payout views.
- Staff earnings preview and commission display.
- Customer delay policy, delay timers, delay charge collection, waivers and disputes.
- Glow Club, memberships, wallet cashback and loyalty segmentation as a production feature.
- AI assistant branding or production chatbot behavior.
- Employee "earnings" tab or payout statements.
- Any fake production metrics shown in prototype dashboard cards.

## Client-Owned Inputs

The client must provide approved business content and credentials before production enablement:

- Domain/DNS, hosting/server, managed MySQL and production storage.
- Razorpay merchant account, API keys and webhook secrets.
- OTP/SMS, email, WhatsApp/push and maps/geolocation accounts and approved templates.
- Logo, brand assets, service catalogue, pricing, images, areas, staff data and assignment rules.
- Booking, cancellation, refund, tax, privacy and support policies approved by the client.
