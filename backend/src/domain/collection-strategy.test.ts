import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectionPlan } from "./collection-strategy.js";

test("collection plan prioritizes overdue, unreliable receivables", () => {
  const plan = buildCollectionPlan(
    [
      { id: "on-time", customerName: "Reliable Co", amountCents: 20_000, dueDate: "2026-10-20", attempts: 0, successfulPayments: 5, totalPayments: 5, relationship: "active" },
      { id: "late", customerName: "Late Co", amountCents: 150_000, dueDate: "2026-09-01", attempts: 3, successfulPayments: 1, totalPayments: 5, relationship: "new" },
    ],
    "2026-10-15",
  );
  assert.equal(plan[0]?.receivableId, "late");
  assert.equal(plan[0]?.priority, "urgent");
  assert.equal(plan[0]?.strategy, "pause_service");
});
