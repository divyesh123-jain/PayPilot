import type { BusinessKey, BusinessProfile, ViewKey, WhatIfScenario } from "./types";

/**
 * Product configuration only.
 *
 * This file intentionally contains no customer, payment, forecast, or approval
 * records. Those values belong to the connected merchant account and are loaded
 * from the API after onboarding.
 */
const businessTypes: Record<BusinessKey, { label: string; type: string; accent: string }> = {
  freelancer: { label: "Freelancer", type: "Freelancer", accent: "#7c6df2" },
  ecommerce: { label: "E-commerce", type: "E-commerce", accent: "#e58a63" },
  saas: { label: "SaaS & subscriptions", type: "SaaS & subscriptions", accent: "#36a995" },
  agency: { label: "Agency", type: "Agency", accent: "#6172e8" },
  service: { label: "Service business", type: "Service business", accent: "#d6a23e" },
  creator: { label: "Creator & educator", type: "Creator & educator", accent: "#c26ab4" },
};

function emptyProfile(key: BusinessKey): BusinessProfile {
  const type = businessTypes[key];
  return {
    name: "Your workspace",
    type: type.type,
    initials: "YW",
    accent: type.accent,
    descriptor: "Connect PayPal to import your real payment activity",
    metric: {
      label: "Expected this month",
      value: "—",
      change: "—",
      trend: "up",
      hint: "Connect an account to calculate",
    },
    collected: "—",
    outstanding: "—",
    alert: {
      tone: "blue",
      eyebrow: "Workspace setup",
      title: "Connect PayPal to see your first signal",
      detail:
        "PayPilot will only show forecasts, clients, and proposals after it imports data from your connected merchant account.",
      action: "Resume onboarding",
    },
    forecast: {
      days: [],
      labels: [],
      low: [],
      high: [],
      narrative: "Your forecast will appear after PayPilot receives enough payment history.",
      confidence: "Awaiting account data",
    },
    priorities: [],
    transactions: [],
  };
}

export const businessProfiles: Record<BusinessKey, BusinessProfile> = {
  freelancer: emptyProfile("freelancer"),
  ecommerce: emptyProfile("ecommerce"),
  saas: emptyProfile("saas"),
  agency: emptyProfile("agency"),
  service: emptyProfile("service"),
  creator: emptyProfile("creator"),
};

export const businessOptions: { key: BusinessKey; label: string }[] = Object.entries(
  businessTypes
).map(([key, value]) => ({ key: key as BusinessKey, label: value.label }));

export const navItems: { key: ViewKey; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "clients", label: "Clients" },
  { key: "transactions", label: "Transactions" },
  { key: "ask", label: "Ask PayPilot" },
  { key: "forecast", label: "Forecast" },
  { key: "risk", label: "Risk" },
  { key: "policies", label: "Policies" },
  { key: "workflows", label: "Workflows" },
  { key: "sent", label: "Sent" },
  { key: "audit", label: "Audit log" },
];

/** Scenarios are only available once connected data supplies an amount and history. */
export const whatIfScenarios: Partial<Record<BusinessKey, WhatIfScenario>> = {};

export function getWhatIfScenario(businessKey: BusinessKey): WhatIfScenario | undefined {
  return whatIfScenarios[businessKey];
}
