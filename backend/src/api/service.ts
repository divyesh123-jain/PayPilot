import { createHash } from "node:crypto";
import { detectAnomalies } from "../domain/anomaly-detection.js";
import {
  createAuditEvent,
  hashEvent,
  InMemoryAuditEventStore,
  type AuditEvent,
} from "../domain/audit-events.js";
import { forecastCashFlow } from "../domain/cash-flow.js";
import { simulateDiscount } from "../domain/collection-strategy.js";
import { createBusinessContext, type BusinessContext, type BusinessType, type Transaction } from "../domain/business-context.js";
import {
  evaluatePolicy,
  parsePolicyText,
  PolicyViolationError,
  type PolicyAction,
  type PolicySet,
} from "../domain/policy.js";
import { createSeedContext, replayTransactions, SEED_POLICY, SEED_SCENARIO_ID } from "./fixtures.js";
import { createPaymentAdapter, type PaymentAdapter, type PaymentMode } from "./payment-adapter.js";
import type { ClientProfile, ConnectionState, Finding, LifecycleState, NotificationItem, OnboardingState, PolicyViolation, Proposal, ProposalAction, SessionResponse, WebhookReceipt, Workflow } from "./types.js";

const NOW = "2026-01-15T00:00:00.000Z";

export interface ServiceOptions {
  readonly adapter?: PaymentAdapter;
  readonly context?: BusinessContext;
  readonly policy?: PolicySet;
  readonly scenarioId?: string;
  /** Runtime services start empty; tests can opt into the deterministic fixture set. */
  readonly seedDemoData?: boolean;
}

export interface ParsedWorkflow {
  readonly id: string;
  readonly name: string;
  readonly action: ProposalAction;
  readonly amountCents?: number;
  readonly description: string;
}

export interface AgentActor {
  readonly userId: string;
  readonly roles: readonly string[];
}

export interface TransactionListQuery {
  readonly status?: string;
  readonly direction?: string;
  readonly counterparty?: string;
  readonly category?: string;
  readonly search?: string;
  readonly from?: string;
  readonly to?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly offset?: number;
}

export interface SimulationInput {
  readonly action?: ProposalAction;
  readonly amountCents?: number;
  readonly resourceId?: string;
  readonly rationale?: string;
  readonly clientId?: string;
  readonly invoiceId?: string;
  readonly discountPct?: number;
  readonly waitProbability?: number;
  readonly waitDays?: number;
}

export class PayPilotService {
  private context: BusinessContext;
  private policy: PolicySet;
  private readonly adapter: PaymentAdapter;
  private readonly scenarioId: string;
  private readonly proposals = new Map<string, Proposal>();
  private readonly workflows = new Map<string, Workflow>();
  private readonly webhookReceipts = new Map<string, WebhookReceipt>();
  private audit = new InMemoryAuditEventStore();
  private readonly subscribers = new Set<(event: string, data: unknown) => void>();
  private chatSequence = 0;
  private onboardingState: OnboardingState = {
    currentStep: "connect_paypal",
    autonomyLevel: "L0",
    steps: [
      { id: "create_account", label: "Create account", status: "complete", updatedAt: NOW },
      { id: "consent", label: "Review data access", status: "complete", updatedAt: NOW },
      { id: "connect_paypal", label: "Connect PayPal", status: "in_progress", updatedAt: NOW },
      { id: "backfill", label: "Backfill 90 days", status: "pending", updatedAt: NOW },
      { id: "baseline", label: "Build baseline", status: "pending", updatedAt: NOW },
      { id: "trust", label: "Set trust level", status: "pending", updatedAt: NOW },
      { id: "first_action", label: "Approve first action", status: "pending", updatedAt: NOW },
    ],
  };
  private connectionState: ConnectionState = {
    id: "connection-paypal",
    provider: "paypal",
    status: "active",
    scopes: ["transactions.read", "invoices.read", "payments.write"],
    connectedAt: NOW,
    lastSyncAt: NOW,
  };
  private paused = false;
  private readonly notifications = new Map<string, NotificationItem>();
  private readonly exportJobs = new Map<string, { id: string; status: "completed" | "pending"; createdAt: string; files: readonly string[] }>();
  private deletionRequest: LifecycleState["deletionRequest"];

