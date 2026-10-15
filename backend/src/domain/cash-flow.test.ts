import assert from "node:assert/strict";
import test from "node:test";
import { forecastCashFlow } from "./cash-flow.js";

test("cash-flow forecast remains deterministic and reports comfort-buffer breaches", () => {
  const forecast = forecastCashFlow({
    asOf: "2026-10-15T12:00:00Z",
    openingBalanceCents: 100_000,
    horizonDays: 2,
    comfortBufferCents: 90_000,
    expectedEvents: [{ date: "2026-10-16", amountCents: -20_000, label: "contractor", confidence: "expected" }],
  });
  assert.deepEqual(forecast.points.map((point) => point.expectedBalanceCents), [100_000, 80_000, 80_000]);
  assert.equal(forecast.bufferBreached, true);
  assert.equal(forecast.minimumExpectedDate, "2026-10-16");
});
