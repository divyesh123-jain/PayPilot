export type ApiSession = {
  paymentMode: "live" | "mock" | "replay";
  scenarioId: string;
  business: { id: string; name: string; type: string; currency: string };
};

export type ApiProposal = {
  id: string;
  status: string;
  policyDecision: { allowed: boolean; requiresApproval: boolean; reason: string };
};

const configuredApiUrl = process.env.NEXT_PUBLIC_PAYPILOT_API_URL;
const API_BASE_URL = configuredApiUrl
  ? (/^https?:\/\//.test(configuredApiUrl) ? configuredApiUrl : `https://${configuredApiUrl}`)
  : "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`PayPilot API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function getApiSession(): Promise<ApiSession> {
  return request<ApiSession>("/api/session");
}

export function simulateReminder(rationale: string): Promise<{ proposal: ApiProposal }> {
  return request<{ proposal: ApiProposal }>("/api/simulate", {
    method: "POST",
    body: JSON.stringify({ action: "send_reminder", rationale }),
  });
}

export function approveProposal(id: string): Promise<ApiProposal> {
  return request<ApiProposal>(`/api/proposals/${encodeURIComponent(id)}/approve`, { method: "POST", body: "{}" });
}