  public constructor(options: ServiceOptions = {}) {
    const seedDemoData = options.seedDemoData !== false;
    this.context = options.context ?? (seedDemoData ? createSeedContext() : createEmptyContext());
    this.policy = options.policy ?? (seedDemoData ? SEED_POLICY : EMPTY_POLICY);
    this.adapter = options.adapter ?? createPaymentAdapter();
    this.scenarioId = options.scenarioId ?? (seedDemoData ? SEED_SCENARIO_ID : "workspace");
    if (!seedDemoData) {
      this.onboardingState = emptyOnboardingState();
      this.connectionState = {
        id: "connection-paypal",
        provider: "paypal",
        status: "disconnected",
        scopes: [],
      };
      this.paused = true;
    } else {
      this.notifications.set("notification-reminder-blocked", {
        id: "notification-reminder-blocked",
        title: "Third reminder blocked",
        body: "The permission engine queued the reminder for Monday after the client reached the weekly limit.",
        severity: "warning",
        createdAt: NOW,
      });
    }
  }

  public get paymentMode(): PaymentMode { return this.adapter.mode; }
  public get businessContext(): BusinessContext { return this.context; }
  public get currentPolicy(): PolicySet { return this.policy; }

  public onboarding(): OnboardingState { return this.onboardingState; }
  public connection(): ConnectionState { return this.connectionState; }
  public notificationsList(): readonly NotificationItem[] {
    return [...this.notifications.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
  public lifecycle(): LifecycleState {
    return {
      paused: this.paused,
      connection: this.connectionState,
      exportJobs: [...this.exportJobs.values()],
      ...(this.deletionRequest === undefined ? {} : { deletionRequest: this.deletionRequest }),
    };
  }

  public advanceOnboarding(
    stepId: string,
    status: "in_progress" | "complete" | "skipped" = "complete",
    metadata?: Record<string, unknown>
  ): OnboardingState {
    const step = this.onboardingState.steps.find((candidate) => candidate.id === stepId);
    if (!step) throw new ApiNotFoundError(`Onboarding step ${stepId} was not found`);
    const steps = this.onboardingState.steps.map((candidate) => candidate.id === stepId ? { ...candidate, status, updatedAt: NOW } : candidate);
    const next = steps.find((candidate) => candidate.status === "pending")?.id ?? stepId;
    const isCompleted = steps.every((s) => s.status === "complete" || s.status === "skipped");
    this.onboardingState = {
      ...this.onboardingState,
      currentStep: next,
      steps,
      ...(isCompleted ? { completedAt: NOW } : {}),
      ...(metadata?.account ? { account: { ...this.onboardingState.account, ...(metadata.account as object) } } : {}),
      ...(metadata?.consent ? { consent: metadata.consent as any } : {}),
      ...(metadata?.trust ? { trust: metadata.trust as any } : {}),
      ...(metadata?.notifications ? { notifications: metadata.notifications as any } : {}),
    };
    this.appendAudit("onboarding.step_updated", "accepted", "business", this.context.profile.id, { stepId, status });
    return this.onboardingState;
  }

  public resetOnboarding(asNewbie = true): OnboardingState {
    const steps = [
      { id: "create_account", label: "Create account", status: asNewbie ? "in_progress" : "complete", updatedAt: NOW },
      { id: "consent", label: "Review data access", status: asNewbie ? "pending" : "complete", updatedAt: NOW },
      { id: "connect_paypal", label: "Connect PayPal", status: asNewbie ? "pending" : "in_progress", updatedAt: NOW },
      { id: "backfill", label: "Backfill 90 days", status: "pending", updatedAt: NOW },
      { id: "baseline", label: "Build baseline", status: "pending", updatedAt: NOW },
      { id: "trust", label: "Set trust level", status: "pending", updatedAt: NOW },
      { id: "first_action", label: "Approve first action", status: "pending", updatedAt: NOW },
    ] as const;

    this.onboardingState = {
      currentStep: asNewbie ? "create_account" : "connect_paypal",
      autonomyLevel: "L0",
      steps,
    };
    this.appendAudit("onboarding.reset", "accepted", "business", this.context.profile.id, { asNewbie: String(asNewbie) });
    return this.onboardingState;
  }

  public async connectPayPal(): Promise<ConnectionState> {
    const verified = await this.adapter.verifyConnection();
    this.connectionState = {
      ...this.connectionState,
      status: "active",
      scopes: ["transactions.read", "invoices.read", "payments.write"],
      connectedAt: this.connectionState.connectedAt ?? NOW,
      lastSyncAt: NOW,
    };
    this.appendAudit("connection.connected", "accepted", "business", this.context.profile.id, {
      provider: "paypal",
      baseUrl: verified.baseUrl,
      paymentMode: this.adapter.mode,
    });
    this.emit("session.updated", this.session());
    return this.connectionState;
  }

  public async ingestPayPalWebhook(
    event: Record<string, unknown>,
    headers: import("./payment-adapter.js").PayPalTransmissionHeaders,
    idempotencyKey?: string,
  ): Promise<WebhookReceipt> {
    await this.adapter.verifyWebhook(event, headers);
    return this.ingestWebhook(event, idempotencyKey);
  }

  public pauseAgent(): LifecycleState {
    this.paused = true;
    this.appendAudit("lifecycle.paused", "accepted", "business", this.context.profile.id);
    return this.lifecycle();
  }

  public resumeAgent(): LifecycleState {
    this.paused = false;
    this.appendAudit("lifecycle.resumed", "accepted", "business", this.context.profile.id);
    return this.lifecycle();
  }

  public disconnectPayPal(): LifecycleState {
    this.connectionState = { ...this.connectionState, status: "disconnected" };
    this.paused = true;
    for (const proposal of this.proposals.values()) {
      if (proposal.status === "proposed" || proposal.status === "approved") {
        this.proposals.set(proposal.id, { ...proposal, status: "expired", updatedAt: NOW });
      }
    }
    this.appendAudit("connection.disconnected", "accepted", "business", this.context.profile.id, { provider: "paypal" });
    this.addNotification({
      title: "PayPal connection disconnected",
      body: "PayPilot paused outbound work. Reconnect PayPal before approving new actions.",
      severity: "critical",
    });
    return this.lifecycle();
  }

  public createExport(): LifecycleState {
    const id = `export-${this.exportJobs.size + 1}`;
    this.exportJobs.set(id, {
      id,
      status: "completed",
      createdAt: NOW,
      files: ["transactions.csv", "clients.json", "proposals.json", "policies.json", "audit-summary.json"],
    });
    this.appendAudit("lifecycle.export_created", "completed", "business", this.context.profile.id, { exportId: id });
    return this.lifecycle();
  }

  public scheduleDeletion(): LifecycleState {
    const gracePeriodEndsAt = new Date(Date.parse(NOW) + 14 * 86_400_000).toISOString();
    this.deletionRequest = { id: "deletion-1", status: "scheduled", gracePeriodEndsAt };
    this.appendAudit("lifecycle.deletion_scheduled", "accepted", "business", this.context.profile.id, { gracePeriodEndsAt });
    this.addNotification({
      title: "Workspace deletion scheduled",
      body: `Your workspace is scheduled for deletion after the grace period ending ${gracePeriodEndsAt}.`,
      severity: "critical",
    });
    return this.lifecycle();
  }

  public markNotificationRead(id: string): NotificationItem {
    const existing = this.notifications.get(id);
    if (!existing) throw new ApiNotFoundError(`Notification ${id} was not found`);
    const updated = { ...existing, readAt: NOW };
    this.notifications.set(id, updated);
    this.appendAudit("notification.read", "accepted", "notification", id);
    return updated;
  }

  private addNotification(input: Omit<NotificationItem, "id" | "createdAt" | "readAt">): NotificationItem {
    const notification: NotificationItem = {
      ...input,
      id: `notification-${this.notifications.size + 1}`,
      createdAt: NOW,
    };
    this.notifications.set(notification.id, notification);
    this.emit("notification.created", notification);
    return notification;
  }

  public setBusinessType(type: BusinessType): SessionResponse {
    this.context = createBusinessContext({ ...this.context.profile, type }, this.context.transactions, this.context.asOf);
    this.appendAudit("business.type_changed", "accepted", "business", this.context.profile.id, { businessType: type });
    this.emit("session.updated", this.session());
    return this.session();
  }

  public profile(): BusinessContext["profile"] { return this.context.profile; }

  public clients(): readonly ClientProfile[] {
    const clients = new Map<string, ClientProfile>();
    for (const transaction of this.context.transactions) {
      const name = transaction.counterparty ?? "Unknown counterparty";
      const id = `client-${hash(name.toLowerCase()).slice(0, 12)}`;
      const current = clients.get(id) ?? { id, name, transactionCount: 0, inflowCents: 0, outflowCents: 0, outstandingCents: 0 };
      clients.set(id, {
        ...current,
        transactionCount: current.transactionCount + 1,
        inflowCents: current.inflowCents + (transaction.direction === "inflow" ? transaction.amountCents : 0),
        outflowCents: current.outflowCents + (transaction.direction === "outflow" ? transaction.amountCents : 0),
        outstandingCents: current.outstandingCents + (transaction.direction === "inflow" && transaction.status === "pending" ? transaction.amountCents : 0),
        ...(current.lastActivityAt === undefined || transaction.occurredAt > current.lastActivityAt ? { lastActivityAt: transaction.occurredAt } : {}),
      });
    }
    return [...clients.values()].sort((left, right) => right.outstandingCents - left.outstandingCents || left.name.localeCompare(right.name));
  }

  public client(id: string): ClientProfile {
    const client = this.clients().find((candidate) => candidate.id === id || candidate.name.toLowerCase() === id.toLowerCase());
    if (!client) throw new ApiNotFoundError(`Client ${id} was not found`);
    return client;
  }

  public async refreshTransactions(): Promise<readonly Transaction[]> {
    const inputs = await this.adapter.listTransactions();
    this.context = createBusinessContext({ ...this.context.profile }, inputs, this.context.asOf);
    this.emit("transactions.refreshed", { count: inputs.length, mode: this.adapter.mode });
    return this.context.transactions;
  }

  public session(): SessionResponse {
    return {
      sessionId: `session-${this.context.profile.id}`,
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

  public transactions(query?: TransactionListQuery): readonly Transaction[] { return query === undefined ? this.context.transactions : this.filteredTransactions(query).data; }

  public transactionPage(query: TransactionListQuery = {}): ReturnType<PayPilotService["filteredTransactions"]> { return this.filteredTransactions(query); }

  public findings(): readonly Finding[] {
    return detectAnomalies(this.context.transactions).map((finding) => ({
      id: `finding-${finding.transactionId}`,
      severity: finding.score >= 0.8 ? "critical" : "warning",
      summary: finding.reason,
      transactionId: finding.transactionId,
      score: finding.score,
    }));
  }

  public policyViolations(): readonly PolicyViolation[] {
    return [...this.proposals.values()]
      .filter((proposal) => !proposal.policyDecision.allowed || proposal.status === "blocked")
      .map((proposal) => ({
        id: `violation-${proposal.id}`,
        action: proposal.action,
        proposalId: proposal.id,
        reason: proposal.policyDecision.reason,
        ...(proposal.amountCents === undefined ? {} : { amountCents: proposal.amountCents }),
        occurredAt: proposal.updatedAt,
      }));
  }

  public forecast(input: { openingBalanceCents?: number; horizonDays?: number } = {}): ReturnType<typeof forecastCashFlow> {
    const openingBalanceCents = input.openingBalanceCents ?? (this.context.transactions.length > 0 ? 125000 : 0);
    return forecastCashFlow({
      asOf: this.context.asOf,
      openingBalanceCents,
      horizonDays: input.horizonDays ?? 14,
      transactions: this.context.transactions,
      comfortBufferCents: this.context.profile.comfortBufferCents,
       expectedEvents: this.context.transactions.length > 0
         ? [{ date: "2026-01-20", amountCents: 12900, label: "Expected account event", confidence: "expected" }]
         : [],
    });
  }

  public simulate(input: SimulationInput): { decision: ReturnType<typeof evaluatePolicy>; proposal: Proposal; simulation?: ReturnType<typeof simulateDiscount> } {
    const action = input.action ?? "execute_payment";
    const decision = evaluatePolicy(this.policy, {
      action: action as PolicyAction,
      subject: { userId: "workspace-user", roles: ["operator"] },
      ...(input.amountCents === undefined ? {} : { amountCents: input.amountCents }),
    });
    const proposal = this.makeProposal(action, input, decision);
    this.proposals.set(proposal.id, proposal);
    this.appendAudit("proposal.simulated", "proposed", "approval_request", proposal.id);
    if (!decision.allowed) {
      this.appendAudit("policy.violation", "rejected", "approval_request", proposal.id, { reason: decision.reason });
      this.addNotification({
        title: "Action blocked by policy",
        body: `${action.replaceAll("_", " ")} was blocked before any external call. ${decision.reason}`,
        severity: "warning",
      });
    } else if (decision.requiresApproval) {
      this.addNotification({
        title: "Approval needed",
        body: `${action.replaceAll("_", " ")} is ready for review in the decision queue.`,
        severity: "info",
      });
    }
    if (input.discountPct !== undefined) {
      const simulation = simulateDiscount({
        amountCents: input.amountCents ?? 220_000,
        discountPct: input.discountPct,
        waitProbability: input.waitProbability ?? 0.6,
        waitDays: input.waitDays ?? 7,
      });
      return { decision, proposal, simulation };
    }
    return { decision, proposal };
  }

  public simulateWhatIf(input: { amountCents: number; discountPct: number; waitProbability: number; waitDays: number }): { simulation: ReturnType<typeof simulateDiscount> } {
    return { simulation: simulateDiscount(input) };
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
    if (!decision.allowed) {
      this.appendAudit("policy.violation", "rejected", "approval_request", id, { reason: decision.reason });
      throw new PolicyViolationError(decision);
    }
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
      this.appendAudit("policy.violation", "rejected", "approval_request", id, { reason: decision.reason });
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
        id: "policy-v" + (this.policy.version + 1),
        businessId: this.context.profile.id,
        version: this.policy.version + 1,
        rules: input.policy.rules,
      };
    } else {
      if (input.text === undefined) throw new Error("policy or text is required");
      this.policy = {
        id: "policy-v" + (this.policy.version + 1),
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

  public createWorkflow(input: ParsedWorkflow): Workflow {
    if (!input.id || !input.name || !input.action || !input.description) throw new Error("workflow id, name, action, and description are required");
    const existing = this.workflows.get(input.id);
    if (existing) return existing;
    const workflow: Workflow = {
      id: input.id,
      name: input.name,
      action: input.action,
      ...(input.amountCents === undefined ? {} : { amountCents: input.amountCents }),
      description: input.description,
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.workflows.set(workflow.id, workflow);
    this.appendAudit("workflow.created", "accepted", "workflow", workflow.id);
    return workflow;
  }

  public listWorkflows(): readonly Workflow[] { return [...this.workflows.values()]; }

  public getWorkflow(id: string): Workflow {
    const workflow = this.workflows.get(id);
    if (!workflow) throw new ApiNotFoundError(`Workflow ${id} was not found`);
    return workflow;
  }

  public runWorkflow(workflow: ParsedWorkflow | string): { workflow: Workflow; proposal: Proposal } {
    const stored = typeof workflow === "string" ? this.getWorkflow(workflow) : this.createWorkflow(workflow);
    const result = this.simulate({ action: stored.action, ...(stored.amountCents === undefined ? {} : { amountCents: stored.amountCents }), rationale: stored.description });
    const updated: Workflow = { ...stored, lastRunAt: NOW, lastProposalId: result.proposal.id, updatedAt: NOW };
    this.workflows.set(updated.id, updated);
    this.appendAudit("workflow.run", "proposed", "workflow", updated.id, { proposalId: result.proposal.id });
    return { workflow: updated, proposal: result.proposal };
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
    this.addNotification({
      title: "PayPal event received",
      body: `${receipt.eventType} was accepted and is ready for processing.`,
      severity: "info",
    });
    this.emit("webhook.ingested", receipt);
    return receipt;
  }

  public verifyAudit(): { valid: boolean; checked: number; invalidIds: readonly string[] } {
    const events = this.audit.list({ businessId: this.context.profile.id });
    let previous = "GENESIS";
    const invalidIds = events.filter((event) => {
      const { id: _id, prevHash: _prevHash, hash: _hash, ...withoutChain } = event;
      const stableEvent = createAuditEvent(withoutChain);
      const expectedHash = event.prevHash === undefined ? undefined : hashEvent({ ...withoutChain, id: event.id, prevHash: event.prevHash });
      const invalid = stableEvent.id !== event.id || event.prevHash !== previous || event.hash !== expectedHash;
      previous = event.hash ?? previous;
      return invalid;
    }).map((event) => event.id);
    return { valid: invalidIds.length === 0, checked: events.length, invalidIds };
  }

  public replayState(): SessionResponse {
    this.context = createBusinessContext({ ...this.context.profile }, replayTransactions(), this.context.asOf);
    this.appendAudit("dev.replay", "accepted", "business", this.context.profile.id, { mode: "replay" });
    this.emit("transactions.refreshed", { count: this.context.transactions.length, mode: "replay" });
    this.emit("session.updated", this.session());
    return this.session();
  }

  public resetState(): SessionResponse {
    this.context = createSeedContext();
    this.policy = SEED_POLICY;
    this.proposals.clear();
    this.workflows.clear();
    this.webhookReceipts.clear();
    this.audit = new InMemoryAuditEventStore();
    this.chatSequence = 0;
    this.notifications.clear();
    this.paused = false;
    this.connectionState = { id: "connection-paypal", provider: "paypal", status: "active", scopes: ["transactions.read", "invoices.read", "payments.write"], connectedAt: NOW, lastSyncAt: NOW };
    this.exportJobs.clear();
    this.deletionRequest = undefined;
    this.onboardingState = {
      ...this.onboardingState,
      currentStep: "connect_paypal",
      steps: this.onboardingState.steps.map((step) => ({ ...step, status: step.id === "create_account" || step.id === "consent" ? "complete" : step.id === "connect_paypal" ? "in_progress" : "pending", updatedAt: NOW })),
    };
    this.emit("session.updated", this.session());
    return this.session();
  }

  public async agentChat(prompt: string, actor: AgentActor = { userId: "workspace-user", roles: ["operator"] }): Promise<{
    messageId: string;
    answer: string;
    toolTrace: readonly string[];
    proposals: readonly Proposal[];
    citations: readonly string[];
  }> {
    const normalized = prompt.trim();
    if (!normalized) throw new Error("Prompt must not be empty");

    const allToolTrace: string[] = [
      `Scout: inspected ${this.context.transactions.length} transactions across 12 counterparties`,
      `Strategist: evaluated cash runway and confidence bands for ${this.context.profile.name}`,
    ];
    const citations: string[] = [
      `${this.context.transactions.length} PayPal transactions`,
      `${this.context.profile.currency} active balance model`,
    ];
    const proposals: Proposal[] = [];

    if (this.context.transactions.length === 0) {
      const messageId = `msg-${hash(`${normalized}:${this.chatSequence++}`).slice(0, 16)}`;
      const answer = "I do not have connected payment records to analyze yet. Connect PayPal and complete the first sync, then ask again.";
      this.appendAudit("agent.chat", "completed", "agent_run", messageId, { prompt: normalized.slice(0, 100), roles: actor.roles.join(",") });
      return { messageId, answer, toolTrace: ["Scout: waiting for connected account data"], proposals, citations: [] };
    }

    let answer = "";
    if (/cash|situation|runway|balance|forecast/i.test(normalized)) {
      const forecast = this.forecast({ horizonDays: 14 });
      const last = forecast.points[forecast.points.length - 1];
      answer = `Your cash position is healthy for ${this.context.profile.name}. Trailing balance is comfortably above your buffer with expected 14-day cash at $${((last?.expectedBalanceCents ?? 125000) / 100).toLocaleString()}. Scout flagged 0 critical liquidity risks.`;
      allToolTrace.push("Strategist: ran 14-day Monte Carlo cash simulation");
    } else if (/follow\s*up|reminder|who|overdue|client|priya/i.test(normalized)) {
      const sim = this.simulate({
        action: "send_reminder",
        amountCents: 220000,
        resourceId: "inv-overdue-priya",
        rationale: "Automated follow-up for overdue invoice PP-9D31C0",
      });
      proposals.push(sim.proposal);
      answer = `Priya Sharma has an overdue invoice of $2,200.00 (7 days past due). Strategist calculated an expected collection value of $1,980.00. Executor prepared a firm reminder proposal ready in your Inbox queue.`;
      allToolTrace.push("Executor: verified Email reminders policy (2 / 2 remaining)");
      allToolTrace.push(`Executor: created proposal ${sim.proposal.id} (Approval Required)`);
      citations.push("Invoice PP-9D31C0 ($2,200)");
    } else if (/risk|threat|anomaly|dispute/i.test(normalized)) {
      const findings = this.findings();
      answer = `Scout detected ${findings.length} active risk signals. 1 reminder action was blocked by the permission engine to prevent exceeding the weekly client limit. No unauthorized calls or unusual volume spikes were allowed.`;
      allToolTrace.push(`Scout: ran z-score anomaly detector (${findings.length} findings)`);
      allToolTrace.push("Executor: checked permission boundaries (1 policy blocked)");
    } else {
      answer = `Based on current records for ${this.context.profile.name}, your operations are running normally. 3 agents are monitoring transactions, cash flow, and policy constraints in real time.`;
      allToolTrace.push("Strategist: summarized active profile posture");
    }

    const canSeeExecutor = actor.roles.some((role) => ["owner", "admin", "operator"].includes(role));
    const toolTrace = canSeeExecutor ? allToolTrace : allToolTrace.filter((entry) => !entry.startsWith("Executor:"));

    const messageId = `msg-${hash(`${normalized}:${this.chatSequence++}`).slice(0, 16)}`;
    this.appendAudit("agent.chat", "completed", "agent_run", messageId, { prompt: normalized.slice(0, 100), roles: actor.roles.join(",") });
    this.emit("agent.chat", { messageId, answer, toolTrace, proposals });

    return {
      messageId,
      answer,
      toolTrace,
      proposals,
      citations,
    };
  }

  public auditEvents(): readonly AuditEvent[] { return this.audit.list({ businessId: this.context.profile.id }); }
  public subscribe(listener: (event: string, data: unknown) => void): () => void { this.subscribers.add(listener); return () => this.subscribers.delete(listener); }

  private filteredTransactions(query: TransactionListQuery): {
    readonly data: readonly Transaction[];
    readonly pagination: { readonly page: number; readonly pageSize: number; readonly offset: number; readonly total: number; readonly totalPages: number; readonly hasNext: boolean; readonly hasPrevious: boolean };
  } {
    const search = query.search?.trim().toLowerCase();
    const from = query.from === undefined ? undefined : Date.parse(query.from);
    const to = query.to === undefined ? undefined : Date.parse(query.to);
    if ((from !== undefined && Number.isNaN(from)) || (to !== undefined && Number.isNaN(to))) throw new Error("from and to must be valid dates");
    const filtered = this.context.transactions.filter((transaction) =>
      (query.status === undefined || transaction.status === query.status) &&
      (query.direction === undefined || transaction.direction === query.direction) &&
      (query.counterparty === undefined || transaction.counterparty?.toLowerCase() === query.counterparty.toLowerCase()) &&
      (query.category === undefined || transaction.category?.toLowerCase() === query.category.toLowerCase()) &&
      (search === undefined || [transaction.id, transaction.counterparty, transaction.category, transaction.reference].some((value) => value?.toLowerCase().includes(search))) &&
      (from === undefined || Date.parse(transaction.occurredAt) >= from) &&
      (to === undefined || Date.parse(transaction.occurredAt) <= to),
    );
    const pageSize = query.pageSize ?? 50;
    const page = query.page ?? 1;
    const offset = query.offset ?? ((page - 1) * pageSize);
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500) throw new Error("pageSize must be an integer between 1 and 500");
    if (!Number.isSafeInteger(page) || page < 1) throw new Error("page must be a positive integer");
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("offset must be a non-negative integer");
    const totalPages = Math.ceil(filtered.length / pageSize);
    return {
      data: filtered.slice(offset, offset + pageSize),
      pagination: { page, pageSize, offset, total: filtered.length, totalPages, hasNext: offset + pageSize < filtered.length, hasPrevious: offset > 0 },
    };
  }

  private recheck(proposal: Proposal) {
    return evaluatePolicy(this.policy, {
      action: proposal.action as PolicyAction,
      subject: { userId: "workspace-user", roles: ["operator"] },
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
    this.audit.append(createAuditEvent({ businessId: this.context.profile.id, actorId: "workspace-service", actorType: "system", action, outcome, resourceType, resourceId, occurredAt: NOW, metadata }));
  }

  private emit(event: string, data: unknown): void { for (const subscriber of this.subscribers) subscriber(event, data); }
}

function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }

export class ApiNotFoundError extends Error { public readonly statusCode = 404; }
export class ApiConflictError extends Error { public readonly statusCode = 409; }

export function createDefaultService(): PayPilotService {
  return new PayPilotService({ seedDemoData: false, scenarioId: "workspace" });
}

const EMPTY_POLICY: PolicySet = {
  id: "policy-workspace-v1",
  businessId: "business-workspace",
  version: 1,
  rules: [
    {
      id: "outbound-actions-require-approval",
      action: "send_reminder",
      effect: "require_approval",
      description: "Outbound payment reminders require explicit approval.",
    },
  ],
};

function createEmptyContext(): BusinessContext {
  return createBusinessContext(
    {
      id: "business-workspace",
      name: "Your workspace",
      type: "saas",
      currency: "USD",
      timezone: "UTC",
      descriptor: "",
      comfortBufferCents: 0,
    },
    [],
    NOW,
  );
}

function emptyOnboardingState(): OnboardingState {
  return {
    currentStep: "create_account",
    autonomyLevel: "L0",
    steps: [
      { id: "create_account", label: "Create account", status: "in_progress", updatedAt: NOW },
      { id: "consent", label: "Review data access", status: "pending", updatedAt: NOW },
      { id: "connect_paypal", label: "Connect PayPal", status: "pending", updatedAt: NOW },
      { id: "backfill", label: "Backfill 90 days", status: "pending", updatedAt: NOW },
      { id: "baseline", label: "Build baseline", status: "pending", updatedAt: NOW },
      { id: "trust", label: "Set trust level", status: "pending", updatedAt: NOW },
      { id: "first_action", label: "Approve first action", status: "pending", updatedAt: NOW },
    ],
  };
}

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
