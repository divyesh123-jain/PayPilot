import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { createApiServer } from "./server.js";
import { createPaymentAdapter } from "./payment-adapter.js";
import { PayPilotService } from "./service.js";

test("payment adapters expose deterministic mock and replay modes", async () => {
  const mock = createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } });
  const replay = createPaymentAdapter({ env: { PAYMENT_MODE: "replay" } });
  assert.equal(mock.mode, "mock");
  assert.equal(replay.mode, "replay");
  const mockTransactions = await mock.listTransactions();
  const replayTransactions = await replay.listTransactions();
  assert.equal(mockTransactions[0]?.id, "txn-001");
  assert.equal(replayTransactions[0]?.id, "replay-txn-001");
  assert.deepEqual(await mock.executePayment({ amountCents: 1250, currency: "USD" }), {
    externalId: "mock-payment-1250",
    status: "completed",
    amountCents: 1250,
    currency: "USD",
  });
});

test("approval and execution re-check the current policy", async () => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const simulated = service.simulate({ action: "execute_payment", amountCents: 25000, resourceId: "invoice-1" });
  assert.equal(simulated.decision.requiresApproval, true);
  const approved = service.approveProposal(simulated.proposal.id);
  assert.equal(approved.status, "approved");
  const executed = await service.executeProposal(approved.id);
  assert.equal(executed.status, "executed");
  assert.equal(executed.execution?.externalId, "mock-payment-25000");

  const blocked = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const proposal = blocked.simulate({ action: "execute_payment", amountCents: 25000 }).proposal;
  blocked.savePolicy({ text: "Deny all payments" });
  assert.throws(() => blocked.approveProposal(proposal.id), /Denied by policy/);
});

test("webhook ingest is idempotent for replay and idempotency key", () => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const first = service.ingestWebhook({ id: "evt-1", type: "PAYMENT.CAPTURE.COMPLETED" });
  const second = service.ingestWebhook({ id: "evt-1", type: "PAYMENT.CAPTURE.COMPLETED" });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(service.auditEvents().length, 1);
});

test("PayPal sandbox webhook route verifies transmission headers before ingest", async (t) => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const server = createApiServer({ service }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const rejected = await fetch(`${base}/api/webhooks/paypal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "paypal-evt-1", type: "PAYMENT.CAPTURE.COMPLETED" }),
  });
  assert.equal(rejected.status, 400);

  const accepted = await fetch(`${base}/api/webhooks/paypal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "paypal-transmission-id": "transmission-1",
      "paypal-transmission-time": "2026-10-15T12:00:00Z",
      "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-transmission-sig": "mock-signature",
    },
    body: JSON.stringify({ id: "paypal-evt-1", event_type: "PAYMENT.CAPTURE.COMPLETED", type: "PAYMENT.CAPTURE.COMPLETED" }),
  });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json() as { replayed: boolean }).replayed, false);

  const connected = await request(base, "/api/connections/paypal/connect", {});
  assert.equal(connected.status, 200);
  assert.equal(connected.body.status, "active");
});

test("live payment adapter requires PayPal webhook id for signature verification", async () => {
  const adapter = createPaymentAdapter({
    env: {
      PAYMENT_MODE: "live",
      PAYPAL_CLIENT_ID: "client-id",
      PAYPAL_CLIENT_SECRET: "client-secret",
    },
  });
  await assert.rejects(
    adapter.verifyWebhook(
      { id: "evt" },
      {
        transmissionId: "t1",
        transmissionTime: "2026-10-15T12:00:00Z",
        certUrl: "https://api.sandbox.paypal.com/cert",
        authAlgo: "SHA256withRSA",
        transmissionSig: "sig",
      },
    ),
    /PAYPAL_WEBHOOK_ID/,
  );
});

test("core JSON routes return seeded session and proposal lifecycle", async (t) => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const server = createApiServer({ service }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const session = await request(base, "/api/session");
  assert.equal(session.status, 200);
  assert.equal(session.body.paymentMode, "mock");
  const simulation = await request(base, "/api/simulate", { action: "execute_payment", amountCents: 15000 });
  assert.equal(simulation.status, 200);
  const proposalId = (simulation.body.proposal as { id: string }).id;
  const approval = await request(base, `/api/proposals/${proposalId}/approve`, {});
  assert.equal(approval.status, 200);
  const execution = await request(base, `/api/proposals/${proposalId}/execute`, {});
  assert.equal(execution.status, 200);
  const webhook = await request(base, "/api/webhooks/ingest", { id: "evt-http", type: "TEST" }, { "Idempotency-Key": "evt-http" });
  const replay = await request(base, "/api/webhooks/replay", { id: "evt-http", type: "TEST" }, { "Idempotency-Key": "evt-http" });
  assert.equal(webhook.body.replayed, false);
  assert.equal(replay.body.replayed, true);
});

test("session business switch is typed and reminder proposals require approval", async (t) => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const server = createApiServer({ service }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const switched = await request(base, "/api/session", { businessType: "freelancer" });
  assert.equal(switched.status, 200);
  assert.equal(switched.body.business.type, "freelancer");
  const simulation = await request(base, "/api/simulate", { action: "send_reminder", rationale: "Review overdue invoice" });
  assert.equal(simulation.status, 200);
  assert.equal((simulation.body.proposal as { policyDecision: { requiresApproval: boolean } }).policyDecision.requiresApproval, true);

  const chat = await request(base, "/api/agent/chat", { prompt: "Who should I follow up with first?" });
  assert.equal(chat.status, 200);
  assert.ok(chat.body.answer.includes("Priya Sharma"));
  assert.ok(Array.isArray(chat.body.toolTrace));
  assert.ok(chat.body.toolTrace.length >= 2);
  assert.equal(chat.body.proposals.length, 1);
});

