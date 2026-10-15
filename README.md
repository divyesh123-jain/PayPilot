# PayPilot

PayPilot is a permission-first payment intelligence workspace for PayPal merchants. This build is a polished hackathon demo surface: it ships the adaptive business context, agent activity feed, cash forecast, transaction explorer, permission policy editor, natural-language workflow builder, agent lab, and what-if simulator in one responsive Next.js app.

## Run the frontend locally

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend domain layer

The backend currently stops at the domain boundary: it has no HTTP server, payment integrations, or external API calls. The package provides typed, deterministic business context, policy parsing/enforcement, append-only audit events, cash-flow forecasting, anomaly detection, collection strategy, and Scout/Strategist/Executor contracts with a dry-run orchestrator.

```bash
cd backend
npm ci
npm start       # domain smoke entry point
npm test        # build plus the focused unit tests
```

The PostgreSQL DDL is in `backend/src/db/schema.sql`. It creates tables for business profiles, transactions, policies, workflows, audit logs, notifications, and approval requests. IDs are supplied by the application so the schema does not require PostgreSQL extensions.

### Build and run with Docker

```bash
docker build -t paypilot-domain .
docker run --rm paypilot-domain
```

The same checks are available from the repository root with `make test`, `make build`, and `make run`.

## Frontend architecture

The route entry points remain intentionally thin under `app/`; the product code now lives in `frontend/`:

```text
frontend/
├── app-shell.tsx                 # client-side product shell and view routing
├── components/
│   ├── dashboard/                # forecast, alerts, activity, metrics, priorities
│   ├── layout/                   # sidebar, topbar, notifications, context bar
│   └── ui/                       # shadcn-style Button, Card, Dialog, Switch, Table, etc.
├── features/paypilot/
│   ├── data.ts                   # deterministic demo scenarios
│   ├── types.ts                  # product domain types
│   └── views/                    # overview, transactions, policies, workflows, agent lab
├── lib/utils.ts                  # cn(), formatting, shared helpers
└── styles/globals.css            # product tokens and component styling
```

The UI primitives follow the shadcn/ui composition pattern and use Radix primitives where interaction behavior matters (`Dialog` and `Switch`). Styling is now Tailwind CSS v4 through `@tailwindcss/postcss`, with design tokens and responsive composition kept in `frontend/styles/globals.css`. Framer Motion owns view transitions, notification drawer motion, staggered dashboard cards, and hover lift interactions.

## Product flows included

- Switch between six business contexts: freelancer, e-commerce, SaaS, agency, service business, and creator.
- Review proactive alerts, cash forecast confidence bands, prioritized money actions, and agent activity.
- Explore sandbox transaction records with search and status filters.
- Toggle runtime permission policies and draft a policy in natural language.
- Parse and schedule a recurring workflow from a plain-English instruction.
- Ask the Scout / Strategist / Executor team questions in Agent Lab.
- Run the collection what-if simulator and compare expected value.

## Checks

```bash
npm run lint
npm run build
```

Backend checks:

```bash
make test
```

The current UI uses seeded scenario data so every demo path is deterministic and works without credentials. PayPal OAuth, webhooks, persistence, and live AI tool-calling are the next integration layer for the production hackathon build.
