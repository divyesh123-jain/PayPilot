# PayPal setup for the PayPilot hackathon

This document explains what the team needs to connect PayPal, what the current repository
already supports, and what must still be built for a real multi-merchant production connection.

## Short answer

For the fastest reliable hackathon demo, use **one PayPal Sandbox business account** as the
PayPilot merchant account:

1. Create a PayPal Developer account.
2. Create a Sandbox business account and a Sandbox personal account.
3. Create a REST API app in the PayPal Developer Dashboard.
4. Copy the app's Sandbox **Client ID** and **Secret**.
5. Set `PAYMENT_MODE=live`, the PayPal credentials, and the Sandbox API base URL in the backend.
6. Start the backend and frontend.
7. Exercise transaction sync, proposal creation, approval, execution, and webhook flows with
   Sandbox data.

This is a **single-merchant demo connection**. It is not the same as allowing every PayPilot
customer to connect their own PayPal account.

For a real SaaS product where each customer connects their own merchant account, PayPilot needs a
PayPal partner/platform integration, merchant onboarding, tenant-scoped credential/token storage,
and a real authorization callback. PayPal's platform documentation says the Complete Payments
Platform is for approved partners; sandbox testing can happen before approval, but production
platform calls require the appropriate approval.

## Official resources checked

- [PayPal REST API getting started](https://developer.paypal.com/api/rest/)
- [PayPal REST authentication](https://developer.paypal.com/api/rest/authentication/)
- [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
- [PayPal Sandbox testing guide](https://developer.paypal.com/sandbox-testing/overview/)
- [PayPal Webhooks overview](https://developer.paypal.com/api/rest/webhooks/)
- [Integrate PayPal webhooks](https://developer.paypal.com/api/rest/webhooks/rest/)
- [PayPal JavaScript SDK v6 setup](https://developer.paypal.com/sdk/js/set-up/)
- [PayPal Invoicing overview](https://developer.paypal.com/invoicing/about/)
- [PayPal Invoicing API quick start](https://developer.paypal.com/api/invoicing/)
- [PayPal Subscriptions overview](https://developer.paypal.com/subscriptions/about/)
- [PayPal platform/partner getting started](https://developer.paypal.com/platforms/get-started/)

PayPal's current REST documentation confirms that REST calls use OAuth 2.0 access tokens. The
Sandbox uses `https://api-m.sandbox.paypal.com`; production uses the corresponding live API host.

## 1. Accounts and credentials required

### PayPal Developer account

Create or use a PayPal Developer account at the [Developer Dashboard](https://developer.paypal.com/dashboard/).
Verify the account email so Sandbox tools are available.

### Sandbox accounts

Create at least:

- **Sandbox business account** — the merchant/seller whose transactions PayPilot reads.
- **Sandbox personal account** — the buyer used to generate test payments and order activity.

Create and manage these at the [Sandbox accounts page](https://developer.paypal.com/developer/accounts).
Use the Sandbox credentials at [sandbox.paypal.com](https://www.sandbox.paypal.com/), not a live
PayPal login.

### REST app

In the Developer Dashboard:

1. Open **Apps & Credentials**.
2. Select the **Sandbox** environment.
3. Create or select a REST API app.
4. Copy the **Client ID** and reveal/copy the **Secret**.
5. Configure the app's webhook URL and event subscriptions when a public HTTPS endpoint is
   available.

Never put the Secret in the browser, Next.js client bundle, Git, screenshots, or chat messages.

## 2. Environment configuration for this repository

Copy the example file and fill in local-only values:

```bash
cd backend
cp .env.example .env
```

For a real PayPal Sandbox API call in the current code, the relevant values are:

```dotenv
# Select the live PayPal adapter path. In this repository, "live" means
# the configured PayPal API endpoint; use the Sandbox base URL below for testing.
PAYMENT_MODE=live

# Optional integration-mode flag used by direct integration/model factories.
# The API payment adapter is selected by PAYMENT_MODE above.
PAYPILOT_INTEGRATION_MODE=live
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

For an offline demo with no PayPal requests:

```dotenv
PAYMENT_MODE=mock
PAYPILOT_INTEGRATION_MODE=mock
```

The repository ignores `.env` and `.env.*` files. Only commit placeholders in
`backend/.env.example`.

## 3. Verify OAuth before starting the full app

PayPal REST credentials are exchanged for an access token using HTTP Basic authentication:

```bash
curl -sS -X POST "https://api-m.sandbox.paypal.com/v1/oauth2/token" \
  -u "${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}" \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

A successful response should contain `access_token`, `token_type`, and `expires_in`.

If this fails:

- confirm the app is in the **Sandbox** environment;
- confirm the Client ID and Secret are copied from the same app;
- confirm there are no extra spaces or quotes in `.env`;
- confirm `PAYPAL_BASE_URL` is the Sandbox host; and
- do not use a personal Sandbox account password as an API Secret.

## 4. Current PayPilot PayPal implementation

The repository already contains a typed `PayPalClient` in
`backend/src/integrations/paypal.ts`.

Currently implemented at the integration layer:

- OAuth access-token acquisition and in-memory token caching;
- PayPal Orders API create/get/capture;
- capture refunds;
- Invoicing API create/send/get methods;
- Transaction Reporting API reads;
- PayPal webhook-signature verification via PayPal's verification endpoint;
- deterministic mock mode for tests.

The live payment adapter in `backend/src/api/payment-adapter.ts` currently:

- reads transaction reporting data;
- maps PayPal transaction records into PayPilot transactions; and
- creates/captures an Order when an approved payment proposal is executed.

The API exposes related application routes including:

```text
GET  /api/session
GET  /api/transactions
POST /api/transactions/refresh
GET  /api/connections
POST /api/connections/connect
POST /api/connections/disconnect
POST /api/simulate
POST /api/proposals/:id/approve
POST /api/proposals/:id/execute
POST /api/webhooks/ingest
GET  /api/notifications
GET  /api/stream
```

## 5. Important current limitation: “Connect PayPal” is not OAuth yet

The current `POST /api/connections/connect` route calls the in-memory service's
`connectPayPal()` method. It changes the application connection state, but it does **not**:

- redirect a user to PayPal;
- receive an authorization callback;
- exchange an authorization code for a merchant token;
- store a per-merchant refresh/access token; or
- bind a PayPal merchant identity to a PayPilot tenant.

Therefore, do not describe the current button as a complete customer OAuth connection in a
hackathon presentation. For the single-merchant demo, the server-side Sandbox app credentials
are the connection. For production SaaS onboarding, implement the partner/onboarding flow below.

## 6. Recommended hackathon demo flow

Keep the scope narrow and demonstrable:

1. User completes PayPilot onboarding and accepts read/draft permissions.
2. Backend starts with one configured Sandbox business account.
3. `POST /api/transactions/refresh` imports Sandbox transaction history.
4. PayPilot calculates findings, clients, and forecast data.
5. The agent creates a policy-checked proposal.
6. The user reviews and approves the proposal.
7. The backend re-checks policy immediately before execution.
8. The backend creates/captures the allowed PayPal action.
9. A verified/idempotent webhook updates the local record and notification stream.

For judging, show the safety boundary clearly:

- no action before human approval;
- policy denial before an external call;
- audit event for proposal, approval, and execution;
- webhook idempotency; and
- a visible failure state when credentials or PayPal are unavailable.

## 7. Webhooks: required for a credible connection

PayPal sends HTTPS POST requests to a subscribed listener URL. The listener must be reachable
over public HTTPS and return a 2xx response. PayPal can retry failed deliveries up to 25 times
over 3 days.

### Sandbox webhook setup

1. Deploy the API to a public HTTPS URL, or use a secure HTTPS tunnel for local testing.
2. In the REST app's webhook settings, add the listener URL, for example:
   `https://api.example.com/api/webhooks/paypal`.
3. Save the returned **Webhook ID**.
4. Subscribe only to events needed for the demo, such as:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.SALE.COMPLETED` when using the relevant legacy/recurring flow
   - invoice/subscription events only if those features are enabled
5. Store the Webhook ID as a secret configuration value.
6. Preserve the raw request body and PayPal transmission headers.
7. Verify the signature before processing the event.
8. Deduplicate by PayPal event ID and/or an idempotency key.

The current repository has an ingest route and a typed PayPal verification client, but the HTTP
route still accepts an already-presented event body and does not yet perform the full verification
and raw-body handling needed for production. That is a launch-blocking follow-up.

## 8. Per-merchant production connection

If each PayPilot customer must connect their own PayPal merchant account, the architecture needs:

### PayPal-side requirements

- PayPal platform/partner onboarding and approval where required;
- a Platform REST app and live credentials;
- seller/merchant onboarding configuration;
- redirect and return URLs;
- webhook subscriptions associated with the correct app/merchant context;
- production business account approval and capability review.

PayPal's platform documentation explicitly describes the Complete Payments Platform as an approved
partner product. Do not assume a normal Sandbox REST app automatically grants production
multi-merchant access.

### PayPilot-side requirements

- tenant/user identity and authenticated sessions;
- a server route to start PayPal authorization;
- a callback route that validates state and exchanges the authorization result;
- encrypted, tenant-scoped token storage;
- token refresh and revocation handling;
- stored PayPal merchant ID and connection status;
- per-tenant webhook routing and verification;
- disconnect/reconnect behavior;
- audit records for authorization, scopes, refresh, revocation, and disconnect;
- no PayPal Secret or access token in frontend state or logs.

## 9. Feature selection for the hackathon

### Recommended for the first demo

| Capability | Recommendation | Why |
| --- | --- | --- |
| REST API / OAuth | Required | Authenticates server calls and proves the core integration. |
| Transaction Reporting | Required | Powers the PayPilot intelligence and forecast story. |
| Orders / Payments | Required if executing payments | Gives the approval-to-action proof point. |
| Invoicing API | Strongly recommended | Best fit for overdue invoice monitoring and approved reminders. |
| Webhooks | Required for a credible live flow | Keeps state current and proves event handling. |
| JavaScript SDK v6 | Optional | Needed for a buyer-facing checkout, not for merchant reporting. |
| Subscriptions | Optional | Add only if the demo persona is SaaS/subscription-heavy. |
| Disputes | Optional | Add read-only risk signals if time allows. |
| Payouts | Out of scope for v1 | Higher operational and compliance surface. |
| Pay Later / donations | Out of scope for v1 | Not necessary for the PayPilot collection story. |

### Why Invoicing is the best PayPal capability for PayPilot

PayPal Invoicing is designed for a specific customer, supports a hosted payment page, invoice
status tracking, reminders, and API-based create/send/manage operations. That maps directly to:

- overdue invoice detection;
- tone-calibrated draft reminders;
- explicit human approval; and
- tracking whether the invoice became paid, overdue, cancelled, or otherwise changed.

## 10. Security and launch checklist

Before showing a live Sandbox connection:

- [ ] Secrets exist only in backend environment configuration.
- [ ] Frontend never receives `PAYPAL_CLIENT_SECRET` or raw access tokens.
- [ ] `PAYMENT_MODE=live` is set only when Sandbox credentials are available.
- [ ] The UI says Sandbox when the endpoint is Sandbox, and does not claim live money movement.
- [ ] All outbound actions pass policy evaluation and human approval.
- [ ] Amounts are validated server-side in integer cents.
- [ ] PayPal webhook signatures are verified before event processing.
- [ ] Webhook events are idempotent.
- [ ] Requests and errors do not log secrets, authorization headers, or full tokens.
- [ ] CORS is restricted to the deployed frontend origin before production.
- [ ] Database persistence is enabled before relying on the connection across restarts.
- [ ] PayPal API failures show an honest retry/reconnect state.

## 11. Local run commands

Offline mode:

```bash
cd backend
npm ci
PAYMENT_MODE=mock npm test
PAYMENT_MODE=mock npm start
```

Sandbox API mode:

```bash
cd backend
npm ci
# Fill backend/.env first.
npm run build
npm start
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

The frontend uses `http://localhost:8080` by default. Set
`NEXT_PUBLIC_PAYPILOT_API_URL` if the API is deployed elsewhere.

## 12. AI and agent resources

AI is not required to establish the PayPal connection. The core connection should remain
deterministic and server-controlled; the agent may propose actions, but it must not receive raw
PayPal secrets or bypass the policy/approval layer.

For the hackathon, use the existing PayPilot agent flow with:

- sanitized transaction summaries;
- policy decisions and reasons;
- proposal IDs rather than credentials;
- citations to PayPilot records; and
- role-scoped tool traces.

The PayPal AI Toolkit, Agent Toolkit, and MCP resources from the hackathon brief should be treated
as optional accelerators. Before adding one, verify its current official repository/documentation,
security model, and whether it supports the exact PayPal capability needed. Do not connect a
third-party MCP or agent directly to secrets or unrestricted payment execution.

## Bottom line

For the hackathon, configure one Sandbox merchant on the backend and demonstrate a complete,
policy-gated transaction/invoice workflow with verified webhooks. Present per-customer OAuth and
multi-tenant merchant connection as the production roadmap unless the team completes PayPal
partner approval, authorization callbacks, token storage, and webhook routing before the demo.
