import type { Transaction } from "./business-context.js";

export interface ForecastEvent {
  readonly date: string;
  readonly amountCents: number;
  readonly label: string;
  readonly confidence: "observed" | "expected";
}

export interface CashFlowForecastInput {
  readonly asOf: string;
  readonly openingBalanceCents: number;
  readonly horizonDays: number;
  readonly transactions?: readonly Transaction[];
  readonly expectedEvents?: readonly ForecastEvent[];
  readonly comfortBufferCents?: number;
}

export interface CashFlowForecastPoint {
  readonly date: string;
  readonly expectedBalanceCents: number;
  readonly lowBalanceCents: number;
  readonly highBalanceCents: number;
  readonly confidencePercent: number;
  readonly netChangeCents: number;
}

export interface CashFlowForecast {
  readonly asOf: string;
  readonly points: readonly CashFlowForecastPoint[];
  readonly minimumExpectedBalanceCents: number;
  readonly minimumExpectedDate: string;
  readonly bufferBreached: boolean;
  readonly narrative: string;
}

function utcDay(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${date}`);
  return parsed.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function validateInput(input: CashFlowForecastInput): void {
  if (!Number.isSafeInteger(input.openingBalanceCents)) throw new Error("openingBalanceCents must be an integer");
  if (!Number.isInteger(input.horizonDays) || input.horizonDays < 1 || input.horizonDays > 366) {
    throw new Error("horizonDays must be between 1 and 366");
  }
  if (input.comfortBufferCents !== undefined && input.comfortBufferCents < 0) {
    throw new Error("comfortBufferCents must be non-negative");
  }
}

/** Builds a reproducible daily forecast from observed transactions and caller-supplied expectations. */
export function forecastCashFlow(input: CashFlowForecastInput): CashFlowForecast {
  validateInput(input);
  const start = utcDay(input.asOf);
  const observed = (input.transactions ?? []).map((transaction) => ({
    date: utcDay(transaction.occurredAt),
    amountCents: transaction.status === "completed" ? transaction.signedAmountCents : 0,
    label: transaction.category ?? "Observed transaction",
    confidence: "observed" as const,
  }));
  const expected = (input.expectedEvents ?? []).map((event) => ({ ...event, date: utcDay(event.date) }));
  const events = [...observed, ...expected];
  const points: CashFlowForecastPoint[] = [];
  let balance = input.openingBalanceCents;
  const expectedCount = expected.length;
  const baseConfidence = Math.min(96, 62 + observed.length * 3 + expectedCount * 2);

  for (let offset = 0; offset <= input.horizonDays; offset += 1) {
    const date = addDays(start, offset);
    const dayEvents = events.filter((event) => event.date === date);
    const netChangeCents = dayEvents.reduce((sum, event) => sum + event.amountCents, 0);
    balance += netChangeCents;
    const uncertainty = dayEvents.filter((event) => event.confidence === "expected").reduce((sum, event) => sum + Math.abs(event.amountCents), 0);
    const lowBalanceCents = balance - Math.round(uncertainty * 0.25);
    const highBalanceCents = balance + Math.round(uncertainty * 0.25);
    points.push({
      date,
      expectedBalanceCents: balance,
      lowBalanceCents,
      highBalanceCents,
      confidencePercent: Math.max(45, baseConfidence - Math.floor(offset / 7) * 4),
      netChangeCents,
    });
  }

  const minimum = points.reduce((current, point) =>
    point.expectedBalanceCents < current.expectedBalanceCents ? point : current,
  );
  const buffer = input.comfortBufferCents ?? 0;
  return {
    asOf: start,
    points,
    minimumExpectedBalanceCents: minimum.expectedBalanceCents,
    minimumExpectedDate: minimum.date,
    bufferBreached: minimum.expectedBalanceCents < buffer,
    narrative: minimum.expectedBalanceCents < buffer
      ? `Expected balance falls below the ${buffer}-cent comfort buffer on ${minimum.date}.`
      : `Expected balance remains above the comfort buffer through ${points.at(-1)?.date ?? start}.`,
  };
}
