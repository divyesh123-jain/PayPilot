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

async function request(base: string, path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}): Promise<{ status: number; body: Record<string, any> }> {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() as Record<string, any> };
}
