"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { advanceOnboarding, connectPayPal } from "@/frontend/lib/api";
import type { BusinessKey } from "@/frontend/features/paypilot/types";

const STORAGE_KEY = "paypilot_onboarding_v3";
const COMPLETED_KEY = "paypilot_onboarding_completed";

export function OnboardingModal({
  isOpen,
  onClose,
  businessKey,
  initialPreset,
  initialEmail,
  initialName,
  onBusinessChange,
  onComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  businessKey: BusinessKey;
  initialPreset?: BusinessKey;
  initialEmail?: string;
  initialName?: string;
  onBusinessChange?: (key: BusinessKey) => void;
  onComplete: (user?: {
    name: string;
    email: string;
    businessName: string;
    businessKey: BusinessKey;
  }) => void;
}) {
  const steps = [
    { id: "create_account", num: 1, title: "Workspace details" },
    { id: "consent", num: 2, title: "Permissions" },
    { id: "connect_paypal", num: 3, title: "Connect PayPal" },
    { id: "backfill", num: 4, title: "History sync" },
    { id: "baseline", num: 5, title: "Review imported data" },
    { id: "trust", num: 6, title: "Safety settings" },
    { id: "first_action", num: 7, title: "Finish setup" },
  ];

  // Persistent State
  const [stepIndex, setStepIndex] = useState(0);

  // Step 1: Account
  const [email, setEmail] = useState(initialEmail ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [businessName, setBusinessName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<BusinessKey>(initialPreset || businessKey);

  // Step 2: Consent
  const [consentGranted, setConsentGranted] = useState(false);

  // Step 3: Connect PayPal
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Step 4: Backfill
  const backfillProgress = 0;

  // Step 5: Clients & Baseline

  // Step 6: Trust
  const [policyTemplate, setPolicyTemplate] = useState("gentle_freelancer");
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  const [validationMessage, setValidationMessage] = useState<string | null>(null);

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
        if (parsed.policyTemplate) setPolicyTemplate(parsed.policyTemplate);
        if (parsed.quietHoursStart) setQuietHoursStart(parsed.quietHoursStart);
        if (parsed.quietHoursEnd) setQuietHoursEnd(parsed.quietHoursEnd);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.replyToEmail) setReplyToEmail(parsed.replyToEmail);
        if (typeof parsed.notifyEmail === "boolean") setNotifyEmail(parsed.notifyEmail);
        if (typeof parsed.notifyInApp === "boolean") setNotifyInApp(parsed.notifyInApp);
        if (typeof parsed.dailyDigest === "boolean") setDailyDigest(parsed.dailyDigest);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Keep the business type selected from the landing page without inventing profile data.
  useEffect(() => {
    if (initialPreset && isOpen) {
      setSelectedPreset(initialPreset);
    }
  }, [initialPreset, isOpen]);

  // Save state on any change
  const onboardingSnapshot = JSON.stringify({
    stepIndex,
    email,
    name,
    businessName,
    selectedPreset,
    consentGranted,
    connected,
    policyTemplate,
    quietHoursStart,
    quietHoursEnd,
    timezone,
    replyToEmail,
    notifyEmail,
    notifyInApp,
    dailyDigest,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, onboardingSnapshot);
    } catch {
      // storage unavailable
    }
  }, [onboardingSnapshot]);

  const currentStep = steps[stepIndex] ?? steps[0];

  const handleNext = async () => {
    setValidationMessage(null);
    if (stepIndex === 0) {
      if (!name.trim() || !businessName.trim()) {
        setValidationMessage("Enter your name and business name to continue.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setValidationMessage("Enter a valid work email address to continue.");
        return;
      }
    }
    if (stepIndex === 1 && !consentGranted) {
      setValidationMessage("Review the permissions and confirm consent before continuing.");
      return;
    }
    if (stepIndex === 2 && !connected) {
      setValidationMessage(
        "Connect PayPal before continuing. No connection has been established yet."
      );
      return;
    }
    if (stepIndex === 5 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail.trim())) {
      setValidationMessage("Enter a valid reply-to email address for client communication.");
      return;
    }

    try {
      await advanceOnboarding(currentStep.id, "complete", {
        account: { email, name, businessName, businessType: selectedPreset },
        consent: {
          granted: consentGranted,
          scopes: ["invoices.read", "payments.read", "orders.read", "disputes.read"],
        },
        trust: { policyTemplate, quietHoursStart, quietHoursEnd, timezone, replyToEmail },
        notifications: { email: notifyEmail, inApp: notifyInApp, dailyDigest },
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
      localStorage.setItem(
        "paypilot_user_session",
        JSON.stringify({
          name,
          email,
          businessName,
          businessKey: selectedPreset,
          isAuthenticated: true,
        })
      );
    } catch {
      // storage error
    }
    onComplete({
      name,
      email,
      businessName,
      businessKey: selectedPreset,
    });
    onClose();
  };

  const handlePresetSelect = (preset: BusinessKey) => {
    setSelectedPreset(preset);
    if (onBusinessChange) {
      onBusinessChange(preset);
    }
  };

  const handleConnectPayPal = async () => {
    setConnecting(true);
    setAuthError(null);
    try {
      const connection = await connectPayPal();
      if (connection.status !== "active") {
        setConnected(false);
        setAuthError("PayPal did not confirm an active connection. No credentials were stored.");
      } else {
        setConnected(true);
        setAuthError(null);
        setValidationMessage(null);
        try {
          await advanceOnboarding("connect_paypal", "complete");
        } catch {
          // The connection is still usable if onboarding progress cannot be saved.
        }
        setStepIndex((index) => Math.min(index + 1, steps.length - 1));
      }
    } catch {
      setConnected(false);
      setAuthError("We couldn't connect PayPal. Check the authorization window and try again.");
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="what-if-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
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
        <div
          style={{
            padding: "12px 24px 0",
            background: "#f8fafc",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
            {steps.map((s, idx) => {
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => idx <= stepIndex && setStepIndex(idx)}
                  disabled={idx > stepIndex}
                  aria-label={`${s.num}. ${s.title}${isCurrent ? ", current step" : isPast ? ", complete" : ", upcoming"}`}
                  aria-current={isCurrent ? "step" : undefined}
                  title={`${s.num}. ${s.title}`}
                  style={{
                    flex: 1,
                    height: "6px",
                    borderRadius: "3px",
                    background: isCurrent ? "#6366f1" : isPast ? "#10b981" : "#e2e8f0",
                    transition: "all 0.2s ease",
                    cursor: idx <= stepIndex ? "pointer" : "default",
                    border: 0,
                    padding: 0,
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
          {validationMessage && (
            <div
              role="alert"
              style={{
                margin: "12px 24px 0",
                padding: "10px 12px",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: "12px",
              }}
            >
              {validationMessage}
            </div>
          )}
          {/* STEP 1: CREATE ACCOUNT & BUSINESS PRESET */}
          {stepIndex === 0 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}
                >
                  Set up your PayPilot workspace
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Tell us where to send account notifications and choose the operating model that
                  best matches your business. You can change these settings later.
                </p>
              </div>

              {/* Account details */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  marginBottom: "16px",
                }}
              >
                <label
                  htmlFor="onboarding-email"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Work email address{" "}
                  <span aria-hidden="true" style={{ color: "#dc2626" }}>
                    *
                  </span>
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={15}
                    style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }}
                  />
                  <input
                    id="onboarding-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    aria-describedby="onboarding-email-help"
                    style={{
                      width: "100%",
                      padding: "8px 10px 8px 32px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div
                  id="onboarding-email-help"
                  style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}
                >
                  We’ll use this address for setup updates. PayPilot does not mark it verified until
                  your email provider confirms it.
                </div>
              </div>

              {/* Profile Details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    htmlFor="onboarding-name"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Your name{" "}
                    <span aria-hidden="true" style={{ color: "#dc2626" }}>
                      *
                    </span>
                  </label>
                  <input
                    id="onboarding-name"
                    type="text"
                    required
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
                  <label
                    htmlFor="onboarding-business"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Business name{" "}
                    <span aria-hidden="true" style={{ color: "#dc2626" }}>
                      *
                    </span>
                  </label>
                  <input
                    id="onboarding-business"
                    type="text"
                    required
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
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Select Business Preset (Loads matching detectors & vocabulary)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                {[
                  {
                    key: "freelancer" as BusinessKey,
                    title: "Freelancer & Creative Studio",
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
                  {
                    key: "agency" as BusinessKey,
                    title: "Agencies & Consultancies",
                    desc: "Milestone billing, purchase orders, renewals, and executive escalation paths",
                    tag: "Structured Billing",
                  },
                  {
                    key: "service" as BusinessKey,
                    title: "Home & Field Services",
                    desc: "Service-call payments, mobile pay links, and same-day settlement follow-up",
                    tag: "Fast Collection",
                  },
                ].map((item) => {
                  const isSelected = selectedPreset === item.key;
                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => handlePresetSelect(item.key)}
                      aria-pressed={isSelected}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #6366f1" : "1px solid #e2e8f0",
                        background: isSelected ? "#f5f3ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <strong
                          style={{ fontSize: "13px", color: isSelected ? "#4338ca" : "#1e293b" }}
                        >
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
                      <p
                        style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}
                      >
                        {item.desc}
                      </p>
                    </button>
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
                <h3
                  style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}
                >
                  Review permissions before connecting
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  PayPilot requests the access it needs to read payment activity, prepare drafts,
                  and surface account risks. Nothing is sent to your customers without your
                  approval.
                </p>
              </div>

              {/* Permission List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
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
                  <CheckCircle2
                    size={20}
                    color="#10b981"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      Invoicing v2 (
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6366f1" }}>
                        invoices.read, invoices.write
                      </span>
                      )
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "3px",
                        lineHeight: "1.4",
                      }}
                    >
                      Reads overdue invoice statuses, unpaid balances, and recipient emails.
                      Prepares draft reminders.
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
                  <CheckCircle2
                    size={20}
                    color="#10b981"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      Orders v2 & Captures (
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6366f1" }}>
                        orders.read, payments.read
                      </span>
                      )
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "3px",
                        lineHeight: "1.4",
                      }}
                    >
                      Reads historical transaction volume and payment settlements to construct your
                      14-day cash-flow forecast and calculate client reliability scores.
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
                  <CheckCircle2
                    size={20}
                    color="#10b981"
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                      Webhooks & Disputes (
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6366f1" }}>
                        disputes.read, webhooks.manage
                      </span>
                      )
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "3px",
                        lineHeight: "1.4",
                      }}
                    >
                      Subscribes to dispute claims, chargebacks, and payment failures to trigger
                      real-time liquidity alerts in your Agent Inbox.
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
                  <strong>What happens next:</strong> PayPilot stores the connection securely and
                  keeps outbound actions behind your approval.
                </div>
              </div>

              {/* Explicit Consent Options */}
              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consentGranted}
                    aria-describedby="permission-consent-copy"
                    onChange={(e) => setConsentGranted(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#6366f1" }}
                  />
                  <span id="permission-consent-copy" style={{ color: "#1e293b", fontWeight: 600 }}>
                    I explicitly consent to grant read & draft access to PayPilot under Level 0
                    oversight.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: CONNECT PAYPAL */}
          {stepIndex === 2 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}
                >
                  Connect your PayPal account
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Use PayPal’s authorization flow to connect the merchant account you want to
                  monitor. PayPilot will show the result here; it will not assume a connection
                  before PayPal confirms it.
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
                <div
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Connection status
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#0f172a",
                      marginTop: "4px",
                      fontFamily: "monospace",
                    }}
                  >
                    {connected ? "Connected" : "Not connected"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                    {connected
                      ? "PayPal confirmed this connection"
                      : "Authorize PayPal to continue"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Vault Security
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#059669",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Lock size={13} /> Secure credential storage
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                    Credentials remain outside the assistant context
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
                <Shield
                  size={36}
                  color={connected ? "#16a34a" : "#2563eb"}
                  style={{ margin: "0 auto 8px" }}
                />
                <div
                  style={{
                    fontWeight: 700,
                    color: connected ? "#166534" : "#1e3a8a",
                    fontSize: "16px",
                  }}
                >
                  {connected ? "PayPal connection active" : "PayPal connection not established"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: connected ? "#15803d" : "#3b82f6",
                    marginTop: "4px",
                  }}
                >
                  {connected
                    ? "PayPilot can now request the data needed for setup."
                    : "No PayPal data has been imported yet."}
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

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "10px",
                    marginTop: "16px",
                  }}
                >
                  <Button onClick={handleConnectPayPal} disabled={connecting}>
                    {connecting ? <RefreshCw size={15} className="spin" /> : <Lock size={15} />}
                    {connecting
                      ? "Connecting..."
                      : connected
                        ? "Reconnect PayPal"
                        : "Connect PayPal"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BACKFILL HISTORY */}
          {stepIndex === 3 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}
                >
                  Preparing your history sync
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  After PayPal confirms the connection, PayPilot will import available transaction
                  and invoice history. This workspace has not received any history yet.
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>
                    Waiting for history sync to begin
                  </span>
                  <strong style={{ color: "#64748b" }}>Not started</strong>
                </div>

                <div
                  style={{
                    height: "10px",
                    width: "100%",
                    background: "#e2e8f0",
                    borderRadius: "5px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${backfillProgress}%`,
                      background: "#cbd5e1",
                      transition: "width 0.4s ease-out",
                    }}
                  />
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
                  <strong>Nothing is being imported yet:</strong> this status will update after
                  PayPal confirms an active connection. You can continue setup and review the
                  workspace once data arrives.
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: BUILD BASELINE & CLIENT REVIEW */}
          {stepIndex === 4 && (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      margin: "0 0 4px",
                      color: "#0f172a",
                    }}
                  >
                    Review imported data
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.4", margin: 0 }}>
                    Once history is available, PayPilot will show detected clients, payment
                    patterns, and findings here for your review. No client records have been
                    imported yet.
                  </p>
                </div>
              </div>

              <div
                role="status"
                style={{
                  padding: "22px 16px",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  color: "#64748b",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                <Info size={20} style={{ margin: "0 auto 8px", color: "#94a3b8" }} />
                Your imported clients and first findings will appear here after the PayPal history
                sync completes.
              </div>
            </div>
          )}

          {/* STEP 6: SET TRUST & POLICIES */}
          {stepIndex === 5 && (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h3
                  style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}
                >
                  Set Trust, Quiet Hours & Guardrails
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  PayPilot operates strictly inside your guardrails. Configure allowed communication
                  hours and notification channels.
                </p>
              </div>

              {/* Policy Template Picker */}
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Recommended policy for your workspace
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                {[
                  {
                    id: "gentle_freelancer",
                    title: "Relationship-first follow-ups",
                    desc: "Polite reminders at 3 and 7 days overdue, with a warm tone and weekend pause.",
                  },
                  {
                    id: "strict_net30",
                    title: "Structured payment follow-ups",
                    desc: "Formal notices at 7 and 14 days overdue, with clear escalation language.",
                  },
                ].map((tpl) => {
                  const isSelected = policyTemplate === tpl.id;
                  return (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => setPolicyTemplate(tpl.id)}
                      aria-pressed={isSelected}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #6366f1" : "1px solid #e2e8f0",
                        background: isSelected ? "#f5f3ff" : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "13px",
                          color: isSelected ? "#4338ca" : "#1e293b",
                          display: "block",
                        }}
                      >
                        {tpl.title}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "3px",
                          display: "block",
                        }}
                      >
                        {tpl.desc}
                      </span>
                    </button>
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Quiet Hours (Zero outbound messages)
                    </label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="time"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        style={{
                          padding: "6px 8px",
                          fontSize: "12px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>to</span>
                      <input
                        type="time"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        style={{
                          padding: "6px 8px",
                          fontSize: "12px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#334155",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Merchant Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                      }}
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
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Client reply-to email{" "}
                    <span aria-hidden="true" style={{ color: "#dc2626" }}>
                      *
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    aria-describedby="reply-to-help"
                    value={replyToEmail}
                    onChange={(e) => setReplyToEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      fontSize: "12px",
                      borderRadius: "4px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <div
                    id="reply-to-help"
                    style={{ fontSize: "11px", color: "#64748b", marginTop: "5px" }}
                  >
                    Replies from client-facing drafts will use this address.
                  </div>
                </div>

                <div
                  role="group"
                  aria-labelledby="notification-preferences-title"
                  style={{
                    marginTop: "14px",
                    paddingTop: "14px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    id="notification-preferences-title"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "8px",
                    }}
                  >
                    Notification preferences
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px 18px",
                      fontSize: "12px",
                      color: "#475569",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(event) => setNotifyEmail(event.target.checked)}
                      />
                      Email alerts
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <input
                        type="checkbox"
                        checked={notifyInApp}
                        onChange={(event) => setNotifyInApp(event.target.checked)}
                      />
                      In-app alerts
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <input
                        type="checkbox"
                        checked={dailyDigest}
                        onChange={(event) => setDailyDigest(event.target.checked)}
                      />
                      Daily summary
                    </label>
                  </div>
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
                    The agent proposes every action. Nothing is sent without your explicit 1-click
                    approval.
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
                <h3
                  style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}
                >
                  Review setup and finish
                </h3>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5" }}>
                  Your workspace is configured with your chosen permissions and safety settings.
                  Live client data and proposals will appear after PayPal history is available.
                </p>
              </div>

              <div
                role="status"
                style={{
                  padding: "20px 16px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#475569",
                  fontSize: "12px",
                  lineHeight: "1.5",
                }}
              >
                <strong style={{ display: "block", color: "#0f172a", marginBottom: "5px" }}>
                  Your workspace is ready for review.
                </strong>
                PayPilot will create proposals from your connected account after history is
                available. You’ll review each draft and its policy checks before anything is sent.
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "8px",
                    marginTop: "16px",
                  }}
                >
                  {[
                    ["Workspace", businessName.trim() || "Name provided"],
                    ["PayPal", connected ? "Connection active" : "Connection pending"],
                    ["Safety", "Approval required"],
                    ["History", "Sync pending"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        padding: "9px 10px",
                        borderRadius: "6px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ marginTop: "3px", fontWeight: 600, color: "#0f172a" }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
            <Button onClick={handleNext}>
              {stepIndex === steps.length - 1 ? (
                <>
                  <Check size={15} /> Finish setup
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
