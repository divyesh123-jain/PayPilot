import type { Transaction } from "./business-context.js";

export type AnomalyType = "duplicate" | "unusually_large" | "unusually_small" | "velocity";

export interface Anomaly {
  readonly transactionId: string;
  readonly type: AnomalyType;
  readonly score: number;
  readonly reason: string;
  readonly relatedTransactionIds: readonly string[];
}

export interface AnomalyDetectionOptions {
  readonly minimumSampleSize?: number;
  readonly amountDeviationRatio?: number;
  readonly velocityWindowDays?: number;
  readonly velocityLimit?: number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
}

function daysBetween(left: string, right: string): number {
  return Math.abs(Date.parse(left) - Date.parse(right)) / 86_400_000;
}

/** Uses robust medians and duplicate/velocity checks so the result stays stable without an AI model. */
export function detectAnomalies(
  transactions: readonly Transaction[],
  options: AnomalyDetectionOptions = {},
): readonly Anomaly[] {
  const minimumSampleSize = options.minimumSampleSize ?? 3;
  const deviationRatio = options.amountDeviationRatio ?? 3;
  const velocityWindowDays = options.velocityWindowDays ?? 1;
  const velocityLimit = options.velocityLimit ?? 5;
  const anomalies: Anomaly[] = [];

  for (const transaction of transactions) {
    const duplicates = transactions.filter(
      (candidate) =>
        candidate.id !== transaction.id &&
        candidate.direction === transaction.direction &&
        candidate.amountCents === transaction.amountCents &&
        candidate.counterparty === transaction.counterparty &&
        daysBetween(candidate.occurredAt, transaction.occurredAt) <= 0.01,
    );
    if (duplicates.length > 0) {
      anomalies.push({
        transactionId: transaction.id,
        type: "duplicate",
        score: 1,
        reason: "A matching transaction occurred at the same time.",
        relatedTransactionIds: duplicates.map((candidate) => candidate.id),
      });
      continue;
    }

    const peers = transactions.filter(
      (candidate) => candidate.id !== transaction.id && candidate.direction === transaction.direction,
    );
    if (peers.length >= minimumSampleSize) {
      const typicalAmount = median(peers.map((peer) => peer.amountCents));
      const ratio = typicalAmount === 0 ? Infinity : transaction.amountCents / typicalAmount;
      if (ratio >= deviationRatio) {
        anomalies.push({
          transactionId: transaction.id,
          type: "unusually_large",
          score: Math.min(1, ratio / (deviationRatio * 2)),
          reason: `Amount is ${ratio.toFixed(1)}× the typical ${transaction.direction} amount.`,
          relatedTransactionIds: peers.map((peer) => peer.id),
        });
        continue;
      }
      if (ratio > 0 && 1 / ratio >= deviationRatio) {
        anomalies.push({
          transactionId: transaction.id,
          type: "unusually_small",
          score: Math.min(1, 1 / ratio / (deviationRatio * 2)),
          reason: `Amount is unusually small compared with the typical ${transaction.direction} amount.`,
          relatedTransactionIds: peers.map((peer) => peer.id),
        });
        continue;
      }
    }

    const nearby = transactions.filter(
      (candidate) => candidate.direction === transaction.direction && daysBetween(candidate.occurredAt, transaction.occurredAt) <= velocityWindowDays,
    );
    if (nearby.length > velocityLimit) {
      anomalies.push({
        transactionId: transaction.id,
        type: "velocity",
        score: Math.min(1, nearby.length / (velocityLimit * 2)),
        reason: `${nearby.length} same-direction transactions occurred inside the velocity window.`,
        relatedTransactionIds: nearby.filter((candidate) => candidate.id !== transaction.id).map((candidate) => candidate.id),
      });
    }
  }

  return anomalies.sort((left, right) => left.transactionId.localeCompare(right.transactionId));
}
