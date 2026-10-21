# PayPilot project status

**Status date:** 2026-10-21  
**Scope of this status:** frontend product readiness work plus the current backend API surface.

## Completed

### Onboarding and first-run experience

- Reworked onboarding around a real first-run flow instead of a prefilled demo workspace.
- Removed hardcoded user identity, preverified email, connected-account defaults, fake clients,
  synthetic findings, sample proposals, failure simulation, retry simulation, and sample-data
  controls from the onboarding experience.
- Added required-field validation for work email, name, business name, consent, PayPal connection,
  and reply-to email.
- Added accessible validation feedback with required labels, `aria-describedby`, `role="alert"`,
  and keyboard-accessible preset and policy selectors.
- Added all six business presets: freelancer, e-commerce, SaaS, agency, service business, and
  creator.
- Added a final setup review summary before completing onboarding.
- Added notification preferences for email alerts, in-app alerts, and daily summaries.
- Kept onboarding props and completion payloads compatible with `app-shell.tsx`.

### Authentication and landing experience

- Removed one-click demo accounts and prefilled sign-in credentials.
- Removed simulated demo approval and demo-oriented sign-in copy.
- Replaced sandbox/internal-host and sample-preview wording on the landing page with
  customer-facing product language.
- Updated the welcome state to describe pending account-backed sync and proposal availability
  honestly.

### Backend and API

- Added runtime notifications for:
  - approval-required proposals;
  - policy-blocked actions;
  - accepted PayPal webhook events;
  - PayPal disconnections; and
  - scheduled workspace deletion.
- Added notification creation to the existing SSE event stream.
- Persisted onboarding notification preferences in backend onboarding state.
- Added backend API coverage for runtime notification creation, notification acknowledgement,
  and onboarding notification metadata.

### Other screens and shared UI

- Wired the notification drawer to `GET /api/notifications` instead of hardcoded messages.
- Added unread notification counts, loading/error states, and mark-as-read behavior.
- Added a proper empty state to the what-if dialog when connected history is unavailable.
- Removed misleading sandbox wording from the transactions and sent-message views.
- Fixed nullable empty-state handling in the sent-message screen.
- Kept clients, forecast, risk, inbox, policy, workflow, and audit screens account-aware where
  live data is unavailable.

## Verified checks

The following checks were run successfully:

```text
backend:  npm test                 24 tests passed
frontend: npm run typecheck       passed
frontend: npm run build           passed
frontend: Prettier checks         passed for touched files
repo:     git diff --check        passed
```

## Pending before a production launch

### Authentication and authorization

- Connect the sign-in and magic-link UI to a real authentication provider or backend auth API.
- Replace local browser session assumptions with signed, expiring sessions.
- Enforce tenant identity and roles server-side instead of relying on request-provided role
  headers.

### Persistence and asynchronous processing

- Wire the PostgreSQL schema into the runtime service. The current API service remains in-memory.
- Persist onboarding, notifications, proposals, workflows, policy versions, webhooks, and audit
  records across restarts.
- Move PayPal sync, webhook processing, proposal execution, and scheduled workflows to a durable
  background worker.

### PayPal production integration

- Complete live PayPal OAuth/token lifecycle handling, including reauthorization and revocation.
- Verify webhook signatures before accepting live events.
- Add provider timeout, retry, rate-limit, and circuit-breaker behavior.
- Confirm production scopes and remove any sandbox-only deployment configuration before launch.

### Frontend product completion

- Load clients, sent messages, obligations, and workflow history from persisted backend records
  instead of keeping editable state only in the browser.
- Add real pagination and server-side filtering for large transaction and audit datasets.
- Replace remaining static metrics and copy in dashboard views with API-backed values.
- Add end-to-end browser coverage for onboarding, connection failure/retry, approval, disconnect,
  notification acknowledgement, and empty states.

### Operations and launch hardening

- Restrict CORS from `*` to approved production origins.
- Add structured logging, request IDs, metrics, alerting, and error reporting.
- Add secrets management and environment validation at startup.
- Add CSRF protection where browser credentials are used, plus request authentication and abuse
  limits.
- Run a production deployment rehearsal with real database, PayPal sandbox, webhook, and rollback
  paths.

## Working-tree notes

The repository currently contains additional uncommitted changes outside the focused work above,
including changes to `README.md`, `app-shell.tsx`, `data.ts`, settings, several dashboard views,
and backend API files. Those changes were preserved rather than reset or overwritten.

`frontend/features/paypilot/views/overview-view.tsx` is currently marked deleted in the working
tree. Confirm that deletion is intentional before committing or deploying.

This document records status only; it does not imply that the current working tree is ready to
commit as one clean, reviewed change set.
