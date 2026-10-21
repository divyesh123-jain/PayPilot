"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Workflow,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { businessOptions } from "@/frontend/features/paypilot/data";
import type { BusinessKey } from "@/frontend/features/paypilot/types";

interface LandingPageProps {
  onOpenSignIn: () => void;
  onOpenSignUp: (preset?: BusinessKey) => void;
  onEnterDashboard: () => void;
  isAuthenticated?: boolean;
  currentUser?: { name: string; businessName: string };
}

const personaDetails: Record<BusinessKey, { title: string; description: string; setup: string }> = {
  freelancer: {
    title: "Freelancers and studios",
    description:
      "Keep project invoices visible, protect client relationships, and review every reminder before it leaves.",
    setup: "Invoice timing, client controls, and gentle outreach",
  },
  ecommerce: {
    title: "E-commerce teams",
    description:
      "Understand settlement timing, refunds, and reserves from the payment records you actually connect.",
    setup: "Settlement health, refunds, and dispute signals",
  },
  saas: {
    title: "SaaS and subscriptions",
    description:
      "Give failed renewals a clear review path without hiding churn risk behind generic automation.",
    setup: "Renewal recovery, retry context, and approval rules",
  },
  agency: {
    title: "Agencies and consultancies",
    description: "Coordinate milestone billing and client follow-ups from one governed workspace.",
    setup: "Milestones, retainers, and owner approvals",
  },
  service: {
    title: "Service businesses",
    description:
      "See what is outstanding after each job and choose when a payment link or reminder is appropriate.",
    setup: "Job payments, open invoices, and timing preferences",
  },
  creator: {
    title: "Creators and educators",
    description:
      "Separate memberships, digital products, and refunds while keeping communication human.",
    setup: "Membership health, refunds, and soft-touch policies",
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
  const persona = personaDetails[activePersona];

  return (
    <div className="landing-root min-h-screen bg-[#f8f9fc] text-[#1d2534] selection:bg-[#6368e2]/20">
      <div className="bg-[#1e1b4b] px-4 py-2 text-center text-xs font-medium text-indigo-100">
        PayPilot starts empty. Connect your merchant account to bring in real data.
      </div>

      <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-extrabold tracking-tight">paypilot</span>
              <span className="rounded-[5px] border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                BETA
              </span>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-[13px] font-semibold text-gray-600 md:flex">
            <a href="#platform" className="hover:text-indigo-600">
              Platform
            </a>
            <a href="#businesses" className="hover:text-indigo-600">
              For your business
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600">
              How it works
            </a>
            <a href="#security" className="hover:text-indigo-600">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden text-xs text-gray-500 sm:inline">
                  {currentUser?.name || "Signed in"}
                </span>
                <Button onClick={onEnterDashboard} className="button-primary text-xs">
                  Open workspace <ArrowRight size={14} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={onOpenSignIn}
                  className="px-3 text-xs font-semibold"
                >
                  Sign in
                </Button>
                <Button onClick={() => onOpenSignUp()} className="button-primary text-xs font-bold">
                  Start setup <ArrowRight size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pb-20 pt-16 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[420px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-200/50 via-purple-100/40 to-blue-100/30 blur-3xl" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700"
              >
                <Sparkles size={14} /> Payment intelligence with a human approval boundary
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-gray-950 sm:text-5xl lg:text-6xl"
              >
                Make payment decisions with context, not guesswork.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg"
              >
                PayPilot turns your connected PayPal activity into forecasts, risk signals, and
                reviewable next steps. It does not invent records, send messages, or move money
                without your permission.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button
                  onClick={() => onOpenSignUp()}
                  className="button-primary h-12 w-full px-6 text-sm font-bold shadow-lg shadow-indigo-600/20 sm:w-auto"
                >
                  Create your workspace <ArrowRight size={16} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={onOpenSignIn}
                  className="h-12 w-full border-gray-300 px-6 text-sm font-semibold text-gray-700 sm:w-auto"
                >
                  <Lock size={15} className="text-indigo-500" /> I already have an account
                </Button>
              </motion.div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-gray-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-500" /> Starts with no imported
                  records
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock size={14} className="text-indigo-500" /> Scoped access
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-indigo-500" /> Approval by default
                </span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="mx-auto mt-14 max-w-5xl rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl shadow-indigo-950/10 sm:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-xs text-gray-500">paypilot / workspace</span>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                  Connection required
                </span>
              </div>
              <div className="grid gap-5 lg:grid-cols-12">
                <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-6 lg:col-span-7">
                  <div className="flex h-full flex-col justify-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Your first signal
                    </span>
                    <h2 className="mt-2 text-2xl font-bold text-gray-900">
                      Nothing is assumed here.
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                      Connect a merchant account and PayPilot will build this view from your
                      transactions, invoices, and policies. Until then, the queue stays empty.
                    </p>
                    <Button onClick={() => onOpenSignUp()} className="mt-6 w-fit text-xs">
                      Connect during setup <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 lg:col-span-5">
                  <StatusCard
                    icon={<BarChart3 size={17} />}
                    title="Cash forecast"
                    detail="Waiting for payment history"
                  />
                  <StatusCard
                    icon={<Workflow size={17} />}
                    title="Decision queue"
                    detail="No proposals created"
                  />
                  <StatusCard
                    icon={<ShieldCheck size={17} />}
                    title="Policy engine"
                    detail="Approval required by default"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="businesses" className="border-y border-gray-200 bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="eyebrow text-indigo-600">START WITH YOUR OPERATING MODEL</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-gray-950 sm:text-4xl">
                Your rules should match your business.
              </h2>
              <p className="mt-3 text-base text-gray-600">
                Choose a starting point for terminology and guardrails. Your connected data remains
                the source of truth.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {businessOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setActivePersona(option.key)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${activePersona === option.key ? "bg-indigo-600 text-white shadow-md" : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mx-auto mt-8 grid max-w-4xl items-center gap-8 rounded-2xl border border-gray-200 bg-[#fbfbfc] p-6 shadow-xl shadow-gray-200/40 sm:p-8 md:grid-cols-12">
              <div className="md:col-span-7">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {persona.setup}
                </span>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">{persona.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{persona.description}</p>
                <Button
                  onClick={() => onOpenSignUp(activePersona)}
                  className="button-primary mt-6 text-xs"
                >
                  Use this setup <ArrowRight size={14} />
                </Button>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 md:col-span-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <Clock3 size={15} className="text-indigo-500" /> First-run defaults
                </div>
                <ul className="mt-4 space-y-3 text-xs text-gray-600">
                  <li className="flex gap-2">
                    <Check size={14} className="mt-0.5 text-emerald-600" /> Read access is explained
                    before authorization
                  </li>
                  <li className="flex gap-2">
                    <Check size={14} className="mt-0.5 text-emerald-600" /> New contacts start in
                    monitor-only mode
                  </li>
                  <li className="flex gap-2">
                    <Check size={14} className="mt-0.5 text-emerald-600" /> Outbound actions require
                    explicit approval
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-t border-gray-200 bg-[#f8f9fc] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="eyebrow text-indigo-600">THE PLATFORM</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-gray-950 sm:text-4xl">
                A useful system, not a magic demo.
              </h2>
              <p className="mt-3 text-base text-gray-600">
                Every insight has a source, every action has a policy check, and every workspace can
                stay empty until you connect it.
              </p>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<ShieldCheck size={24} />}
                tone="indigo"
                title="Permission-first actions"
                detail="Set scopes, quiet hours, and approval rules before PayPilot can prepare or send anything."
              />
              <FeatureCard
                icon={<BarChart3 size={24} />}
                tone="purple"
                title="Account-backed intelligence"
                detail="Forecasts and risk signals are calculated from the payment activity available in your connected account."
              />
              <FeatureCard
                icon={<UserCheck size={24} />}
                tone="emerald"
                title="Human review by default"
                detail="The system can suggest a next step, but a person remains in control of outbound communication and money movement."
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-gray-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="eyebrow text-indigo-600">HOW IT WORKS</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-gray-950 sm:text-4xl">
                A clear path from setup to signal.
              </h2>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-4">
              <Step
                number="01"
                title="Create workspace"
                detail="Tell us who you are and how you operate."
              />
              <Step
                number="02"
                title="Choose access"
                detail="Review exactly what PayPilot can read or draft."
              />
              <Step
                number="03"
                title="Connect PayPal"
                detail="Authorize the merchant account you want to monitor."
              />
              <Step
                number="04"
                title="Review first signal"
                detail="Start with real records and approve only what makes sense."
              />
            </div>
          </div>
        </section>

        <section id="security" className="bg-[#111827] py-20 text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-6">
              <span className="eyebrow text-indigo-300">SECURITY & CONTROL</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
                Your data sets the boundary.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-300">
                PayPilot is designed to assist with payment operations without pretending to be your
                accounting system or your approval authority.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
              <TrustCard
                icon={<Lock size={17} />}
                title="Scoped access"
                detail="Request only the PayPal access needed for the configured workflow."
              />
              <TrustCard
                icon={<UserCheck size={17} />}
                title="Human sign-off"
                detail="Outbound actions stay reviewable and policy checked."
              />
              <TrustCard
                icon={<Clock3 size={17} />}
                title="Quiet hours"
                detail="Respect the communication windows you define."
              />
              <TrustCard
                icon={<ShieldCheck size={17} />}
                title="Audit trail"
                detail="Keep a record of proposals, approvals, and lifecycle changes."
              />
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 py-20 text-center text-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ready to connect your real workspace?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-indigo-100">
              Start with a blank, permissioned workspace. Add your account when you are ready.
            </p>
            <Button
              onClick={() => onOpenSignUp()}
              className="mt-8 h-12 bg-white px-8 text-sm font-bold text-indigo-900 hover:bg-gray-100"
            >
              Start setup <ArrowRight size={16} />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-10 text-xs text-gray-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <span className="font-display font-extrabold text-sm text-gray-800">paypilot</span>
            <span>© 2026 PayPilot</span>
          </div>
          <div className="flex gap-6 font-medium">
            <a href="#platform" className="hover:text-gray-800">
              Platform
            </a>
            <a href="#security" className="hover:text-gray-800">
              Security
            </a>
            <button onClick={onOpenSignIn} className="hover:text-gray-800">
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatusCard({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </span>
      <div>
        <strong className="block text-sm text-gray-900">{title}</strong>
        <span className="text-xs text-gray-500">{detail}</span>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  tone,
  title,
  detail,
}: {
  icon: ReactNode;
  tone: "indigo" | "purple" | "emerald";
  title: string;
  detail: string;
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg">
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${colors[tone]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}

function Step({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-[#fbfbfc] p-6">
      <div className="mb-3 font-display text-3xl font-black text-indigo-200">{number}</div>
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}

function TrustCard({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
      <div className="mb-2 text-indigo-300">{icon}</div>
      <strong className="block text-sm text-white">{title}</strong>
      <span className="mt-1 block text-xs leading-relaxed text-gray-400">{detail}</span>
    </div>
  );
}
