import { createHash } from "node:crypto";
import { detectAnomalies } from "../domain/anomaly-detection.js";
import {
  createAuditEvent,
  InMemoryAuditEventStore,
  type AuditEvent,
} from "../domain/audit-events.js";
import { forecastCashFlow } from "../domain/cash-flow.js";
import { createBusinessContext, type BusinessContext, type BusinessType, type Transaction } from "../domain/business-context.js";
import {
  evaluatePolicy,
  parsePolicyText,
  PolicyViolationError,
  type PolicyAction,
  type PolicySet,
} from "../domain/policy.js";
import { createSeedContext, SEED_POLICY, SEED_SCENARIO_ID } from "./fixtures.js";
import { createPaymentAdapter, type PaymentAdapter, type PaymentMode } from "./payment-adapter.js";
import type { Finding, Proposal, ProposalAction, SessionResponse, WebhookReceipt } from "./types.js";

const NOW = "2026-01-15T00:00:00.000Z";

export interface ServiceOptions {
  readonly adapter?: PaymentAdapter;
  readonly context?: BusinessContext;
  readonly policy?: PolicySet;
  readonly scenarioId?: string;
}

export interface ParsedWorkflow {
  readonly id: string;
  readonly name: string;
  readonly action: ProposalAction;
  readonly amountCents?: number;
  readonly description: string;
}

export class PayPilotService {
  private context: BusinessContext;
  private policy: PolicySet;
  private readonly adapter: PaymentAdapter;
  private readonly scenarioId: string;
  private readonly proposals = new Map<string, Proposal>();
  private readonly webhookReceipts = new Map<string, WebhookReceipt>();
  private readonly audit = new InMemoryAuditEventStore();
  private readonly subscribers = new Set<(event: string, data: unknown) => void>();

  public constructor(options: ServiceOptions = {}) {
    this.context = options.context ?? createSeedContext();
    this.policy = options.policy ?? SEED_POLICY;
    this.adapter = options.adapter ?? createPaymentAdapter();
    this.scenarioId = options.scenarioId ?? SEED_SCENARIO_ID;
  }

  public get paymentMode(): PaymentMode { return this.adapter.mode; }
  public get businessContext(): BusinessContext { return this.context; }
  public get currentPolicy(): PolicySet { return this.policy; }

  public setBusinessType(type: BusinessType): SessionResponse {
    this.context = createBusinessContext({ ...this.context.profile, type }, this.context.transactions, this.context.asOf);
    this.appendAudit("business.type_changed", "accepted", "business", this.context.profile.id, { businessType: type });
    this.emit("session.updated", this.session());
    return this.session();
  }

  public async refreshTransactions(): Promise<readonly Transaction[]> {
    const inputs = await this.adapter.listTransactions();
    this.context = createBusinessContext({ ...this.context.profile }, inputs, this.context.asOf);
    this.emit("transactions.refreshed", { count: inputs.length, mode: this.adapter.mode });
    return this.context.transactions;
  }

  public session(): SessionResponse {
    return {
      sessionId: "session-demo-0001",
      paymentMode: this.adapter.mode,
      scenarioId: this.scenarioId,
      business: {
        id: this.context.profile.id,
        name: this.context.profile.name,
        type: this.context.profile.type,
        currency: this.context.profile.currency,
      },
      policy: this.policy,
    };
  }

  public transactions(): readonly Transaction[] { return this.context.transactions; }

  public findings(): readonly Finding[] {
    return detectAnomalies(this.context.transactions).map((finding) => ({
      id: `finding-${finding.transactionId}`,
      severity: finding.score >= 0.8 ? "critical" : "warning",
      summary: finding.reason,
      transactionId: finding.transactionId,
      score: finding.score,
    }));
  }

  public forecast(input: { openingBalanceCents?: number; horizonDays?: number } = {}): ReturnType<typeof forecastCashFlow> {
    const openingBalanceCents = input.openingBalanceCents ?? 125000;
    return forecastCashFlow({
      asOf: this.context.asOf,
      openingBalanceCents,
      horizonDays: input.horizonDays ?? 14,
      transactions: this.context.transactions,
      comfortBufferCents: this.context.profile.comfortBufferCents,
      expectedEvents: [{ date: "2026-01-20", amountCents: 12900, label: "Acme Labs subscription", confidence: "expected" }],
    });
  }

