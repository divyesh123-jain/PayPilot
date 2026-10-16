import {
  createBusinessContext,
  type BusinessContext,
  type TransactionInput,
} from "../domain/business-context.js";
import type { PolicySet } from "../domain/policy.js";

export const SEED_SCENARIO_ID = "demo-saas";
export const SEED_AS_OF = "2026-01-15T00:00:00.000Z";

export const SEED_TRANSACTIONS: readonly TransactionInput[] = [
  {
    id: "txn-001",
    occurredAt: "2026-01-10T09:00:00.000Z",
    amountCents: 12900,
    direction: "inflow",
    status: "completed",
    counterparty: "Acme Labs",
    category: "subscription",
    reference: "INV-1001",
  },
  {
    id: "txn-002",
    occurredAt: "2026-01-11T11:30:00.000Z",
    amountCents: 12900,
    direction: "inflow",
    status: "completed",
    counterparty: "Acme Labs",
    category: "subscription",
    reference: "INV-1002",
  },
  {
    id: "txn-003",
    occurredAt: "2026-01-12T13:00:00.000Z",
    amountCents: 25000,
    direction: "outflow",
    status: "completed",
    counterparty: "Cloud Hosting",
    category: "infrastructure",
    reference: "BILL-220",
  },
  {
    id: "txn-004",
    occurredAt: "2026-01-13T08:15:00.000Z",
    amountCents: 12900,
    direction: "inflow",
    status: "pending",
    counterparty: "Acme Labs",
    category: "subscription",
    reference: "INV-1003",
  },
  {
    id: "txn-005",
    occurredAt: "2026-01-14T16:45:00.000Z",
    amountCents: 32000,
    direction: "outflow",
    status: "failed",
    counterparty: "Tax Authority",
    category: "tax",
    reference: "TAX-01",
  },
];

export const SEED_POLICY: PolicySet = {
  id: "policy-demo-v1",
  businessId: "business-demo-saas",
  version: 1,
  rules: [
    {
      id: "payments-over-100-approval",
      action: "execute_payment",
      effect: "allow",
      requiresApprovalAboveCents: 10000,
      description: "Payments above $100 require approval.",
    },
    {
      id: "refunds-denied",
      action: "issue_refund",
      effect: "deny",
      description: "Refunds are not enabled in the demo policy.",
    },
    {
      id: "workflow-creation-allowed",
      action: "create_workflow",
      effect: "allow",
      description: "Workflow creation is allowed for operators.",
    },
    {
      id: "reminders-require-review",
      action: "send_reminder",
      effect: "require_approval",
      description: "Outbound payment reminders require an operator review.",
    },
  ],
};

export function createSeedContext(): BusinessContext {
  return createBusinessContext(
    {
      id: "business-demo-saas",
      name: "Northstar Software",
      type: "saas",
      currency: "USD",
      timezone: "UTC",
      descriptor: "NORTHSTAR",
      comfortBufferCents: 50000,
    },
    SEED_TRANSACTIONS,
    SEED_AS_OF,
  );
}

export function replayTransactions(): readonly TransactionInput[] {
  return SEED_TRANSACTIONS.map((transaction) => ({
    ...transaction,
    id: `replay-${transaction.id}`,
    ...(transaction.reference === undefined ? {} : { reference: `replay-${transaction.reference}` }),
  }));
}
