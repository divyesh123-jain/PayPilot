# PayPilot backend API

The backend is a dependency-light Node 20 HTTP API. It uses the existing domain and
integration modules and keeps money as integer cents.

```bash
npm ci
PAYMENT_MODE=mock npm test
PAYMENT_MODE=mock npm start
```

The server listens on `PORT` (default `8080`). `PAYMENT_MODE=mock` uses the seeded
scenario, `replay` uses a deterministic replay fixture, and `live` calls PayPal using
the credentials in `.env`.

For a clean container build and offline deterministic run:

```bash
docker build -t paypilot-backend .
docker run --rm -p 8080:8080 -e PAYMENT_MODE=mock paypilot-backend
```

Important routes include `GET /api/session`, `/api/seed`, `/api/transactions`,
`/api/clients/:id/profile`, `/api/findings`, `/api/forecast`, `POST /api/simulate`,
proposal lifecycle routes under `/api/proposals/:id/{approve,reject,execute}`, policy
and workflow parse/save/run routes, `/api/webhooks/{ingest,replay}`, `/api/audit/verify`,
and the SSE stream at `/api/stream`.

The REST surface also includes business/profile switching, client profiles, filtered
and paginated transactions, policy violations, persisted in-memory workflows, role-
scoped agent traces, onboarding and connection state, notification read state, pause /
disconnect / export / delete lifecycle controls, and development replay/reset controls
under `/api/dev`. `POST /api/simulate` with `discountPct` is a side-effect-free expected
value calculation; without it the endpoint stages a policy-checked proposal.
