import type { Transaction } from "../domain/business-context.js";
import type { PolicyDecision, PolicySet } from "../domain/policy.js";
import type { PaymentMode } from "./payment-adapter.js";

export type ProposalAction = "execute_payment" | "send_reminder" | "create_workflow" | "issue_refund" | "schedule_payment" | "export_data";
export type ProposalStatus = "proposed" | "approved" | "rejected" | "executed" | "blocked";

export interface Proposal {
  readonly id: string;
  readonly action: ProposalAction;
  readonly amountCents?: number;
  readonly resourceId?: string;
  readonly rationale: string;
  readonly status: ProposalStatus;
  readonly policyDecision: PolicyDecision;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly execution?: { readonly externalId: string; readonly status: string };
}

export interface SessionResponse {
  readonly sessionId: string;
  readonly paymentMode: PaymentMode;
  readonly scenarioId: string;
  readonly business: { readonly id: string; readonly name: string; readonly type: string; readonly currency: string };
  readonly policy: PolicySet;
}

export interface Finding {
  readonly id: string;
  readonly severity: "info" | "warning" | "critical";
  readonly summary: string;
  readonly transactionId: string;
  readonly score: number;
}

export interface WebhookReceipt {
  readonly eventId: string;
  readonly accepted: boolean;
  readonly replayed: boolean;
  readonly receivedAt: string;
  readonly eventType: string;
}

export type ApiState = {
  transactions: readonly Transaction[];
};