test("extended API supports deterministic what-if, lifecycle, onboarding, and notification flows", async (t) => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const server = createApiServer({ service }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const simulation = await request(base, "/api/simulate", { invoiceId: "inv-overdue", amountCents: 220000, discountPct: 10 });
  assert.equal(simulation.status, 200);
  assert.equal(simulation.body.simulation.acceptEvCents, 198000);
  assert.equal(simulation.body.simulation.waitEvCents, 132000);

  const onboarding = await request(base, "/api/onboarding");
  assert.equal(onboarding.status, 200);
  const advanced = await request(base, "/api/onboarding/advance", {
    stepId: "connect_paypal",
    status: "complete",
    metadata: { notifications: { email: false, inApp: true, dailyDigest: false } },
  });
  assert.equal(advanced.body.currentStep, "backfill");
  assert.equal(advanced.body.notifications.email, false);

  const paused = await request(base, "/api/lifecycle/pause", {});
  assert.equal(paused.body.paused, true);
  const exported = await request(base, "/api/lifecycle/export", {});
  assert.equal(exported.body.exportJobs[0].status, "completed");
  const disconnected = await request(base, "/api/connections/paypal/disconnect", {});
  assert.equal(disconnected.body.connection.status, "disconnected");

  const notifications = await request(base, "/api/notifications");
  const notificationId = notifications.body.data[0].id as string;
  const read = await request(base, `/api/notifications/${notificationId}/read`, {});
  assert.equal(read.body.readAt, "2026-01-15T00:00:00.000Z");
});

test("audit verification checks the chained hashes, not only stable IDs", () => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  service.ingestWebhook({ id: "chain-event", type: "TEST" });
  const events = service.auditEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.prevHash, "GENESIS");
  assert.equal(typeof events[0]?.hash, "string");
  assert.deepEqual(service.verifyAudit(), { valid: true, checked: 1, invalidIds: [] });
});

test("runtime proposals and webhooks create actionable notifications", () => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const proposal = service.simulate({ action: "send_reminder", rationale: "Review overdue invoice" });
  assert.equal(proposal.proposal.status, "proposed");
  const approvalNotification = service.notificationsList().find((notification) => notification.title === "Approval needed");
  assert.ok(approvalNotification);

  const webhook = service.ingestWebhook({ id: "notification-event", type: "PAYMENT.CAPTURE.COMPLETED" });
  assert.equal(webhook.replayed, false);
  const eventNotification = service.notificationsList().find((notification) => notification.title === "PayPal event received");
  assert.ok(eventNotification);

  const read = service.markNotificationRead(eventNotification.id);
  assert.equal(read.readAt, "2026-01-15T00:00:00.000Z");
});

test("transaction filters, clients, workflow persistence, and policy violations are exposed", async (t) => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const server = createApiServer({ service }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const page = await request(base, "/api/transactions?status=completed&page=1&pageSize=1");
  assert.equal(page.status, 200);
  assert.equal(page.body.pagination.total, 3);
  assert.equal(page.body.data.length, 1);
  const clients = await request(base, "/api/clients");
  assert.equal(clients.status, 200);
  assert.ok(clients.body.data.some((client: { name: string }) => client.name === "Acme Labs"));

  const workflow = await request(base, "/api/workflows", { text: "Send a reminder for overdue invoices" });
  assert.equal(workflow.status, 201);
  const workflowId = workflow.body.id as string;
  const listed = await request(base, "/api/workflows");
  assert.equal(listed.body.data.length, 1);
  const run = await request(base, `/api/workflows/${workflowId}/run`, {});
  assert.equal(run.status, 200);
  assert.equal(run.body.workflow.lastProposalId, run.body.proposal.id);

  const blocked = await request(base, "/api/simulate", { action: "issue_refund", amountCents: 1000 });
  assert.equal(blocked.status, 200);
  const violations = await request(base, "/api/policy/violations");
  assert.equal(violations.status, 200);
  assert.equal(violations.body.data.length, 1);
  const parsedPolicy = await request(base, "/api/policy/parse", { text: "Payments over $100 require approval" });
  assert.equal(parsedPolicy.status, 200);
  assert.equal(parsedPolicy.body.rule.requiresApprovalAboveCents, 10000);
  const savedPolicy = await request(base, "/api/policy/save", { text: "Deny refunds" });
  assert.equal(savedPolicy.status, 200);
  assert.equal(savedPolicy.body.version, 2);
  const audit = await request(base, "/api/audit/verify");
  assert.equal(audit.status, 200);
  assert.equal(audit.body.valid, true);
});

test("role-scoped traces hide executor details and replay controls are deterministic", async (t) => {
  const service = new PayPilotService({ adapter: createPaymentAdapter({ env: { PAYMENT_MODE: "mock" } }) });
  const server = createApiServer({ service }).listen(0);
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const chat = await request(base, "/api/agent/chat", { prompt: "Who should I follow up with?", roles: ["viewer"] });
  assert.equal(chat.status, 200);
  assert.ok(chat.body.toolTrace.every((entry: string) => !entry.startsWith("Executor:")));
  const replay = await request(base, "/api/dev/replay", {});
  assert.equal(replay.status, 200);
  assert.equal(replay.body.paymentMode, "mock");
  const transactions = await request(base, "/api/transactions");
  assert.equal(transactions.body.data[0].id, "replay-txn-001");
  const invalid = await request(base, "/api/transactions?pageSize=0");
  assert.equal(invalid.status, 400);
});

async function request(base: string, path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}): Promise<{ status: number; body: Record<string, any> }> {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}
