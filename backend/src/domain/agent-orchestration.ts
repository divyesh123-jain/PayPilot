import type { BusinessContext } from "./business-context.js";
import { detectAnomalies, type Anomaly } from "./anomaly-detection.js";
import { evaluatePolicy, type PolicyDecision, type PolicySet } from "./policy.js";

export type AgentRole = "scout" | "strategist" | "executor";
export type AgentAction = "send_reminder" | "create_workflow" | "issue_refund" | "schedule_payment" | "export_data";

export interface AgentContext {
  readonly runId: string;
  readonly business: BusinessContext;
  readonly policy: PolicySet;
  readonly actor: { readonly userId: string; readonly roles: readonly string[] };
}

export interface ScoutObservation {
  readonly id: string;
  readonly kind: "anomaly" | "cash_flow" | "collection" | "signal";
  readonly severity: "info" | "warning" | "critical";
  readonly summary: string;
  readonly evidence: Readonly<Record<string, string | number | boolean>>;
}

export interface ScoutAgent {
  readonly role: "scout";
  observe(context: AgentContext): Promise<readonly ScoutObservation[]>;
}

export interface ProposedAction {
  readonly id: string;
  readonly action: AgentAction;
  readonly rationale: string;
  readonly amountCents?: number;
  readonly resourceId?: string;
  readonly requiresApproval: boolean;
}

export interface StrategistAgent {
  readonly role: "strategist";
  plan(context: AgentContext, observations: readonly ScoutObservation[]): Promise<readonly ProposedAction[]>;
}

export interface ExecutionResult {
  readonly actionId: string;
  readonly status: "completed" | "awaiting_approval" | "blocked" | "dry_run";
  readonly decision: PolicyDecision;
  readonly message: string;
}

export interface ExecutorAgent {
  readonly role: "executor";
  execute(context: AgentContext, action: ProposedAction): Promise<ExecutionResult>;
}

export interface AgentRunResult {
  readonly runId: string;
  readonly observations: readonly ScoutObservation[];
  readonly actions: readonly ProposedAction[];
  readonly executions: readonly ExecutionResult[];
}

export interface PayPilotAgentOrchestrator {
  run(context: AgentContext): Promise<AgentRunResult>;
}

const mapAction = (anomaly: Anomaly): AgentAction => anomaly.type === "duplicate" ? "export_data" : "send_reminder";

/** A dry-run fallback that makes the agent flow useful and deterministic without an AI provider or integrations. */
export function createDeterministicOrchestrator(): PayPilotAgentOrchestrator {
  const scout: ScoutAgent = {
    role: "scout",
    async observe(context) {
      const anomalies = detectAnomalies(context.business.transactions);
      return anomalies.map((anomaly) => ({
        id: `observation-${anomaly.transactionId}`,
        kind: "anomaly" as const,
        severity: anomaly.score >= 0.8 ? "critical" as const : "warning" as const,
        summary: anomaly.reason,
        evidence: { transactionId: anomaly.transactionId, score: anomaly.score, type: anomaly.type },
      }));
    },
  };
  const strategist: StrategistAgent = {
    role: "strategist",
    async plan(_context, observations) {
      return observations.map((observation, index) => ({
        id: `action-${index + 1}-${observation.id}`,
        action: mapAction({ type: observation.evidence.type as Anomaly["type"], transactionId: observation.evidence.transactionId as string, score: observation.evidence.score as number, reason: observation.summary, relatedTransactionIds: [] }),
        rationale: observation.summary,
        resourceId: String(observation.evidence.transactionId),
        requiresApproval: false,
      }));
    },
  };
  const executor: ExecutorAgent = {
    role: "executor",
    async execute(context, action) {
      const decision = evaluatePolicy(context.policy, {
        action: action.action,
        subject: context.actor,
        ...(action.amountCents === undefined ? {} : { amountCents: action.amountCents }),
      });
      if (!decision.allowed) return { actionId: action.id, status: "blocked", decision, message: decision.reason };
      if (decision.requiresApproval || action.requiresApproval) {
        return { actionId: action.id, status: "awaiting_approval", decision, message: "Action queued for approval; no external side effect was performed." };
      }
      return { actionId: action.id, status: "dry_run", decision, message: "Action planned successfully; no external side effect was performed." };
    },
  };
  return {
    async run(context) {
      const observations = await scout.observe(context);
      const actions = await strategist.plan(context, observations);
      const executions = await Promise.all(actions.map((action) => executor.execute(context, action)));
      return { runId: context.runId, observations, actions, executions };
    },
  };
}
