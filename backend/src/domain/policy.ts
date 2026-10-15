export type PolicyAction =
  | "read_transactions"
  | "read_forecast"
  | "send_reminder"
  | "create_workflow"
  | "issue_refund"
  | "schedule_payment"
  | "execute_payment"
  | "export_data";

export type PolicyEffect = "allow" | "deny" | "require_approval";
export type PolicySubject = { userId: string; roles?: readonly string[] };

export interface PolicyRule {
  readonly id: string;
  readonly action: PolicyAction;
  readonly effect: PolicyEffect;
  readonly maxAmountCents?: number;
  readonly requiresApprovalAboveCents?: number;
  readonly roles?: readonly string[];
  readonly description?: string;
}

export interface PolicySet {
  readonly id: string;
  readonly businessId: string;
  readonly version: number;
  readonly rules: readonly PolicyRule[];
}

export interface PolicyEvaluationInput {
  readonly action: PolicyAction;
  readonly subject: PolicySubject;
  readonly amountCents?: number;
}

export interface PolicyDecision {
  readonly allowed: boolean;
  readonly requiresApproval: boolean;
  readonly reason: string;
  readonly matchedRuleIds: readonly string[];
}

export interface ParsedPolicy {
  readonly rule: PolicyRule;
  readonly confidence: "high" | "medium";
  readonly warnings: readonly string[];
}

const ACTION_WORDS: ReadonlyArray<readonly [PolicyAction, RegExp]> = [
  ["issue_refund", /refunds?|refund/i],
  ["send_reminder", /reminders?|collection|dunning/i],
  ["schedule_payment", /schedule(?:d)? payments?|scheduled payments?/i],
  ["execute_payment", /(?:execute|make|send) payments?/i],
  ["create_workflow", /workflows?|automations?/i],
  ["export_data", /exports?|download/i],
  ["read_transactions", /transactions?|payments?\s+data/i],
  ["read_forecast", /forecasts?|cash\s+flow/i],
];

function parseAmountCents(text: string): number | undefined {
  const match = text.match(/(?:\$|usd\s*)(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!match?.[1]) return undefined;
  const amount = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : undefined;
}

function inferAction(text: string): PolicyAction | undefined {
  return ACTION_WORDS.find(([, pattern]) => pattern.test(text))?.[0];
}

function inferEffect(text: string): PolicyEffect {
  if (/\b(?:deny|never|block|disallow)\b/i.test(text)) return "deny";
  if (/\b(?:approval|approve|review)\b/i.test(text)) return "require_approval";
  return "allow";
}

/** Parses the small, intentionally explicit policy language used by the UI. */
export function parsePolicyText(text: string, id = "draft-policy"): ParsedPolicy {
  const normalized = text.trim();
  if (!normalized) throw new Error("Policy text must not be empty");
  const action = inferAction(normalized);
  if (!action) {
    throw new Error("Could not identify a supported policy action");
  }

  const effect = inferEffect(normalized);
  const amountCents = parseAmountCents(normalized);
  const threshold = /\b(?:above|over|exceed(?:ing)?|greater than)\b/i.test(normalized)
    ? amountCents
    : undefined;
  const maxAmountCents = /\b(?:under|below|up to|less than)\b/i.test(normalized)
    ? amountCents
    : undefined;
  const warnings: string[] = [];
  if (amountCents === undefined && /\$|\busd\b/i.test(normalized)) {
    warnings.push("The amount could not be parsed; the rule applies to all amounts.");
  }
  if (effect === "allow" && (action === "execute_payment" || action === "issue_refund")) {
    warnings.push("Mutating payment actions should normally include an approval threshold.");
  }

  return {
    rule: {
      id,
      action,
      effect,
      ...(maxAmountCents === undefined ? {} : { maxAmountCents }),
      ...(threshold === undefined ? {} : { requiresApprovalAboveCents: threshold }),
      description: normalized,
    },
    confidence: amountCents === undefined ? "medium" : "high",
    warnings,
  };
}

function matchesRule(rule: PolicyRule, input: PolicyEvaluationInput): boolean {
  if (rule.action !== input.action) return false;
  if (rule.roles && !rule.roles.some((role) => input.subject.roles?.includes(role))) return false;
  if (rule.maxAmountCents !== undefined && (input.amountCents ?? 0) > rule.maxAmountCents) return false;
  return true;
}

export function evaluatePolicy(policy: PolicySet, input: PolicyEvaluationInput): PolicyDecision {
  if (input.amountCents !== undefined && (!Number.isSafeInteger(input.amountCents) || input.amountCents < 0)) {
    throw new Error("amountCents must be a non-negative integer");
  }
  const matches = policy.rules.filter((rule) => matchesRule(rule, input));
  const matchingIds = matches.map((rule) => rule.id);
  const deny = matches.find((rule) => rule.effect === "deny");
  if (deny) {
    return { allowed: false, requiresApproval: false, reason: `Denied by policy ${deny.id}`, matchedRuleIds: matchingIds };
  }

  const approval = matches.find(
    (rule) =>
      rule.effect === "require_approval" ||
      (rule.requiresApprovalAboveCents !== undefined &&
        (input.amountCents ?? 0) > rule.requiresApprovalAboveCents),
  );
  if (approval) {
    return {
      allowed: true,
      requiresApproval: true,
      reason: `Approval required by policy ${approval.id}`,
      matchedRuleIds: matchingIds,
    };
  }

  const allow = matches.find((rule) => rule.effect === "allow");
  if (allow) {
    return { allowed: true, requiresApproval: false, reason: `Allowed by policy ${allow.id}`, matchedRuleIds: matchingIds };
  }

  const readOnly = input.action === "read_transactions" || input.action === "read_forecast";
  return {
    allowed: readOnly,
    requiresApproval: false,
    reason: readOnly ? "Read-only action allowed by default" : "No matching policy rule",
    matchedRuleIds: matchingIds,
  };
}

export class PolicyViolationError extends Error {
  constructor(public readonly decision: PolicyDecision) {
    super(decision.reason);
    this.name = "PolicyViolationError";
  }
}

export function enforcePolicy(policy: PolicySet, input: PolicyEvaluationInput): PolicyDecision {
  const decision = evaluatePolicy(policy, input);
  if (!decision.allowed) throw new PolicyViolationError(decision);
  return decision;
}
