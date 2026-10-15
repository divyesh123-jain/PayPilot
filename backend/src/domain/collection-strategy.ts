export type CollectionStrategy = "soft_reminder" | "payment_link" | "offer_plan" | "escalate_to_human" | "pause_service";
export type CollectionPriority = "urgent" | "watch" | "good";

export interface OpenReceivable {
  readonly id: string;
  readonly customerName: string;
  readonly amountCents: number;
  readonly dueDate: string;
  readonly attempts: number;
  readonly successfulPayments: number;
  readonly totalPayments: number;
  readonly relationship: "new" | "active" | "strategic";
}

export interface CollectionRecommendation {
  readonly receivableId: string;
  readonly strategy: CollectionStrategy;
  readonly priority: CollectionPriority;
  readonly score: number;
  readonly rationale: string;
  readonly expectedRecoveryCents: number;
}

export interface CollectionSimulation {
  readonly strategy: CollectionStrategy;
  readonly expectedRecoveredCents: number;
  readonly expectedRecoveryRate: number;
  readonly customerExperienceCost: number;
}

function daysOverdue(dueDate: string, asOf: string): number {
  return Math.floor((Date.parse(asOf) - Date.parse(dueDate)) / 86_400_000);
}

function reliability(receivable: OpenReceivable): number {
  if (receivable.totalPayments <= 0) return 0.5;
  return Math.max(0, Math.min(1, receivable.successfulPayments / receivable.totalPayments));
}

export function recommendCollectionStrategy(receivable: OpenReceivable, asOf: string): CollectionRecommendation {
  if (!Number.isSafeInteger(receivable.amountCents) || receivable.amountCents <= 0) throw new Error("amountCents must be positive");
  const overdue = daysOverdue(receivable.dueDate, asOf);
  const reliabilityScore = reliability(receivable);
  const score = Math.max(0, Math.min(100, overdue * 3 + receivable.attempts * 8 + (1 - reliabilityScore) * 35 + (receivable.amountCents >= 100_000 ? 15 : 0)));
  let strategy: CollectionStrategy;
  if (overdue <= 0 && receivable.attempts === 0) strategy = "soft_reminder";
  else if (overdue <= 14 && receivable.attempts < 2) strategy = "payment_link";
  else if (overdue <= 30 && receivable.relationship !== "new") strategy = "offer_plan";
  else if (receivable.relationship === "strategic" && overdue <= 45) strategy = "escalate_to_human";
  else strategy = "pause_service";

  const priority: CollectionPriority = score >= 65 ? "urgent" : score >= 30 ? "watch" : "good";
  const rate = simulateCollection(receivable, strategy).expectedRecoveryRate;
  return {
    receivableId: receivable.id,
    strategy,
    priority,
    score: Math.round(score),
    rationale: overdue > 0
      ? `${receivable.customerName} is ${overdue} day${overdue === 1 ? "" : "s"} overdue with ${receivable.attempts} prior attempt${receivable.attempts === 1 ? "" : "s"}.`
      : `${receivable.customerName} is due soon; a low-friction reminder protects the relationship.`,
    expectedRecoveryCents: Math.round(receivable.amountCents * rate),
  };
}

export function simulateCollection(receivable: OpenReceivable, strategy: CollectionStrategy): CollectionSimulation {
  const base = 0.45 + reliability(receivable) * 0.3;
  const modifiers: Record<CollectionStrategy, { rate: number; cost: number }> = {
    soft_reminder: { rate: 0.08, cost: 0.05 },
    payment_link: { rate: 0.18, cost: 0.1 },
    offer_plan: { rate: 0.22, cost: 0.2 },
    escalate_to_human: { rate: 0.28, cost: 0.45 },
    pause_service: { rate: 0.2, cost: 0.7 },
  };
  const rate = Math.min(0.99, base + modifiers[strategy].rate);
  return {
    strategy,
    expectedRecoveredCents: Math.round(receivable.amountCents * rate),
    expectedRecoveryRate: rate,
    customerExperienceCost: modifiers[strategy].cost,
  };
}

export function buildCollectionPlan(receivables: readonly OpenReceivable[], asOf: string): readonly CollectionRecommendation[] {
  return receivables
    .map((receivable) => recommendCollectionStrategy(receivable, asOf))
    .sort((left, right) => right.score - left.score || left.receivableId.localeCompare(right.receivableId));
}
