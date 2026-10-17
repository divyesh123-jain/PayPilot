export type BusinessKey = "freelancer" | "ecommerce" | "saas" | "agency" | "service" | "creator";

export type ViewKey =
  "inbox" | "transactions" | "ask" | "forecast" | "risk" | "policies" | "workflows" | "audit";

export type TransactionStatus = "Completed" | "Pending" | "Refunded" | "Failed";

export type BusinessProfile = {
  name: string;
  type: string;
  initials: string;
  accent: string;
  descriptor: string;
  metric: {
    label: string;
    value: string;
    change: string;
    trend: "up" | "down";
    hint: string;
  };
  collected: string;
  outstanding: string;
  alert: {
    tone: "red" | "amber" | "blue";
    eyebrow: string;
    title: string;
    detail: string;
    action: string;
  };
  forecast: {
    days: number[];
    labels: string[];
    low: number[];
    high: number[];
    narrative: string;
    confidence: string;
  };
  priorities: {
    name: string;
    description: string;
    amount: string;
    status: "urgent" | "watch" | "good";
    initials: string;
  }[];
  transactions: {
    date: string;
    name: string;
    type: string;
    amount: string;
    status: TransactionStatus;
    reference: string;
  }[];
};

export type WhatIfScenario = {
  title: string;
  subject: string;
  outstanding: number;
  discount: number;
  fastPaymentProbability: number;
  waitDays: number;
  waitProbability: number;
  waitOutcome: number;
  recommendation: string;
};
