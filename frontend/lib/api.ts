export type ApiSession = {
  sessionId?: string;
  paymentMode: "live" | "mock" | "replay";
  scenarioId: string;
  business: { id: string; name: string; type: string; currency: string };
  policy?: ApiPolicy;
};

export type ApiTransaction = {
  id: string;
  occurredAt: string;
  amountCents: number;
  signedAmountCents?: number;
  direction: "inflow" | "outflow";
  status: "pending" | "completed" | "failed" | "refunded";
  counterparty?: string;
  category?: string;
  reference?: string;
};

export type ApiFinding = {
  id: string;
  severity: "info" | "warning" | "critical";
  summary: string;
  transactionId: string;
  score: number;
};

export type ApiPolicyRule = {
  id: string;
  action: string;
  effect: "allow" | "deny" | "require_approval";
  maxAmountCents?: number;
  minAmountCents?: number;
  requiresApprovalAboveCents?: number;
  roles?: readonly string[];
  description?: string;
};

export type ApiPolicy = {
  id: string;
  businessId: string;
  version: number;
  rules: readonly ApiPolicyRule[];
};

export type ApiForecastPoint = {
  date: string;
  expectedBalanceCents: number;
  lowBalanceCents: number;
  highBalanceCents: number;
  confidencePercent: number;
  netChangeCents: number;
};

export type ApiForecast = {
  asOf: string;
  points: readonly ApiForecastPoint[];
  minimumExpectedBalanceCents: number;
  minimumExpectedDate: string;
  bufferBreached: boolean;
  narrative: string;
};

export type ApiAuditEvent = {
  id: string;
  actorId: string;
  actorType: "user" | "agent" | "system";
  action: string;
  outcome: string;
  resourceType: string;
  resourceId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type ApiProposal = {
  id: string;
  action?: string;
  status: string;
  amountCents?: number;
  rationale?: string;
  resourceId?: string;
  policyDecision: {
    allowed: boolean;
    requiresApproval: boolean;
    reason: string;
    matchedRuleIds?: readonly string[];
  };
};

export type ParsedPolicy = {
  rule: ApiPolicyRule;
  confidence: "high" | "medium";
  warnings: readonly string[];
};

export type ParsedWorkflow = {
  id: string;
  name: string;
  action: string;
  amountCents?: number;
  description: string;
};

export type ApiWhatIfSimulation = {
  simulation: {
    amountCents: number;
    discountPct: number;
    acceptEvCents: number;
    waitEvCents: number;
    waitProbability: number;
    waitDays: number;
    recommendation: "accept" | "wait";
    assumptions: readonly string[];
  };
};

export type AgentChatResponse = {
  messageId: string;
  answer: string;
  toolTrace: readonly string[];
  proposals: readonly ApiProposal[];
  citations: readonly string[];
};

export type AuditVerifyResponse = {
  valid: boolean;
  checked: number;
  invalidIds: readonly string[];
};

const configuredApiUrl = process.env.NEXT_PUBLIC_PAYPILOT_API_URL;
export const API_BASE_URL = configuredApiUrl
  ? /^https?:\/\//.test(configuredApiUrl)
    ? configuredApiUrl
    : `https://${configuredApiUrl}`
  : "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ? `: ${body.error}` : "";
    } catch {
      // Keep the status-only error when the server did not return JSON.
    }
    throw new Error(`PayPilot API returned ${response.status}${detail}`);
  }
  return response.json() as Promise<T>;
}

export function getApiSession(): Promise<ApiSession> {
  return request<ApiSession>("/api/session");
}

export function setBusinessSession(businessType: string): Promise<ApiSession> {
  return request<ApiSession>("/api/session", {
    method: "POST",
    body: JSON.stringify({ businessType }),
  });
}

export function simulateReminder(
  rationale: string,
  amountCents = 220000
): Promise<{ proposal: ApiProposal }> {
  return request<{ proposal: ApiProposal }>("/api/simulate", {
    method: "POST",
    body: JSON.stringify({ action: "send_reminder", rationale, amountCents }),
  });
}

export function simulateWhatIf(input: {
  amountCents: number;
  discountPct: number;
  waitProbability: number;
  waitDays: number;
}): Promise<ApiWhatIfSimulation> {
  return request<ApiWhatIfSimulation>("/api/simulate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function approveProposal(id: string): Promise<ApiProposal> {
  return request<ApiProposal>(`/api/proposals/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: "{}",
  });
}

export function verifyAudit(): Promise<AuditVerifyResponse> {
  return request<AuditVerifyResponse>("/api/audit/verify");
}

export function askAgent(prompt: string): Promise<AgentChatResponse> {
  return request<AgentChatResponse>("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function getTransactions(): Promise<{ data: ApiTransaction[]; mode: string }> {
  return request<{ data: ApiTransaction[]; mode: string }>("/api/transactions");
}

export function refreshTransactions(): Promise<{ data: ApiTransaction[]; mode: string }> {
  return request<{ data: ApiTransaction[]; mode: string }>("/api/transactions/refresh", {
    method: "POST",
    body: "{}",
  });
}

export function getFindings(): Promise<{ data: ApiFinding[] }> {
  return request<{ data: ApiFinding[] }>("/api/findings");
}

export function getForecast(horizonDays = 14): Promise<ApiForecast> {
  return request<ApiForecast>(`/api/forecast?horizonDays=${horizonDays}`);
}

export function getProposals(): Promise<{ data: ApiProposal[] }> {
  return request<{ data: ApiProposal[] }>("/api/proposals");
}

export function getPolicy(): Promise<ApiPolicy> {
  return request<ApiPolicy>("/api/policy");
}

export function savePolicy(policy: ApiPolicy): Promise<ApiPolicy> {
  return request<ApiPolicy>("/api/policy/save", {
    method: "POST",
    body: JSON.stringify({ policy }),
  });
}

export function parsePolicy(text: string): Promise<ParsedPolicy> {
  return request<ParsedPolicy>("/api/policy/parse", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function savePolicyText(text: string): Promise<ApiPolicy> {
  return request<ApiPolicy>("/api/policy/save", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function parseWorkflow(text: string): Promise<ParsedWorkflow> {
  return request<ParsedWorkflow>("/api/workflows/parse", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function runWorkflow(
  workflow: ParsedWorkflow
): Promise<{ workflow: ParsedWorkflow; proposal: ApiProposal }> {
  return request<{ workflow: ParsedWorkflow; proposal: ApiProposal }>("/api/workflows/run", {
    method: "POST",
    body: JSON.stringify({ workflow }),
  });
}

export function getWorkflows(): Promise<{ data: unknown[] }> {
  return request<{ data: unknown[] }>("/api/workflows");
}

export function getAuditEvents(): Promise<{ data: ApiAuditEvent[] }> {
  return request<{ data: ApiAuditEvent[] }>("/api/audit");
}

export function rejectProposal(id: string): Promise<ApiProposal> {
  return request<ApiProposal>(`/api/proposals/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: "{}",
  });
}

