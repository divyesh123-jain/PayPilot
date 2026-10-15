import assert from "node:assert/strict";
import test from "node:test";
import { createAuditEvent, InMemoryAuditEventStore } from "./audit-events.js";

test("audit event IDs are stable and the store is append-only", () => {
  const input = {
    businessId: "business-1",
    actorId: "agent-scout",
    actorType: "agent" as const,
    action: "forecast.created",
    outcome: "completed" as const,
    resourceType: "business" as const,
    occurredAt: "2026-10-15T12:00:00Z",
    metadata: { confidence: 84 },
  };
  const first = createAuditEvent(input);
  const second = createAuditEvent(input);
  assert.equal(first.id, second.id);

  const store = new InMemoryAuditEventStore();
  store.append(first);
  assert.equal(store.list({ businessId: "business-1" }).length, 1);
  assert.throws(() => store.append(second), /already exists/);
});
