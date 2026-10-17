# PayPilot

PayPilot is a permission-first payment intelligence workspace for PayPal merchants. The repository contains a deterministic demo product plus a dependency-light TypeScript API: the agent proposes, the policy engine decides, and a human approval record gates every payment action.

## Run the product locally

The repository is pinned to Node `20.17.0` in `.nvmrc`. The default `mock` payment mode is
offline and deterministic; no PayPal or AI credentials are needed for the demo.

```bash
cd backend
npm ci
PAYMENT_MODE=mock npm start
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI connects to `http://localhost:8080` when the API is available and falls back to the deterministic local replay surface when it is not. Set `NEXT_PUBLIC_PAYPILOT_API_URL` to use another API URL.

### One-command Docker setup

```bash
docker compose up --build
```

This starts the web app at `http://localhost:3000`, the mock API at `http://localhost:8080`,
and a PostgreSQL 16 service for the portable schema. The current offline demo intentionally
keeps runtime state in memory so it remains usable without migrations or credentials; the SQL
schema is ready for the production persistence adapter.

## Backend domain layer

The backend provides a dependency-light Node HTTP API on top of typed, deterministic business context, policy parsing/enforcement, append-only audit events, cash-flow forecasting, anomaly detection, collection strategy, Scout/Strategist/Executor contracts, payment adapters, and an isolated integration layer.

```bash
cd backend
npm ci
PAYMENT_MODE=mock npm start # API on http://localhost:8080
npm test        # build plus focused unit and API tests
```

The integration layer is exported from `backend/src/integrations/`. It contains PayPal sandbox OAuth, orders, captures, refunds, invoices, transaction reporting, and webhook verification adapters, plus environment-selected NVIDIA NeMo and Gemini model clients. The API payment adapter supports `PAYMENT_MODE=live|mock|replay`; mock and replay are deterministic and never make network requests. Copy `backend/.env.example` to `backend/.env` for local configuration. The integration tests use injected fetch implementations and never need credentials.

The PostgreSQL DDL is in `backend/src/db/schema.sql`. It creates tables for business profiles, transactions, policies, workflows, audit logs, notifications, and approval requests. IDs are supplied by the application so the schema does not require PostgreSQL extensions.

### Build and run with Docker

```bash
docker build --target api -t paypilot-api .
docker run --rm -p 8080:8080 -e PAYMENT_MODE=mock paypilot-api
docker build --target web --build-arg NEXT_PUBLIC_PAYPILOT_API_URL=http://localhost:8080 -t paypilot-web .
docker run --rm -p 3000:3000 paypilot-web
```

The same checks are available from the repository root with `make test`, `make build`, and `make run`.

## Frontend architecture

The route entry points remain intentionally thin under `app/`; the product code now lives in `frontend/`:

```text
frontend/
├── app-shell.tsx                 # product shell, API connection, and view routing
├── components/
│   ├── dashboard/                # forecast, alerts, activity, metrics, priorities
│   ├── layout/                   # sidebar, topbar, notifications, context bar
│   └── ui/                       # shadcn-style Button, Card, Dialog, Switch, Table, etc.
├── features/paypilot/
│   ├── data.ts                   # deterministic demo scenarios
│   ├── types.ts                  # product domain types
│   └── views/                    # inbox, transactions, ask, forecast, risk, policies, workflows, audit
├── lib/api.ts                    # backend connection and proposal lifecycle
├── lib/utils.ts                  # cn(), formatting, shared helpers
└── styles/globals.css            # product tokens and component styling
```

The UI primitives follow the shadcn/ui composition pattern and use Radix primitives where interaction behavior matters (`Dialog` and `Switch`). Styling is now Tailwind CSS v4 through `@tailwindcss/postcss`, with design tokens and responsive composition kept in `frontend/styles/globals.css`. Framer Motion owns view transitions, notification drawer motion, staggered dashboard cards, and hover lift interactions.

## Product flows included

- Switch between six business contexts: freelancer, e-commerce, SaaS, agency, service business, and creator.
- Review the Agent Inbox with proactive alerts, approval drawers, blocked-policy states, and agent activity.
- Explore sandbox transaction records with search and status filters.
- Toggle runtime permission policies and draft a policy in natural language. Policy checks run
  before proposal creation, again at approval, and again immediately before execution.
- Parse and schedule a recurring workflow from a plain-English instruction.
- Ask the Scout / Strategist / Executor team questions in Ask PayPilot with tool traces.
- Run the collection what-if simulator and compare deterministic expected value.
- Review the audit timeline and verify the backend's append-only SHA-256 hash chain.
- Exercise onboarding, PayPal connection state, pause/disconnect/export/delete lifecycle, and
  notification read APIs from the API surface.

## Checks

```bash
cd frontend
npm run typecheck
npm run build
```

The single offline verification command is:

```bash
make test
```

It runs the backend build and 23 Node tests, then the frontend TypeScript check. For a full
production-style build run `make build`.

The current UI uses seeded scenario data so every demo path is deterministic and works without credentials. The API exposes replayable webhook ingestion, policy-protected proposal execution, SSE, and live PayPal adapter seams. PostgreSQL persistence and background scheduling remain explicit deployment work rather than hidden demo behavior; see `docs/ARCHITECTURE.md`.

## Deploy on Render

`render.yaml` defines the API service, Next.js web service, and a managed PostgreSQL database.
Keep `PAYMENT_MODE=mock` for a deterministic recording and switch to `live` only for a PayPal
sandbox proof. The demo path does not pretend that synthetic failures or disputes came from
PayPal organically; replay fixtures are explicitly deterministic.

```bash
render blueprint launch
```
