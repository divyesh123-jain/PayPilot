# PayPilot architecture

## Runtime shape

PayPilot is split into a Next.js client (`frontend/`) and a Node 20 TypeScript API
(`backend/`). The client owns presentation and deterministic seeded demo data. When
the API is available it calls `/api/session` and stages approval proposals through
`/api/simulate` and `/api/proposals/:id/approve`; if the API is unavailable the
interface remains usable in local replay mode.

The backend uses a small HTTP server so the demo can rebuild offline with only the
checked-in npm lockfiles. `PaymentAdapter` is the seam between the deterministic
domain and PayPal:

- `mock`: seeded transactions and local executions;
- `replay`: deterministic replay-labelled transactions for recording;
- `live`: PayPal sandbox REST calls through the existing typed client.

## Safety flow

1. A detector or agent creates a proposal; it never calls PayPal directly.
2. The policy evaluator produces `allow`, `require_approval`, or `deny`.
3. The API stores the proposal in demo state and records an audit event.
4. Approval re-checks the current policy. Execution re-checks it again immediately
   before the adapter call.
5. Webhook events are idempotent by event id and are exposed through the SSE stream.

All monetary values in the backend are integer cents. PayPal-sourced text is treated
as untrusted data. Synthetic records are clearly marked by the seed/replay adapter;
the demo never presents them as organically generated sandbox disputes or failures.

## Current persistence boundary

`backend/src/db/schema.sql` is the portable PostgreSQL schema for the planned tenant,
transaction, policy, workflow, approval, notification, and audit tables. The local
API service currently uses deterministic in-memory state so `npm test` works offline.
The next production hardening step is wiring those tables through Drizzle or Prisma
and moving proposal/webhook processing to a background worker. That boundary is kept
explicit so a judge can run the product without a database or credentials.

## API surface

See `backend/README.md` for the route list. The most important demo routes are:

- `GET /api/session`, `POST /api/session` for the demo tenant/context;
- `GET /api/transactions`, `/api/findings`, `/api/forecast`;
- `POST /api/simulate` and `/api/proposals/:id/{approve,reject,execute}`;
- `POST /api/webhooks/{ingest,replay}` with idempotency;
- `GET /api/audit/verify` and `GET /api/stream`.