export function executeProposal(id: string): Promise<ApiProposal> {
  return request<ApiProposal>(`/api/proposals/${encodeURIComponent(id)}/execute`, {
    method: "POST",
    body: "{}",
  });
}

export function subscribeEventStream(onEvent: (event: string, data: any) => void): () => void {
  if (typeof window === "undefined" || !("EventSource" in window)) return () => {};
  try {
    const es = new EventSource(`${API_BASE_URL}/api/stream`);
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(event.type || "message", data);
      } catch {
        onEvent(event.type || "message", event.data);
      }
    };
    es.addEventListener("session", handler as EventListener);
    es.addEventListener("proposal.updated", handler as EventListener);
    es.addEventListener("webhook.ingested", handler as EventListener);
    es.addEventListener("agent.chat", handler as EventListener);
    es.onmessage = handler;
    return () => es.close();
  } catch {
    return () => {};
  }
}

export type OnboardingStep = {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "complete" | "skipped" | "failed";
  updatedAt: string;
};

export type OnboardingState = {
  currentStep: string;
  steps: readonly OnboardingStep[];
  autonomyLevel?: "L0" | "L1";
  completedAt?: string;
  account?: {
    email?: string;
    businessName?: string;
    businessType?: string;
    name?: string;
  };
  consent?: {
    granted: boolean;
    consentedAt?: string;
    scopes?: readonly string[];
  };
  trust?: {
    policyTemplate?: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    replyToEmail?: string;
  };
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    dailyDigest?: boolean;
  };
};

export type ConnectionState = {
  provider: "paypal";
  status: "active" | "needs_reauth" | "revoked" | "disconnected";
  connectedAt?: string;
  lastSyncAt?: string;
  scopes: readonly string[];
};

export type LifecycleState = {
  paused: boolean;
  connection: ConnectionState;
  exportJobs: readonly {
    id: string;
    status: string;
    createdAt: string;
    files: readonly string[];
  }[];
  deletionRequest?: { id: string; status: string; gracePeriodEndsAt: string };
};

export type ApiNotification = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  readAt?: string;
  createdAt: string;
};

export function getOnboarding(): Promise<OnboardingState> {
  return request<OnboardingState>("/api/onboarding");
}

export function advanceOnboarding(
  stepId: string,
  status: "in_progress" | "complete" | "skipped" = "complete",
  metadata?: Record<string, unknown>
): Promise<OnboardingState> {
  return request<OnboardingState>("/api/onboarding/advance", {
    method: "POST",
    body: JSON.stringify({ stepId, status, metadata }),
  });
}

export function resetOnboarding(asNewbie = true): Promise<OnboardingState> {
  return request<OnboardingState>("/api/onboarding/reset", {
    method: "POST",
    body: JSON.stringify({ asNewbie }),
  });
}

export function getConnection(): Promise<ConnectionState> {
  return request<ConnectionState>("/api/connections");
}

export function connectPayPal(): Promise<ConnectionState> {
  return request<ConnectionState>("/api/connections/connect", {
    method: "POST",
    body: "{}",
  });
}

export function getLifecycle(): Promise<LifecycleState> {
  return request<LifecycleState>("/api/lifecycle");
}

export function getNotifications(): Promise<{ data: ApiNotification[] }> {
  return request<{ data: ApiNotification[] }>("/api/notifications");
}

export function markNotificationRead(id: string): Promise<ApiNotification> {
  return request<ApiNotification>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    body: "{}",
  });
}

export function pauseAgent(): Promise<LifecycleState> {
  return request<LifecycleState>("/api/lifecycle/pause", {
    method: "POST",
    body: "{}",
  });
}

export function resumeAgent(): Promise<LifecycleState> {
  return request<LifecycleState>("/api/lifecycle/resume", {
    method: "POST",
    body: "{}",
  });
}

export function disconnectPayPal(): Promise<LifecycleState> {
  return request<LifecycleState>("/api/lifecycle/disconnect", {
    method: "POST",
    body: "{}",
  });
}

export function createExport(): Promise<LifecycleState> {
  return request<LifecycleState>("/api/lifecycle/export", {
    method: "POST",
    body: "{}",
  });
}

export function scheduleDeletion(): Promise<LifecycleState> {
  return request<LifecycleState>("/api/lifecycle/delete", {
    method: "POST",
    body: "{}",
  });
}
