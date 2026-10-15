import assert from "node:assert/strict";
import test from "node:test";
import { createBusinessContext } from "./business-context.js";

test("business context normalizes profiles and signed transaction amounts", () => {
  const context = createBusinessContext(
    { name: "Alex Morgan", type: "freelancer", comfortBufferCents: 500_00 },
    [
      { id: "in-1", occurredAt: "2026-10-15T10:00:00Z", amountCents: 320_000, direction: "inflow", status: "completed" },
      { id: "out-1", occurredAt: "2026-10-15T11:00:00Z", amountCents: 80_000, direction: "outflow", status: "pending" },
    ],
    "2026-10-15T12:00:00Z",
  );

  assert.equal(context.profile.currency, "USD");
  assert.equal(context.transactions[0]?.signedAmountCents, 320_000);
  assert.equal(context.transactions[1]?.signedAmountCents, -80_000);
  assert.throws(() =>
    createBusinessContext({ name: "Invalid", type: "creator" }, [
      { id: "bad", occurredAt: "2026-10-15", amountCents: 0, direction: "inflow", status: "completed" },
    ]),
  );
});
