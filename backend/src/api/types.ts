import type { Transaction } from "../domain/business-context.js";
import type { PolicyDecision, PolicySet } from "../domain/policy.js";
import type { PaymentMode } from "./payment-adapter.js";

export type ProposalAction = "execute_payment" | "send_reminder" | "create_workflow" | "issue_refund" | "schedule_payment" | "export_data";
export type ProposalStatus = "proposed" | "approved" | "rejected" | "executed" | "blocked" | "expired";

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

export interface ClientProfile {
  readonly id: string;
  readonly name: string;
  readonly transactionCount: number;
  readonly inflowCents: number;
  readonly outflowCents: number;
  readonly outstandingCents: number;
  readonly lastActivityAt?: string;
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
  readonly action: ProposalAction;
  readonly amountCents?: number;
  readonly description: string;
  readonly status: "draft" | "active" | "paused" | "completed" | "failed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastRunAt?: string;
  readonly lastProposalId?: string;
}

export interface PolicyViolation {
  readonly id: string;
  readonly action: ProposalAction;
  readonly proposalId?: string;
  readonly reason: string;
  readonly amountCents?: number;
  readonly occurredAt: string;
}

export type OnboardingStepStatus = "pending" | "in_progress" | "complete" | "skipped" | "failed";

export interface OnboardingState {
  readonly currentStep: string;
  readonly steps: readonly { id: string; label: string; status: OnboardingStepStatus; updatedAt: string }[];
  readonly autonomyLevel: "L0" | "L1";
}

export interface ConnectionState {
  readonly id: string;
  readonly provider: "paypal";
  readonly status: "active" | "needs_reauth" | "revoked" | "disconnected";
  readonly scopes: readonly string[];
  readonly connectedAt?: string;
  readonly lastSyncAt?: string;
}

export interface NotificationItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly severity: "info" | "warning" | "critical";
  readonly readAt?: string;
  readonly createdAt: string;
}

export interface LifecycleState {
  readonly paused: boolean;
  readonly connection: ConnectionState;
  readonly exportJobs: readonly { id: string; status: "completed" | "pending"; createdAt: string; files: readonly string[] }[];
  readonly deletionRequest?: { id: string; status: "scheduled" | "cancelled"; gracePeriodEndsAt: string };
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