  public simulate(input: { action?: ProposalAction; amountCents?: number; resourceId?: string; rationale?: string }): { decision: ReturnType<typeof evaluatePolicy>; proposal: Proposal } {
    const action = input.action ?? "execute_payment";
    const decision = evaluatePolicy(this.policy, {
      action: action as PolicyAction,
      subject: { userId: "demo-user", roles: ["operator"] },
      ...(input.amountCents === undefined ? {} : { amountCents: input.amountCents }),
    });
    const proposal = this.makeProposal(action, input, decision);
    this.proposals.set(proposal.id, proposal);
    this.appendAudit("proposal.simulated", "proposed", "approval_request", proposal.id);
    return { decision, proposal };
  }

  public listProposals(): readonly Proposal[] { return [...this.proposals.values()]; }
  public getProposal(id: string): Proposal {
    const proposal = this.proposals.get(id);
    if (!proposal) throw new ApiNotFoundError(`Proposal ${id} was not found`);
    return proposal;
  }

  public approveProposal(id: string): Proposal {
    const current = this.getProposal(id);
    if (current.status !== "proposed") throw new ApiConflictError(`Proposal ${id} is already ${current.status}`);
    const decision = this.recheck(current);
    if (!decision.allowed) throw new PolicyViolationError(decision);
    const proposal = this.updateProposal(current, { status: "approved", policyDecision: decision });
    this.appendAudit("proposal.approved", "accepted", "approval_request", id);
    this.emit("proposal.updated", proposal);
    return proposal;
  }

  public rejectProposal(id: string): Proposal {
    const current = this.getProposal(id);
    if (current.status !== "proposed") throw new ApiConflictError(`Proposal ${id} is already ${current.status}`);
    const proposal = this.updateProposal(current, { status: "rejected" });
    this.appendAudit("proposal.rejected", "rejected", "approval_request", id);
    this.emit("proposal.updated", proposal);
    return proposal;
  }

  public async executeProposal(id: string): Promise<Proposal> {
    const current = this.getProposal(id);
    if (current.status !== "approved") throw new ApiConflictError("Only an approved proposal can be executed");
    const decision = this.recheck(current);
    if (!decision.allowed) {
      const blocked = this.updateProposal(current, { status: "blocked", policyDecision: decision });
      this.emit("proposal.updated", blocked);
      throw new PolicyViolationError(decision);
    }
    if (current.action !== "execute_payment") {
      const completed = this.updateProposal(current, { status: "executed", policyDecision: decision, execution: { externalId: `local-${id}`, status: "completed" } });
      this.appendAudit("proposal.executed", "completed", "approval_request", id);
      this.emit("proposal.updated", completed);
      return completed;
    }
    const result = await this.adapter.executePayment({
      amountCents: current.amountCents ?? 0,
      currency: this.context.profile.currency,
      ...(current.resourceId === undefined ? {} : { reference: current.resourceId }),
    });
    const completed = this.updateProposal(current, { status: "executed", policyDecision: decision, execution: { externalId: result.externalId, status: result.status } });
    this.appendAudit("proposal.executed", "completed", "approval_request", id);
    this.emit("proposal.updated", completed);
    return completed;
  }

  public parsePolicy(text: string): ReturnType<typeof parsePolicyText> { return parsePolicyText(text); }

  public savePolicy(input: { text?: string; policy?: PolicySet }): PolicySet {
    if (input.policy) {
      validatePolicySet(input.policy);
      this.policy = {
        id: "policy-demo-v" + (this.policy.version + 1),
        businessId: this.context.profile.id,
        version: this.policy.version + 1,
        rules: input.policy.rules,
      };
    } else {
      if (input.text === undefined) throw new Error("policy or text is required");
      this.policy = {
        id: "policy-demo-v" + (this.policy.version + 1),
        businessId: this.context.profile.id,
        version: this.policy.version + 1,
        rules: [parsePolicyText(input.text).rule],
      };
    }
    this.appendAudit("policy.saved", "accepted", "policy", this.policy.id);
    this.emit("policy.updated", this.policy);
    return this.policy;
  }

  public parseWorkflow(text: string): ParsedWorkflow {
    const normalized = text.trim();
    if (!normalized) throw new Error("Workflow text must not be empty");
    const action: ProposalAction = /refund/i.test(normalized) ? "issue_refund"
      : /reminder|dunning|collect/i.test(normalized) ? "send_reminder"
      : /payment|pay/i.test(normalized) ? "execute_payment" : "create_workflow";
    const amount = normalized.match(/(?:\$|usd\s*)([\d,]+(?:\.\d{1,2})?)/i);
    const amountCents = amount?.[1] === undefined ? undefined : Math.round(Number(amount[1].replaceAll(",", "")) * 100);
    if (amountCents !== undefined && (!Number.isSafeInteger(amountCents) || amountCents < 0)) throw new Error("Workflow amount must be a non-negative integer in cents");
    return { id: `workflow-${hash(normalized).slice(0, 12)}`, name: normalized.slice(0, 80), action, ...(amountCents === undefined ? {} : { amountCents }), description: normalized };
  }

