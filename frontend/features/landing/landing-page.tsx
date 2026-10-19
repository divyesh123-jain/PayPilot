"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MessageCircle,
  Play,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { BusinessKey } from "@/frontend/features/paypilot/types";
import { businessProfiles } from "@/frontend/features/paypilot/data";

interface LandingPageProps {
  onOpenSignIn: () => void;
  onOpenSignUp: (preset?: BusinessKey) => void;
  onEnterDashboard: () => void;
  isAuthenticated?: boolean;
  currentUser?: { name: string; businessName: string };
}

const personaHighlights: Record<
  BusinessKey,
  {
    title: string;
    subtitle: string;
    tone: string;
    avgOverdue: string;
    recoveryRate: string;
    recommendedPolicy: string;
    sampleDraft: string;
    quote: string;
  }
> = {
  freelancer: {
    title: "Freelancers & Creative Studios",
    subtitle: "Protect client goodwill with gentle, relationship-preserving reminder cadences.",
    tone: "Gentle & Collaborative",
    avgOverdue: "$2,200.00",
    recoveryRate: "92% within 7 days",
    recommendedPolicy: "Gentle Freelancer (3-day grace, 22:00 quiet hours)",
    sampleDraft:
      "Hi Priya, hope your week is off to a great start! Following up on invoice #PP-9D31C0 for $2,200. Here is the PayPal link whenever you're ready.",
    quote: "“I haven't had an awkward client money conversation in 6 months.” — Alex M., Product Designer",
  },
  saas: {
    title: "SaaS & Subscription Founders",
    subtitle: "Dunning grace periods, payment retry schedules, and churn-resistant credit offers.",
    tone: "Helpful & Proactive",
    avgOverdue: "$588.00 / mo",
    recoveryRate: "78% involuntarily churn recovered",
    recommendedPolicy: "SaaS Subscription Grace (12% win-back incentive cap)",
    sampleDraft:
      "Your subscription renewal couldn't settle on PayPal. Click below to refresh your billing method or claim a 10% loyalty credit.",
    quote: "“Saved us $4,200 MRR from silent subscription card expiration.” — Liam C., SaaS Founder",
  },
  ecommerce: {
    title: "High-Volume E-Commerce Brands",
    subtitle: "Settlement hold protection, dispute early-warning, and supplier inventory buffers.",
    tone: "Direct & Structured",
    avgOverdue: "$4,200.00 buffer",
    recoveryRate: "99.4% dispute defense rate",
    recommendedPolicy: "E-Commerce Velocity Shield (Max 2 reminders per buyer)",
    sampleDraft:
      "Order settlement confirmed on PayPal. Tracking number generated. Please verify receipt to release pending clearance.",
    quote: "“Keeps our PayPal reserves crystal clear during holiday volume spikes.” — Nora B., Store Owner",
  },
  agency: {
    title: "Agencies & Consultancies",
    subtitle: "Multi-milestone client billing, enterprise PO reminders, and contract renewals.",
    tone: "Executive & Formal",
    avgOverdue: "$15,000.00",
    recoveryRate: "88% paid on Net-15",
    recommendedPolicy: "Agency Net-30 Guardrail (Executive escalation path)",
    sampleDraft:
      "Attn Accounts Payable: Milestone 2 deliverables have been approved. Remittance for invoice #PP-8402 is scheduled for this Friday.",
    quote: "“Our average days-sales-outstanding dropped from 44 days to 18 days.” — Maya P., Agency Managing Director",
  },
  service: {
    title: "Home & Field Services",
    subtitle: "Instant mobile SMS/email paylinks immediately upon completed service calls.",
    tone: "Friendly & Punctual",
    avgOverdue: "$1,850.00",
    recoveryRate: "89% settled same day",
    recommendedPolicy: "Same-Day Dispatch & Completion Paylink",
    sampleDraft:
      "Thanks for choosing Silva Home & HVAC today! Here is your quick PayPal invoice for today's diagnostic and repair.",
    quote: "“Technicians finish the job, and the customer has paid via PayPal before we leave the driveway.” — Carlos S., HVAC Specialist",
  },
  creator: {
    title: "Creators & Digital Educators",
    subtitle: "Fan-friendly community membership renewals and soft sponsorship invoicing.",
    tone: "Warm & Community-First",
    avgOverdue: "$776.00",
    recoveryRate: "84% patron retention",
    recommendedPolicy: "Creator Community Soft Touch",
    sampleDraft:
      "Hey creator friend! Your Discord VIP tier renewal is pending. Update your PayPal checkout here to keep access unlocked.",
    quote: "“Zero friction, zero robotic corporate tone. My community loves it.” — Zoe R., Digital Creator",
  },
};

