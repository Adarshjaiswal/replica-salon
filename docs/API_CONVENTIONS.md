# API Conventions

## Base Shape

- All REST endpoints live under `/api/v1`.
- JSON is the default request and response format.
- Every response includes or is accompanied by an `X-Request-Id` header.
- Protected endpoints require a valid session, active account status and server-side RBAC authorization.

## Success Envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

For list endpoints:

```json
{
  "data": [],
  "meta": {
    "requestId": "req_...",
    "page": 1,
    "pageSize": 25,
    "total": 0,
    "sort": "createdAt:desc"
  }
}
```

Allowed admin table page sizes are `10`, `25`, `50` and `100`.

## Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [],
    "requestId": "req_..."
  }
}
```

Production error messages must not expose stack traces, SQL, secrets, tokens, OTPs or sensitive PII.

## Validation and Types

- Zod schemas in `packages/contracts` validate boundary input and output.
- API handlers parse input once at the boundary and pass typed values into services.
- OpenAPI is generated from shared contracts; handwritten route docs must not drift from schemas.

## Filtering, Sorting and Search

- Lists use explicit query parameters: `page`, `pageSize`, `search`, `sort`, `status`, date ranges and module-specific filters.
- Dates are ISO 8601 strings. Store UTC; display in the configured business timezone.
- Reports and exports must enforce bounded date ranges and permission checks.

## Idempotency

Require idempotency keys for:

- Payment order creation and webhook processing.
- Retryable admin commands such as invitations.
- Notification/outbox delivery retries.

Persist the key, caller scope, request hash, response summary, status and expiration.

## Webhooks

- Razorpay signature verification must use the raw payload required by the provider before mutation.
- Persist webhook event IDs and processing state.
- Webhook handlers must be idempotent and replay-safe.