  public runWorkflow(workflow: ParsedWorkflow): { workflow: ParsedWorkflow; proposal: Proposal } {
    const result = this.simulate({ action: workflow.action, ...(workflow.amountCents === undefined ? {} : { amountCents: workflow.amountCents }), rationale: workflow.description });
    return { workflow, proposal: result.proposal };
  }

  public ingestWebhook(event: Record<string, unknown>, idempotencyKey?: string): WebhookReceipt {
    const eventId = String(event.id ?? idempotencyKey ?? "");
    if (!eventId) throw new Error("Webhook event id or Idempotency-Key is required");
    const existing = this.webhookReceipts.get(eventId);
    if (existing) return { ...existing, replayed: true };
    const receipt: WebhookReceipt = {
      eventId,
      accepted: true,
      replayed: false,
      receivedAt: NOW,
      eventType: String(event.type ?? "unknown"),
    };
    this.webhookReceipts.set(eventId, receipt);
    this.appendAudit("webhook.ingested", "accepted", "notification", eventId, { eventType: receipt.eventType });
    this.emit("webhook.ingested", receipt);
    return receipt;
  }

  public verifyAudit(): { valid: boolean; checked: number; invalidIds: readonly string[] } {
    const events = this.audit.list({ businessId: this.context.profile.id });
    const invalidIds = events.filter((event) => {
      const { id: _id, ...withoutId } = event;
      return createAuditEvent(withoutId).id !== event.id;
    }).map((event) => event.id);
    return { valid: invalidIds.length === 0, checked: events.length, invalidIds };
  }

  public auditEvents(): readonly AuditEvent[] { return this.audit.list({ businessId: this.context.profile.id }); }
  public subscribe(listener: (event: string, data: unknown) => void): () => void { this.subscribers.add(listener); return () => this.subscribers.delete(listener); }

  private recheck(proposal: Proposal) {
    return evaluatePolicy(this.policy, {
      action: proposal.action as PolicyAction,
      subject: { userId: "demo-user", roles: ["operator"] },
      ...(proposal.amountCents === undefined ? {} : { amountCents: proposal.amountCents }),
    });
  }

  private makeProposal(action: ProposalAction, input: { amountCents?: number; resourceId?: string; rationale?: string }, decision: ReturnType<typeof evaluatePolicy>): Proposal {
    const id = `proposal-${this.proposals.size + 1}`;
    return {
      id,
      action,
      ...(input.amountCents === undefined ? {} : { amountCents: input.amountCents }),
      ...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
      rationale: input.rationale ?? `Deterministic ${action} simulation`,
      status: "proposed",
      policyDecision: decision,
      createdAt: NOW,
      updatedAt: NOW,
    };
  }

  private updateProposal(current: Proposal, patch: Partial<Pick<Proposal, "status" | "policyDecision" | "execution">>): Proposal {
    const next = { ...current, ...patch, updatedAt: NOW };
    this.proposals.set(current.id, next);
    return next;
  }

  private appendAudit(action: string, outcome: AuditEvent["outcome"], resourceType: AuditEvent["resourceType"], resourceId: string, metadata: Record<string, string> = {}): void {
    this.audit.append(createAuditEvent({ businessId: this.context.profile.id, actorId: "demo-user", actorType: "user", action, outcome, resourceType, resourceId, occurredAt: NOW, metadata }));
  }

  private emit(event: string, data: unknown): void { for (const subscriber of this.subscribers) subscriber(event, data); }
}

function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }

export class ApiNotFoundError extends Error { public readonly statusCode = 404; }
export class ApiConflictError extends Error { public readonly statusCode = 409; }

export function createDefaultService(): PayPilotService { return new PayPilotService({ context: createSeedContext(), policy: SEED_POLICY }); }

function validatePolicySet(policy: PolicySet): void {
  if (!Array.isArray(policy.rules)) throw new Error("policy.rules must be an array");
  for (const rule of policy.rules) {
    if (!rule.id?.trim()) throw new Error("policy rule id is required");
    if (!rule.action || !rule.effect) throw new Error("policy rule action and effect are required");
    for (const amount of [rule.maxAmountCents, rule.minAmountCents, rule.requiresApprovalAboveCents]) {
      if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) throw new Error("policy amounts must be non-negative integer cents");
    }
  }
}
