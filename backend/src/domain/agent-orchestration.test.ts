import assert from "node:assert/strict";
import test from "node:test";
import { createBusinessContext } from "./business-context.js";
import { createDeterministicOrchestrator } from "./agent-orchestration.js";

test("deterministic orchestration proposes dry-run actions without integrations", async () => {
  const context = createBusinessContext(
    { id: "business-1", name: "Demo", type: "saas" },
    [
      { id: "same-1", occurredAt: "2026-10-15T10:00:00Z", amountCents: 10_000, direction: "inflow", status: "completed", counterparty: "Customer" },
      { id: "same-2", occurredAt: "2026-10-15T10:00:00Z", amountCents: 10_000, direction: "inflow", status: "completed", counterparty: "Customer" },
    ],
  );
  const result = await createDeterministicOrchestrator().run({
    runId: "run-1",
    business: context,
    policy: { id: "p1", businessId: "business-1", version: 1, rules: [{ id: "allow-export", action: "export_data", effect: "allow" }] },
    actor: { userId: "user-1", roles: [] },
  });
  assert.equal(result.observations.length, 2);
  assert.equal(result.actions[0]?.action, "export_data");
  assert.equal(result.executions[0]?.status, "dry_run");
});
