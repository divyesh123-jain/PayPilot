# PayPilot

PayPilot is a permission-first payment intelligence workspace for PayPal merchants. This build is a polished hackathon demo surface: it ships the adaptive business context, agent activity feed, cash forecast, transaction explorer, permission policy editor, natural-language workflow builder, agent lab, and what-if simulator in one responsive Next.js app.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Frontend architecture

The route entry points under `app/` and product code all live self-contained in `frontend/`:

```text
frontend/
├── app/                          # Next.js App Router entry points (layout.tsx, page.tsx)
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

The current UI uses seeded scenario data so every demo path is deterministic and works without credentials. PayPal OAuth, webhooks, persistence, and live AI tool-calling are the next integration layer for the production hackathon build.
