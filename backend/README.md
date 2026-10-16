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

Important routes include `GET /api/session`, `/api/seed`, `/api/transactions`,
`/api/findings`, `/api/forecast`, `POST /api/simulate`, proposal lifecycle routes
under `/api/proposals/:id/{approve,reject,execute}`, policy and workflow parse/save/run
routes, `/api/webhooks/{ingest,replay}`, `/api/audit/verify`, and the SSE stream at
`/api/stream`.