export function LandingPage({
  onOpenSignIn,
  onOpenSignUp,
  onEnterDashboard,
  isAuthenticated,
  currentUser,
}: LandingPageProps) {
  const [activePersona, setActivePersona] = useState<BusinessKey>("freelancer");
  const [demoApproved, setDemoApproved] = useState(false);
  const [activeTab, setActiveTab] = useState<"detection" | "policy" | "forecast">("detection");

  const currentPersonaData = personaHighlights[activePersona];
  const currentProfile = businessProfiles[activePersona];

  return (
    <div className="landing-root min-h-screen bg-[#f8f9fc] text-[#1d2534] selection:bg-[#6368e2]/20">
      {/* Top Notification Announcement Bar */}
      <div className="bg-[#1e1b4b] text-[#c7d2fe] py-2 px-4 text-xs font-medium text-center border-b border-[#312e81] flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 bg-[#4338ca] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          New
        </span>
        <span>
          PayPilot 2.0 with Real-Time PayPal Sandbox Backfill & Multi-Agent Safeguards is now live!
        </span>
        <button
          onClick={() => onOpenSignUp("freelancer")}
          className="text-white font-semibold underline underline-offset-2 hover:text-indigo-200 ml-1 transition"
        >
          Try 7-Step Onboarding →
        </button>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-[#e5e7eb] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="brand-mark cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <span />
              <span />
              <span />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-extrabold tracking-tight text-[#1d2534]">
                paypilot
              </span>
              <span className="rounded-[5px] border border-[#d1d5db] bg-[#f3f4f6] px-1.5 py-0.5 text-[9px] font-bold text-[#6b7280]">
                BETA
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-[#4b5563]">
            <a href="#features" className="hover:text-[#6368e2] transition-colors">
              Platform
            </a>
            <a href="#personas" className="hover:text-[#6368e2] transition-colors">
              Personas
            </a>
            <a href="#how-it-works" className="hover:text-[#6368e2] transition-colors">
              How It Works
            </a>
            <a href="#guardrails" className="hover:text-[#6368e2] transition-colors">
              Safety Guardrails
            </a>
            <a href="#security" className="hover:text-[#6368e2] transition-colors">
              Security
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline-block text-xs text-gray-500">
                  Signed in as <strong>{currentUser?.name || "Alex"}</strong>
                </span>
                <Button onClick={onEnterDashboard} className="button-primary text-xs">
                  Open Dashboard →
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={onOpenSignIn}
                  className="text-xs font-semibold text-[#4b5563] hover:text-[#1d2534] px-3"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => onOpenSignUp("freelancer")}
                  className="button-primary text-xs font-bold shadow-md hover:shadow-indigo-500/20"
                >
                  Start Free Onboarding
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-200/40 via-purple-100/40 to-blue-100/30 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-xs mb-6"
            >
              <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              <span>Permission-First Autonomous Payment Intelligence for PayPal</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#111827] leading-[1.12]"
            >
              Recover overdue revenue without risking client trust.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-[#4b5563] leading-relaxed max-w-2xl mx-auto"
            >
              PayPilot connects to your PayPal merchant stream, anticipates shortfalls 14 days
              ahead, and drafts tone-calibrated invoice reminders under strict permission boundaries.
              Zero awkward conversations.
            </motion.p>

            {/* Call To Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <Button
                size="default"
                onClick={() => onOpenSignUp("freelancer")}
                className="w-full sm:w-auto button-primary h-12 px-6 text-sm font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.01] transition-all"
              >
                Start 7-Step Onboarding <ArrowRight size={16} />
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={onOpenSignIn}
                className="w-full sm:w-auto h-12 px-6 text-sm font-semibold border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                <Zap size={15} className="text-amber-500" /> Quick Sign-In / Demo
              </Button>
            </motion.div>

            {/* Trust Signal Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6b7280] font-medium"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" /> PayPal Verified OAuth
              </span>
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-indigo-500" /> AES-256 Scoped Encryption
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-indigo-500" /> Human-in-the-Loop Always
              </span>
            </motion.div>
          </div>

          {/* Interactive Hero Preview Cockpit */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 sm:mt-16 max-w-5xl mx-auto rounded-2xl border border-[#e2e8f0] bg-white p-3 sm:p-5 shadow-2xl shadow-indigo-950/10"
          >
            {/* Mock Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-gray-500 ml-2">
                  paypilot.sandbox.internal/cockpit
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-[#f3f4f6] p-1 rounded-lg text-xs font-medium text-gray-600">
                  <button
                    onClick={() => setActiveTab("detection")}
                    className={`px-3 py-1 rounded-md transition ${
                      activeTab === "detection"
                        ? "bg-white text-indigo-700 shadow-xs font-semibold"
                        : "hover:text-gray-900"
                    }`}
                  >
                    1. AI Detection
                  </button>
                  <button
                    onClick={() => setActiveTab("policy")}
                    className={`px-3 py-1 rounded-md transition ${
                      activeTab === "policy"
                        ? "bg-white text-indigo-700 shadow-xs font-semibold"
                        : "hover:text-gray-900"
                    }`}
                  >
                    2. Policy Check
                  </button>
                  <button
                    onClick={() => setActiveTab("forecast")}
                    className={`px-3 py-1 rounded-md transition ${
                      activeTab === "forecast"
                        ? "bg-white text-indigo-700 shadow-xs font-semibold"
                        : "hover:text-gray-900"
                    }`}
                  >
                    3. Cash Forecast
                  </button>
                </div>
              </div>
            </div>

            {/* Mock Preview Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Live AI Proposal Card */}
              <div className="lg:col-span-7 bg-[#fbfbfc] border border-[#e5e7eb] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                        <Clock size={12} /> 21 Days Overdue
                      </span>
                      <span className="text-xs text-gray-400">Invoice #PP-9D31C0</span>
                    </div>
                    <span className="font-mono text-base font-bold text-gray-900">$2,200.00</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                    <span>Priya Sharma</span>
                    <span className="text-xs font-normal text-gray-500">· DesignSprint Studio</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    AI Strategist observed: Priya has settled 4 previous invoices promptly after 1 gentle reminder. No dispute risk flagged.
                  </p>

                  <div className="mt-4 p-3.5 bg-white border border-[#e2e8f0] rounded-lg">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5 font-medium">
                      <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                        <Sparkles size={13} /> Tone: Gentle Freelancer
                      </span>
                      <span>Channel: Direct PayPal Link</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-sans italic">
                      “Hi Priya, hope your week is going great! Following up on invoice #PP-9D31C0 ($2,200 for Web Design milestone). Whenever you get a chance, here is the direct PayPal link: paypal.com/invoice/p/PP-9D31C0. Thanks!”
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Guardrail verified: Within quiet hours limit</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setDemoApproved(true)}
                    className={
                      demoApproved
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "button-primary"
                    }
                  >
                    {demoApproved ? (
                      <>
                        <Check size={14} /> Approved & Dispatched!
                      </>
                    ) : (
                      <>
                        <Zap size={14} /> 1-Click Approve (Demo)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column: Live Context & Metrics */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Expected Settlement
                    </span>
                    <TrendingUp size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-900 mt-1">$12,840.00</div>
                  <p className="text-xs text-emerald-700 mt-1">
                    +18.4% compared to historical 30-day baseline.
                  </p>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    PayPal Sync Status
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">Client Reliability Score</span>
                      <span className="font-bold text-emerald-600">8.8 / 10 (Good)</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-600">Dispute Probability</span>
                      <span className="font-bold text-gray-900">&lt; 0.2%</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-gray-600">Forecast Safety Buffer</span>
                      <span className="font-bold text-indigo-600">14 Days Clean</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-indigo-200">
                    <span>Autonomous Pilot State</span>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-sm font-semibold mt-1">3 Micro-Agents Active</div>
                  <p className="text-[11px] text-indigo-300 mt-0.5">
                    Scout (Monitoring) · Strategist (Drafting) · Executor (Awaiting 1-Click Approval)
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Metric Ticker Bar */}
      <section className="border-y border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="font-display text-3xl font-extrabold text-[#111827]">$2.4M+</div>
              <div className="text-xs text-[#6b7280] font-medium mt-1">Monitored Invoices</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold text-indigo-600">4.2x</div>
              <div className="text-xs text-[#6b7280] font-medium mt-1">Faster Client Settlement</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold text-emerald-600">94.8%</div>
              <div className="text-xs text-[#6b7280] font-medium mt-1">Cash Forecast Accuracy</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold text-[#111827]">100%</div>
              <div className="text-xs text-[#6b7280] font-medium mt-1">Policy-Governed Outreach</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Persona Section */}
      <section id="personas" className="py-20 lg:py-28 bg-[#f8f9fc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
              Adaptive Intelligence
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111827] mt-2">
              Calibrated for your exact business model.
            </h2>
            <p className="text-base text-gray-600 mt-3">
              Every merchant has unique relationships. PayPilot automatically adjusts tone, cadence,
              and policy rules to match your business type.
            </p>
          </div>

          {/* Persona Tabs */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {(
              [
                { key: "freelancer", label: "Freelancer / Studio" },
                { key: "saas", label: "SaaS & Subscriptions" },
                { key: "ecommerce", label: "E-Commerce Brand" },
                { key: "agency", label: "Digital Agency" },
                { key: "service", label: "Field & Home Services" },
                { key: "creator", label: "Creator & Educator" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setActivePersona(item.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activePersona === item.key
                    ? "bg-[#6368e2] text-white shadow-md shadow-indigo-500/20"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Active Persona Card Display */}
          <motion.div
            key={activePersona}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8 max-w-4xl mx-auto bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-xl shadow-gray-200/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: currentProfile.accent }}
                  >
                    {currentProfile.initials}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{currentPersonaData.title}</h3>
                    <p className="text-xs text-gray-500">{currentProfile.descriptor}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                  {currentPersonaData.subtitle}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Communication Tone:</strong>{" "}
                      <span className="text-gray-600">{currentPersonaData.tone}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Recommended Policy Preset:</strong>{" "}
                      <span className="text-gray-600">{currentPersonaData.recommendedPolicy}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Expected Outcome:</strong>{" "}
                      <span className="text-gray-600">{currentPersonaData.recoveryRate}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <Button
                    onClick={() => onOpenSignUp(activePersona)}
                    className="button-primary text-xs font-bold"
                  >
                    Start Onboarding as {currentProfile.type} <ArrowRight size={14} />
                  </Button>
                </div>
              </div>

              {/* Sample Tone Preview */}
              <div className="md:col-span-5 bg-[#f8fafc] border border-gray-200 rounded-xl p-5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  Real AI Prompt Preview
                </span>
                <div className="mt-3 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 leading-relaxed italic">
                  “{currentPersonaData.sampleDraft}”
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 font-medium">
                  {currentPersonaData.quote}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3 Core Pillars Section */}
      <section id="features" className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
              Core Architecture
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111827] mt-2">
              Engineered with safety, foresight, and speed.
            </h2>
            <p className="text-base text-gray-600 mt-3">
              Unlike generic AI email tools, PayPilot is a specialized payment intelligence cockpit
              grounded in your real PayPal settlement data.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#fbfbfc] border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">1. Strict Permission Guardrails</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Define quiet hours (e.g. no emails between 10 PM and 8 AM), auto-approval dollar limits,
                and frequency caps. The agent can never exceed the boundaries you specify.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500">
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-indigo-600" /> Quiet hours auto-enforced
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-indigo-600" /> Human sign-off required for high amounts
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-indigo-600" /> Natural language policy editor
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#fbfbfc] border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-5">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">2. 90-Day PayPal Historical Backfill</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                PayPilot instantly analyzes your past 90 days of PayPal transactions to build a baseline:
                client payment speed, typical delays, dispute rates, and upcoming cashflow bottlenecks.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500">
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-purple-600" /> Client reliability scores (1-10)
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-purple-600" /> 14-day cash buffer forecasting
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-purple-600" /> Dispute & refund risk prediction
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#fbfbfc] border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
                <Workflow size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">3. Scout & Strategist Agent Trio</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Three specialized micro-agents collaborate: Scout detects overdue invoices, Strategist
                formulates the tone-calibrated proposal, and Executor logs every action to an immutable audit ledger.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-gray-500">
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" /> 1-Click approval drawer
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" /> Real-time webhook ingestion
                </li>
                <li className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" /> Complete compliance audit trail
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section id="how-it-works" className="py-20 bg-[#f8f9fc] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
              Simple Onboarding
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111827] mt-2">
              From zero to autonomous pilot in 2 minutes.
            </h2>
            <p className="text-base text-gray-600 mt-3">
              No complex ERP integration. Just your PayPal account and your communication preferences.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 relative">
              <div className="text-3xl font-display font-black text-indigo-200 mb-3">01</div>
              <h4 className="text-base font-bold text-gray-900">Connect PayPal Sandbox or Live</h4>
              <p className="text-xs text-gray-600 mt-2">
                Authorize via PayPal standard OAuth. PayPilot accesses read-only invoice and transaction
                data with strict API scoping.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 relative">
              <div className="text-3xl font-display font-black text-indigo-200 mb-3">02</div>
              <h4 className="text-base font-bold text-gray-900">Define Your Safety Guardrails</h4>
              <p className="text-xs text-gray-600 mt-2">
                Choose a pre-built policy (Freelancer, SaaS, Agency, etc.) or set quiet hours and maximum
                approval amounts in plain English.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 relative">
              <div className="text-3xl font-display font-black text-indigo-200 mb-3">03</div>
              <h4 className="text-base font-bold text-gray-900">Approve AI Proposals with 1-Click</h4>
              <p className="text-xs text-gray-600 mt-2">
                Review drafted follow-ups in your Inbox. One click dispatches the reminder through PayPal's
                invoicing API.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Guardrails Section */}
      <section id="security" className="py-20 bg-[#111827] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Enterprise-Grade Trust
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-2">
                Your money, your client relationships. Always protected.
              </h2>
              <p className="text-sm text-gray-300 mt-4 leading-relaxed">
                We believe AI should assist, not overreach. PayPilot never holds custody of funds, never
                requests payout permissions, and never contacts a client without meeting your exact policy rules.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3.5">
                  <Lock size={16} className="text-indigo-400 mb-1.5" />
                  <strong className="text-white block">Read-Only Scopes</strong>
                  <span className="text-gray-400">Cannot transfer or withdraw money from PayPal.</span>
                </div>
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3.5">
                  <UserCheck size={16} className="text-emerald-400 mb-1.5" />
                  <strong className="text-white block">Human-in-the-Loop</strong>
                  <span className="text-gray-400">All outbound nudges require sign-off by default.</span>
                </div>
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3.5">
                  <Clock size={16} className="text-amber-400 mb-1.5" />
                  <strong className="text-white block">Quiet Hours Protection</strong>
                  <span className="text-gray-400">Guaranteed no messages sent during evenings or weekends.</span>
                </div>
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3.5">
                  <Scale size={16} className="text-purple-400 mb-1.5" />
                  <strong className="text-white block">Full Audit Ledger</strong>
                  <span className="text-gray-400">Every AI reasoning trace recorded immutably.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-emerald-400" />
                  <span className="text-xs font-bold text-gray-200">Active Policy Compliance Matrix</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                  PASSING (100%)
                </span>
              </div>

              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-gray-300 bg-gray-800/40 p-2.5 rounded">
                  <span>DISPUTE_LIMIT</span>
                  <span className="text-emerald-400 font-bold">0 Active Disputes</span>
                </div>
                <div className="flex justify-between items-center text-gray-300 bg-gray-800/40 p-2.5 rounded">
                  <span>MAX_APPROVAL_CAP</span>
                  <span className="text-emerald-400 font-bold">$5,000.00 / action</span>
                </div>
                <div className="flex justify-between items-center text-gray-300 bg-gray-800/40 p-2.5 rounded">
                  <span>QUIET_HOURS_WINDOW</span>
                  <span className="text-emerald-400 font-bold">22:00 — 08:00 EST</span>
                </div>
                <div className="flex justify-between items-center text-gray-300 bg-gray-800/40 p-2.5 rounded">
                  <span>AUTH_SIGNATURE</span>
                  <span className="text-indigo-400 font-bold">SHA-256 Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to put your payment recovery on pilot?
          </h2>
          <p className="mt-4 text-indigo-100 text-base max-w-2xl mx-auto leading-relaxed">
            Join thousands of smart freelancers, agencies, and SaaS founders who collect on time with
            zero awkward friction.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="default"
              onClick={() => onOpenSignUp("freelancer")}
              className="w-full sm:w-auto bg-white text-indigo-900 hover:bg-gray-100 h-12 px-8 text-sm font-bold shadow-xl"
            >
              Start Free 7-Step Onboarding <ArrowRight size={16} />
            </Button>
            <Button
              variant="ghost"
              onClick={onOpenSignIn}
              className="w-full sm:w-auto text-white hover:bg-white/10 h-12 px-6 text-sm font-semibold border border-white/30"
            >
              Existing User? Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <span className="font-display font-extrabold text-sm text-gray-800">paypilot</span>
            <span className="text-gray-400">© 2026 PayPilot Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <a href="#features" className="hover:text-gray-800 transition">
              Features
            </a>
            <a href="#personas" className="hover:text-gray-800 transition">
              Personas
            </a>
            <a href="#security" className="hover:text-gray-800 transition">
              Security
            </a>
            <button onClick={onOpenSignIn} className="hover:text-gray-800 transition">
              Sign In
            </button>
            <button
              onClick={() => onOpenSignUp("freelancer")}
              className="text-indigo-600 font-bold hover:text-indigo-700 transition"
            >
              Onboarding Wizard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
