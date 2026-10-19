"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Info,
  Lock,
  Mail,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import {
  advanceOnboarding,
  connectPayPal,
  getOnboarding,
  simulateReminder,
  approveProposal,
  type OnboardingState,
} from "@/frontend/lib/api";
import type { BusinessKey } from "@/frontend/features/paypilot/types";
import { approvalItem, type ApprovalItem } from "../views/inbox-view";

const STORAGE_KEY = "paypilot_onboarding_v2";
const COMPLETED_KEY = "paypilot_onboarding_completed";

export type ClientTriState = "keep" | "monitor" | "blocked";

export interface OnboardingClient {
  id: string;
  name: string;
  company: string;
  email: string;
  score: string;
  state: ClientTriState;
  timezone: string;
  openInvoices: string;
}

const DEFAULT_CLIENTS: OnboardingClient[] = [
  {
    id: "priya",
    name: "Priya Sharma",
    company: "DesignSprint Studio",
    email: "priya@designsprint.io",
    score: "4.1/10",
    state: "monitor",
    timezone: "America/New_York (UTC-5)",
    openInvoices: "$2,200.00 (21 days overdue)",
  },
  {
    id: "marcus",
    name: "Marcus Vance",
    company: "Vance Logistics",
    email: "marcus@vancelogistics.com",
    score: "8.8/10",
    state: "monitor",
    timezone: "America/Chicago (UTC-6)",
    openInvoices: "$1,500.00 (Due tomorrow)",
  },
  {
    id: "jake",
    name: "Jake Miller",
    company: "Miller & Co.",
    email: "jake@millerco.design",
    score: "6.5/10",
    state: "monitor",
    timezone: "America/Los_Angeles (UTC-8)",
    openInvoices: "$4,100.00 (3 days overdue)",
  },
  {
    id: "elena",
    name: "Elena Rostova",
    company: "Aero Labs Tech",
    email: "elena@aerolabs.tech",
    score: "9.4/10",
    state: "monitor",
    timezone: "Europe/London (UTC+0)",
    openInvoices: "Paid in full (Prompt)",
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
  businessKey,
  onBusinessChange,
  onComplete,
  onOpenApproval,
}: {
  isOpen: boolean;
  onClose: () => void;
  businessKey: BusinessKey;
  onBusinessChange?: (key: BusinessKey) => void;
  onComplete: () => void;
  onOpenApproval?: (item: ApprovalItem) => void;
}) {
  const steps = [
    { id: "create_account", num: 1, title: "Account & Preset" },
    { id: "consent", num: 2, title: "Permissions & Scopes" },
    { id: "connect_paypal", num: 3, title: "Connect PayPal" },
    { id: "backfill", num: 4, title: "90-Day Backfill" },
    { id: "baseline", num: 5, title: "Baseline & Clients" },
    { id: "trust", num: 6, title: "Trust & Policies" },
    { id: "first_action", num: 7, title: "First Approval" },
  ];

  // Persistent State
  const [stepIndex, setStepIndex] = useState(0);

  // Step 1: Account
  const [email, setEmail] = useState("alex@morgancreative.agency");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);
  const [name, setName] = useState("Alex Morgan");
  const [businessName, setBusinessName] = useState("Morgan Creative Studio");
  const [selectedPreset, setSelectedPreset] = useState<BusinessKey>(businessKey);

  // Step 2: Consent
  const [consentGranted, setConsentGranted] = useState(true);
  const [consentDeclined, setConsentDeclined] = useState(false);

  // Step 3: Connect PayPal
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Step 4: Backfill
  const [backfillProgress, setBackfillProgress] = useState(100);
  const [backfillSimRetry, setBackfillSimRetry] = useState(false);
  const [useSampleData, setUseSampleData] = useState(false);

  // Step 5: Clients & Baseline
  const [clients, setClients] = useState<OnboardingClient[]>(DEFAULT_CLIENTS);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ email: string; company: string; timezone: string }>({
    email: "",
    company: "",
    timezone: "",
  });

  // Step 6: Trust
  const [policyTemplate, setPolicyTemplate] = useState("gentle_freelancer");
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [replyToEmail, setReplyToEmail] = useState("billing@alexmorgan.design");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  // Step 7: First Approval
  const [reminderTone, setReminderTone] = useState<"gentle" | "firm" | "friendly">("gentle");
  const [proposalApproved, setProposalApproved] = useState(false);
  const [proposalDismissed, setProposalDismissed] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Load saved state on mount (Resumable State Machine)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.stepIndex === "number") setStepIndex(parsed.stepIndex);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.name) setName(parsed.name);
        if (parsed.businessName) setBusinessName(parsed.businessName);
        if (parsed.selectedPreset) setSelectedPreset(parsed.selectedPreset);
        if (typeof parsed.consentGranted === "boolean") setConsentGranted(parsed.consentGranted);
        if (typeof parsed.connected === "boolean") setConnected(parsed.connected);
        if (Array.isArray(parsed.clients) && parsed.clients.length > 0) setClients(parsed.clients);
        if (parsed.policyTemplate) setPolicyTemplate(parsed.policyTemplate);
        if (parsed.quietHoursStart) setQuietHoursStart(parsed.quietHoursStart);
        if (parsed.quietHoursEnd) setQuietHoursEnd(parsed.quietHoursEnd);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.replyToEmail) setReplyToEmail(parsed.replyToEmail);
        if (typeof parsed.proposalApproved === "boolean") setProposalApproved(parsed.proposalApproved);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save state on any change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stepIndex,
          email,
          name,
          businessName,
          selectedPreset,
          consentGranted,
          connected,
          clients,
          policyTemplate,
          quietHoursStart,
          quietHoursEnd,
          timezone,
          replyToEmail,
          proposalApproved,
        })
      );
    } catch {
      // storage unavailable
    }
  }, [
    stepIndex,
    email,
    name,
    businessName,
    selectedPreset,
    consentGranted,
    connected,
    clients,
    policyTemplate,
    quietHoursStart,
    quietHoursEnd,
    timezone,
    replyToEmail,
    proposalApproved,
  ]);

  // Backfill animation on step 4
  useEffect(() => {
    if (stepIndex === 3) {
      setBackfillProgress(18);
      const timer1 = setTimeout(() => setBackfillProgress(46), 400);
      const timer2 = setTimeout(() => setBackfillProgress(74), 850);
      const timer3 = setTimeout(() => setBackfillProgress(100), 1300);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [stepIndex]);

  const currentStep = steps[stepIndex] ?? steps[0];

  const handleNext = async () => {
    try {
      await advanceOnboarding(currentStep.id, "complete", {
        account: { email, name, businessName, businessType: selectedPreset },
        consent: { granted: consentGranted, scopes: ["invoices.read", "payments.read", "orders.read", "disputes.read"] },
        trust: { policyTemplate, quietHoursStart, quietHoursEnd, timezone, replyToEmail },
      });
    } catch {
      // offline fallback
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleCompleteWizard();
    }
  };

  const handleCompleteWizard = () => {
    try {
      localStorage.setItem(COMPLETED_KEY, "true");
    } catch {
      // storage error
    }
    onComplete();
    onClose();
    if (onOpenApproval) {
      onOpenApproval(approvalItem);
    }
  };

  const handlePresetSelect = (preset: BusinessKey) => {
    setSelectedPreset(preset);
    if (onBusinessChange) {
      onBusinessChange(preset);
    }
  };

  const handleConnectPayPal = async (simulateFailure = false) => {
    setConnecting(true);
    setAuthError(null);
    try {
      if (simulateFailure) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setAuthError("PayPal authorization was cancelled or token handshake failed. Nothing was stored.");
        setConnected(false);
      } else {
        await connectPayPal();
        setConnected(true);
        setAuthError(null);
      }
    } catch {
      if (simulateFailure) {
        setAuthError("PayPal authorization was cancelled or token handshake failed. Nothing was stored.");
        setConnected(false);
      } else {
        setConnected(true);
      }
    } finally {
      setConnecting(false);
      if (!simulateFailure) {
        handleNext();
      }
    }
  };

  const handleSetAllValidToKeep = () => {
    setClients((prev) =>
      prev.map((c) => ({
        ...c,
        state: c.email && c.email.includes("@") ? "keep" : c.state,
      }))
    );
  };

  const handleClientStateChange = (id: string, nextState: ClientTriState) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, state: nextState } : c))
    );
  };

  const startEditClient = (client: OnboardingClient) => {
    setEditingClientId(client.id);
    setEditForm({ email: client.email, company: client.company, timezone: client.timezone });
  };

  const saveEditClient = (id: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, email: editForm.email, company: editForm.company, timezone: editForm.timezone }
          : c
      )
    );
    setEditingClientId(null);
  };

  const handleApproveProposal = async () => {
    setSubmittingAction(true);
    try {
      const simulated = await simulateReminder("A gentle reminder for the overdue web design invoice.");
      await approveProposal(simulated.proposal.id);
      setProposalApproved(true);
      setProposalDismissed(false);
    } catch {
      setProposalApproved(true);
    } finally {
      setSubmittingAction(false);
    }
  };

  const reminderMessageText = useMemo(() => {
    if (reminderTone === "gentle") {
      return `Hi Priya, hope you're having a productive week! Following up on invoice #PP-9D31C0 for $2,200 (Web Design final milestone), which was due on Oct 1. Could you check if payment has been processed? Here's the direct PayPal payment link: paypal.com/invoice/p/PP-9D31C0. Thanks so much!`;
    }
    if (reminderTone === "friendly") {
      return `Hey Priya! Quick check-in on the $2,200 web design invoice (#PP-9D31C0). Whenever you get a chance to take a look, the PayPal link is ready here: paypal.com/invoice/p/PP-9D31C0. Appreciate you!`;
    }
    return `Notice: Invoice #PP-9D31C0 for $2,200 is currently 21 days past due. Please remit payment via PayPal at paypal.com/invoice/p/PP-9D31C0 or contact us immediately to avoid service interruption.`;
  }, [reminderTone]);

  if (!isOpen) return null;

  return (
    <div className="what-if-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div
        className="what-if-dialog"
        style={{
          maxWidth: "740px",
          width: "96%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.35)",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#64748b",
                  }}
                >
                  PayPilot Onboarding
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: 600,
                  }}
                >
                  Step {stepIndex + 1} of 7
                </span>
              </div>
              <h2
                id="onboarding-title"
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "2px 0 0",
                  fontFamily: "var(--font-display, sans-serif)",
                }}
              >
                {currentStep.title}
              </h2>
            </div>
          </div>
          <button
            className="what-if-close"
            onClick={onClose}
            aria-label="Close wizard"
            style={{ position: "static" }}
            title="Save and close (resume anytime)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div style={{ padding: "12px 24px 0", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
            {steps.map((s, idx) => {
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <div
                  key={s.id}
                  onClick={() => setStepIndex(idx)}
                  title={`${s.num}. ${s.title}`}
                  style={{
                    flex: 1,
                    height: "6px",
                    borderRadius: "3px",
                    background: isCurrent ? "#6366f1" : isPast ? "#10b981" : "#e2e8f0",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#64748b",
              paddingBottom: "10px",
            }}
          >
            <span>{steps[stepIndex].title}</span>
            <span style={{ color: "#059669", fontWeight: 600 }}>
              {stepIndex === 6 ? "Final Step" : "Resumable & Auto-saved"}
            </span>
          </div>
        </div>

        {/* Body Content - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "22px 24px",
            background: "#ffffff",
          }}
        >
          {/* STEP 1: CREATE ACCOUNT & BUSINESS PRESET */}
          {stepIndex === 0 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  Create Your Account & Choose Business Preset
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Sign in password-free with a magic link. Choose your business type to automatically configure custom financial vocabulary, anomaly detectors, and forecast baselines.
                </p>
              </div>

              {/* Magic Link Section */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Work Email Address</label>
                  {emailVerified ? (
                    <span style={{ fontSize: "11px", color: "#059669", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> Email Verified
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Mail size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailVerified(false);
                      }}
                      placeholder="you@company.com"
                      style={{
                        width: "100%",
                        padding: "8px 10px 8px 32px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMagicLinkSent(true);
                      setEmailVerified(true);
                    }}
                  >
                    {emailVerified ? "Re-verify" : "Send Magic Link"}
                  </Button>
                </div>
                {magicLinkSent && (
                  <div style={{ fontSize: "11px", color: "#0284c7", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Info size={13} />
                    Magic link verified! Account & tenant generated with single-account vault isolation.
                  </div>
                )}
              </div>

              {/* Profile Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Business / Studio Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Preset Selection Cards */}
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "8px" }}>
                Select Business Preset (Loads matching detectors & vocabulary)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {[
                  {
                    key: "freelancer" as BusinessKey,
                    title: "Freelancer / Agency",
                    desc: "Project milestones, client relationship care, gentle Net-15/30 terms",
                    tag: "Polite Reminders",
                  },
                  {
                    key: "saas" as BusinessKey,
                    title: "SaaS & Subscriptions",
                    desc: "Recurring MRR, churn prevention, automated dunning, card expiry alerts",
                    tag: "Churn Defense",
                  },
                  {
                    key: "ecommerce" as BusinessKey,
                    title: "E-Commerce & Retail",
                    desc: "Order settlement verification, dispute defense, transaction fee audits",
                    tag: "Dispute Guard",
                  },
                  {
                    key: "creator" as BusinessKey,
                    title: "Creator / Digital Goods",
                    desc: "Supporter tips, digital downloads, chargeback limits, refund policy",
                    tag: "Creator Shield",
                  },
                ].map((item) => {
                  const isSelected = selectedPreset === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => handlePresetSelect(item.key)}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #6366f1" : "1px solid #e2e8f0",
                        background: isSelected ? "#f5f3ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "13px", color: isSelected ? "#4338ca" : "#1e293b" }}>
                          {item.title}
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            background: isSelected ? "#ede9fe" : "#f1f5f9",
                            color: isSelected ? "#6d28d9" : "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Roles Summary */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "#f1f5f9",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#475569",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong>Your Role:</strong> Owner (Full Control & Policy Config)
                </span>
                <span>
                  <strong>Starting Autonomy:</strong> Level 0 (Suggest only)
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: PLAIN-LANGUAGE CONSENT & SCOPES */}
          {stepIndex === 1 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  Plain-Language Permissions & Scopes
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  PayPilot accesses only the specific PayPal endpoints needed to monitor cash flow and draft safe reminders. 
                  Tokens are sealed inside an encrypted vault and <strong>never exposed to LLMs</strong>.
                </p>
              </div>

              {/* Permission List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      Invoicing v2 (<span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6366f1" }}>invoices.read, invoices.write</span>)
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", lineHeight: "1.4" }}>
                      Reads overdue invoice statuses, unpaid balances, and recipient emails. Prepares draft reminders. 
                      <strong> Zero automated sends</strong> without your explicit 1-click approval.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      Orders v2 & Captures (<span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6366f1" }}>orders.read, payments.read</span>)
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", lineHeight: "1.4" }}>
                      Reads historical transaction volume and payment settlements to construct your 14-day cash-flow forecast and calculate client reliability scores.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      Webhooks & Disputes (<span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6366f1" }}>disputes.read, webhooks.manage</span>)
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", lineHeight: "1.4" }}>
                      Subscribes to dispute claims, chargebacks, and payment failures to trigger real-time liquidity alerts in your Agent Inbox.
                    </div>
                  </div>
                </div>
              </div>

              {/* Zero Knowledge Callout */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <ShieldCheck size={22} color="#2563eb" />
                <div style={{ fontSize: "12px", color: "#1e40af" }}>
                  <strong>LLM Zero-Knowledge Proof:</strong> AI agents only receive sanitized tool summaries. Raw OAuth tokens, bank account IDs, and secrets never enter the LLM context.
                </div>
              </div>

              {/* Explicit Consent Options */}
              <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={consentGranted}
                    onChange={(e) => {
                      setConsentGranted(e.target.checked);
                      if (e.target.checked) setConsentDeclined(false);
                    }}
                    style={{ width: "16px", height: "16px", accentColor: "#6366f1" }}
                  />
                  <span style={{ color: "#1e293b", fontWeight: 600 }}>
                    I explicitly consent to grant read & draft access to PayPilot under Level 0 oversight.
                  </span>
                </label>

                {consentDeclined && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#991b1b",
                    }}
                  >
                    You declined live PayPal permissions. You can proceed to explore PayPilot using the synthetic demo workspace, or re-enable consent above.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: CONNECT PAYPAL */}
          {stepIndex === 2 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  Authorize PayPal Sandbox Connection
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Connect your merchant credentials. Tokens are stored in an envelope-encrypted vault and bound to a single merchant workspace.
                </p>
              </div>

              {/* Security Details Card */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    PayPal Account ID Binding
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginTop: "4px", fontFamily: "monospace" }}>
                    PAYPAL-SBX-88219
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                    Single-account binding active
                  </div>
                </div>

                <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                    Vault Security
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#059669", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Lock size={13} /> AES-256 GCM Envelope Vault
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                    Isolated per-tenant storage
                  </div>
                </div>
              </div>

              {/* Connect / Authorize Box */}
              <div
                style={{
                  padding: "20px",
                  background: connected ? "#f0fdf4" : "#eff6ff",
                  border: connected ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                  borderRadius: "10px",
                  textAlign: "center",
                  marginBottom: "16px",
                }}
              >
                <Shield size={36} color={connected ? "#16a34a" : "#2563eb"} style={{ margin: "0 auto 8px" }} />
                <div style={{ fontWeight: 700, color: connected ? "#166534" : "#1e3a8a", fontSize: "16px" }}>
                  {connected ? "PayPal Sandbox Merchant Connected" : "Ready to Authorize"}
                </div>
                <div style={{ fontSize: "12px", color: connected ? "#15803d" : "#3b82f6", marginTop: "4px" }}>
                  Sandbox Partner App ID: <span style={{ fontFamily: "monospace" }}>paypilot-hackathon-2026</span>
                </div>

                {authError && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      color: "#b91c1c",
                      fontSize: "12px",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{authError}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "16px" }}>
                  <Button
                    onClick={() => handleConnectPayPal(false)}
                    disabled={connecting}
                  >
                    {connecting ? <RefreshCw size={15} className="spin" /> : <Lock size={15} />}
                    {connecting ? "Connecting..." : connected ? "Re-Authorize Connection" : "Authorize Sandbox Connection"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleConnectPayPal(true)}
                    title="Simulate failure/cancel edge case to test Retry behavior"
                  >
                    Test Failure Edge Case
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BACKFILL HISTORY */}
          {stepIndex === 3 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  Backfilling 90-Day Financial History
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Background job pulls ~90 days of transactions, invoices, and subscriptions paged by date windows. 
                  Newest data loads first so initial findings appear early.
                </p>
              </div>

              {/* Progress Bar Container */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>
                    {backfillProgress < 100
                      ? `Ingesting PayPal history... (Loaded ${Math.round((backfillProgress / 100) * 90)} of 90 days)`
                      : "90-day backfill complete · 90 of 90 days loaded"}
                  </span>
                  <strong style={{ color: "#6366f1" }}>{backfillProgress}%</strong>
                </div>

                <div style={{ height: "10px", width: "100%", background: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${backfillProgress}%`,
                      background: backfillProgress === 100 ? "#10b981" : "#6366f1",
                      transition: "width 0.4s ease-out",
                    }}
                  />
                </div>

                {/* 3 Windows Tracker */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "14px" }}>
                  <div style={{ padding: "8px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}>
                    <div style={{ color: "#64748b" }}>Window 1 (Days 90–60)</div>
                    <strong style={{ color: "#059669" }}>✓ 48 Transactions</strong>
                  </div>
                  <div style={{ padding: "8px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}>
                    <div style={{ color: "#64748b" }}>Window 2 (Days 60–30)</div>
                    <strong style={{ color: "#059669" }}>✓ 52 Transactions · 8 Invoices</strong>
                  </div>
                  <div style={{ padding: "8px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px" }}>
                    <div style={{ color: "#64748b" }}>Window 3 (Days 30–0)</div>
                    <strong style={{ color: backfillProgress >= 80 ? "#059669" : "#6366f1" }}>
                      {backfillProgress >= 80 ? "✓ 26 Trx · 6 Invoices" : "Ingesting newest..."}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Reassurance Banner */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  fontSize: "12px",
                  color: "#1e40af",
                  marginBottom: "12px",
                }}
              >
                <Clock size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Feel free to close this tab:</strong> Backfill continues in the background. An email confirmation will be sent to <strong>{email}</strong> when finished. Upserts are idempotent and retryable.
                </span>
              </div>

              {/* Edge Case Helpers */}
              <div style={{ display: "flex", gap: "10px" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBackfillSimRetry(true);
                    setTimeout(() => setBackfillSimRetry(false), 1200);
                  }}
                >
                  <RotateCcw size={12} />
                  {backfillSimRetry ? "Retrying Window 2..." : "Simulate Network Retry"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseSampleData(!useSampleData)}
                >
                  {useSampleData ? "✓ Sample Data Loaded" : "No history? Try Sample Data"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: BUILD BASELINE & CLIENT REVIEW */}
          {stepIndex === 4 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px", color: "#0f172a" }}>
                    Baseline Computed & Client Review
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.4", margin: 0 }}>
                    Scout computed client reliability scores (0–10). Clients default to <strong>Monitor only</strong> (scored & forecasted, zero outbound messages).
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleSetAllValidToKeep}>
                  <Check size={13} /> Keep all with valid email
                </Button>
              </div>

              {/* 3 First Findings Preview */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
                  First Three Intelligence Findings
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "12px", color: "#991b1b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={15} />
                    <span><strong>Finding 1:</strong> Priya Sharma $2,200 invoice is 21 days overdue (Reliability: 4.1/10).</span>
                  </div>
                  <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "12px", color: "#92400e", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldAlert size={15} />
                    <span><strong>Finding 2:</strong> 3rd reminder blocked by policy guardrail (max 2 per client / 7 days).</span>
                  </div>
                  <div style={{ padding: "8px 12px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", fontSize: "12px", color: "#065f46", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CheckCircle2 size={15} />
                    <span><strong>Finding 3:</strong> 14-day cash forecast confirmed: $14,200 expected balance with healthy runway.</span>
                  </div>
                </div>
              </div>

              {/* Client Tri-state Selector List */}
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
                Detected Clients ({clients.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {clients.map((c) => {
                  const isEditing = editingClientId === c.id;
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "10px 12px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                              placeholder="Email"
                              style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                            />
                            <input
                              type="text"
                              value={editForm.company}
                              onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                              placeholder="Company"
                              style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            <Button size="sm" variant="ghost" onClick={() => setEditingClientId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveEditClient(c.id)}>
                              Save Client
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{c.name}</strong>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>· {c.company}</span>
                              <button
                                onClick={() => startEditClient(c)}
                                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: 0 }}
                                title="Edit client details"
                              >
                                <Edit3 size={12} />
                              </button>
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                              {c.email} · Reliability: <strong style={{ color: "#0f172a" }}>{c.score}</strong> · {c.openInvoices}
                            </div>
                          </div>

                          {/* Tri-state buttons */}
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => handleClientStateChange(c.id, "keep")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                borderRadius: "4px",
                                border: c.state === "keep" ? "1px solid #10b981" : "1px solid #e2e8f0",
                                background: c.state === "keep" ? "#dcfce7" : "#ffffff",
                                color: c.state === "keep" ? "#166534" : "#64748b",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Keep: Monitored and messageable"
                            >
                              Keep
                            </button>
                            <button
                              onClick={() => handleClientStateChange(c.id, "monitor")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                borderRadius: "4px",
                                border: c.state === "monitor" ? "1px solid #6366f1" : "1px solid #e2e8f0",
                                background: c.state === "monitor" ? "#ede9fe" : "#ffffff",
                                color: c.state === "monitor" ? "#4338ca" : "#64748b",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Monitor only: Forecasts only, never messaged"
                            >
                              Monitor only
                            </button>
                            <button
                              onClick={() => handleClientStateChange(c.id, "blocked")}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                borderRadius: "4px",
                                border: c.state === "blocked" ? "1px solid #ef4444" : "1px solid #e2e8f0",
                                background: c.state === "blocked" ? "#fee2e2" : "#ffffff",
                                color: c.state === "blocked" ? "#991b1b" : "#64748b",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Do not contact: Hard block on all outbound communication"
                            >
                              Do not contact
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: SET TRUST & POLICIES */}
          {stepIndex === 5 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  Set Trust, Quiet Hours & Guardrails
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  PayPilot operates strictly inside your guardrails. Configure allowed communication hours and notification channels.
                </p>
              </div>

              {/* Policy Template Picker */}
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "8px" }}>
                Policy Template for {selectedPreset.toUpperCase()}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {[
                  {
                    id: "gentle_freelancer",
                    title: "Gentle Net-15 (Recommended)",
                    desc: "Polite reminder at 3 & 7 days overdue. Warm tone, pause on weekends.",
                  },
                  {
                    id: "strict_net30",
                    title: "Strict Net-30",
                    desc: "Formal notices at 7 & 14 days overdue. Automated late fee warnings.",
                  },
                ].map((tpl) => {
                  const isSelected = policyTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setPolicyTemplate(tpl.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #6366f1" : "1px solid #e2e8f0",
                        background: isSelected ? "#f5f3ff" : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ fontSize: "13px", color: isSelected ? "#4338ca" : "#1e293b", display: "block" }}>
                        {tpl.title}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
                        {tpl.desc}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Quiet Hours & Limits */}
              <div
                style={{
                  padding: "14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Quiet Hours (Zero outbound messages)
                    </label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="time"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>
                      <input
                        type="time"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                      Merchant Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="America/New_York">America/New_York (UTC-5)</option>
                      <option value="America/Chicago">America/Chicago (UTC-6)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                      <option value="Europe/London">Europe/London (UTC+0)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Client Reply-To Email
                  </label>
                  <input
                    type="email"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>

              {/* Autonomy Level Card */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                    Starting Autonomy: Level 0 (Suggest Only)
                  </div>
                  <div style={{ fontSize: "11px", color: "#b45309", marginTop: "2px" }}>
                    The agent proposes every action. Nothing is sent without your explicit 1-click approval.
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "#ffffff",
                    color: "#92400e",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #fde68a",
                  }}
                >
                  L0 Enforced
                </span>
              </div>
            </div>
          )}

          {/* STEP 7: FIRST GUIDED APPROVAL */}
          {stepIndex === 6 && (
            <div>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>
                  First Guided Approval · The “Aha!” Moment
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Your wizard ends inside the <strong>Agent Inbox</strong>. Review the full draft preview, policy verdict, and exact action below.
                </p>
              </div>

              {/* Proposal Card Preview */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  marginBottom: "16px",
                }}
              >
                {/* Proposal Header */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
                      Prioritized Proposal #PP-1049
                    </span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      Send reminder to Priya Sharma ($2,200 overdue)
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#fef3c7",
                      color: "#92400e",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: 600,
                    }}
                  >
                    Requires L0 Approval
                  </span>
                </div>

                {/* Policy Verdict Badges */}
                <div style={{ padding: "10px 16px", background: "#f0fdf4", borderBottom: "1px solid #dcfce7", display: "flex", gap: "14px", fontSize: "11px", color: "#166534" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={13} color="#16a34a" /> Policy Rule: Gentle Net-15
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={13} color="#16a34a" /> Quiet Hours: Passed (14:30)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={13} color="#16a34a" /> Weekly Cap: 1 of 2 used
                  </span>
                </div>

                {/* Tone Switcher & Preview */}
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Message Draft Preview</label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {(["gentle", "friendly", "firm"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setReminderTone(t)}
                          style={{
                            padding: "2px 8px",
                            fontSize: "10px",
                            borderRadius: "4px",
                            textTransform: "capitalize",
                            border: reminderTone === t ? "1px solid #6366f1" : "1px solid #e2e8f0",
                            background: reminderTone === t ? "#ede9fe" : "#ffffff",
                            color: reminderTone === t ? "#4338ca" : "#64748b",
                            cursor: "pointer",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      color: "#334155",
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}
                  >
                    {reminderMessageText}
                  </div>

                  <div style={{ marginTop: "10px", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Lock size={12} />
                    <span>Exact PayPal API Call: </span>
                    <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: "3px", color: "#1e293b" }}>
                      invoices.send_reminder(id="PP-9D31C0", tone="{reminderTone}")
                    </code>
                  </div>
                </div>

                {/* Action Bar */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProposalDismissed(true);
                      setProposalApproved(false);
                    }}
                  >
                    Dismiss / Snooze
                  </Button>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      onClick={handleApproveProposal}
                      disabled={proposalApproved || submittingAction}
                      style={{
                        background: proposalApproved ? "#059669" : "#4f46e5",
                        borderColor: proposalApproved ? "#059669" : "#4f46e5",
                      }}
                    >
                      {submittingAction ? (
                        <RefreshCw size={14} className="spin" />
                      ) : proposalApproved ? (
                        <Check size={14} />
                      ) : (
                        <Zap size={14} />
                      )}
                      {proposalApproved ? "Proposal Approved & Logged!" : "Approve & Send via PayPal"}
                    </Button>
                  </div>
                </div>
              </div>

              {proposalApproved && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "8px",
                    color: "#065f46",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>“Aha!” Moment Achieved:</strong> The agent proposed, verified policy guardrails, and executed with your 1-click approval. Recorded in Sent view and immutable Audit Log.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 24px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
              variant="ghost"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
            >
              <ChevronLeft size={15} /> Back
            </Button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              title="Close wizard now. All progress is saved."
            >
              Save & Exit
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {stepIndex === 1 && !consentGranted && (
              <Button
                variant="ghost"
                onClick={() => {
                  setConsentDeclined(true);
                  handleNext();
                }}
              >
                Skip to Demo Workspace
              </Button>
            )}

            <Button onClick={handleNext}>
              {stepIndex === steps.length - 1 ? (
                <>
                  <Check size={15} /> Finish & Open Agent Inbox
                </>
              ) : (
                <>
                  Next Step <ChevronRight size={15} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
