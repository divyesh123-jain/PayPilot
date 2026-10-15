import assert from "node:assert/strict";
import test from "node:test";
import { createTransaction } from "./business-context.js";
import { detectAnomalies } from "./anomaly-detection.js";

test("anomaly detection identifies unusually large transactions against peer history", () => {
  const transactions = [100, 100, 100, 1_000].map((amount, index) =>
    createTransaction("business-1", {
      id: `tx-${index}`,
      occurredAt: `2026-10-${String(10 + index).padStart(2, "0")}T10:00:00Z`,
      amountCents: amount,
      direction: "inflow",
      status: "completed",
    }),
  );
  const anomalies = detectAnomalies(transactions);
  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0]?.transactionId, "tx-3");
  assert.equal(anomalies[0]?.type, "unusually_large");
});
