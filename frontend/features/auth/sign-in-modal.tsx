"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { BusinessKey } from "@/frontend/features/paypilot/types";
import { businessProfiles } from "@/frontend/features/paypilot/data";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: {
    name: string;
    email: string;
    businessName: string;
    businessKey: BusinessKey;
  }) => void;
  onSwitchToSignUp: (preset?: BusinessKey) => void;
}

const demoAccounts: {
  key: BusinessKey;
  name: string;
  email: string;
  businessName: string;
  role: string;
  avatarColor: string;
  initials: string;
}[] = [
  {
    key: "freelancer",
    name: "Alex Morgan",
    email: "alex@morgancreative.agency",
    businessName: "Morgan Creative Studio",
    role: "Freelancer / Studio",
    avatarColor: "#a88bff",
    initials: "AM",
  },
  {
    key: "saas",
    name: "Liam Chen",
    email: "liam@pulsemetrics.io",
    businessName: "PulseMetrics SaaS",
    role: "SaaS Founder",
    avatarColor: "#4f98ca",
    initials: "LC",
  },
  {
    key: "ecommerce",
    name: "Nora Blake",
    email: "nora@drifttide.com",
    businessName: "Drift & Tide Co.",
    role: "E-Commerce Merchant",
    avatarColor: "#e28743",
    initials: "NB",
  },
  {
    key: "agency",
    name: "Maya Patel",
    email: "maya@northstar.agency",
    businessName: "NorthStar Studio",
    role: "Agency Director",
    avatarColor: "#21b6a8",
    initials: "MP",
  },
];

export function SignInModal({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToSignUp,
}: SignInModalProps) {
  const [activeTab, setActiveTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("alex@morgancreative.agency");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [selectedKey, setSelectedKey] = useState<BusinessKey>("freelancer");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const profile = businessProfiles[selectedKey];
      onSuccess({
        name: profile.name,
        email: email || "alex@morgancreative.agency",
        businessName: profile.type + " Workspace",
        businessKey: selectedKey,
      });
      onClose();
    }, 600);
  };

  const handleSelectDemo = (acc: (typeof demoAccounts)[0]) => {
    setEmail(acc.email);
    setSelectedKey(acc.key);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess({
        name: acc.name,
        email: acc.email,
        businessName: acc.businessName,
        businessKey: acc.key,
      });
      onClose();
    }, 450);
  };

  return (
    <div className="what-if-overlay z-50 fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="what-if-dialog bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden"
        style={{ padding: 0 }}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <span />
              <span />
              <span />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-gray-900 leading-tight">
                Sign in to PayPilot
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Access your payment intelligence cockpit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1-Click Quick Demo Accounts (Ideal for evaluation!) */}
        <div className="p-6 pb-3 bg-[#fafbfe] border-b border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
              <Zap size={12} className="text-amber-500" /> 1-Click Instant Demo Sign-In
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Select a persona</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.key}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-xs transition text-left group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                  style={{ background: acc.avatarColor }}
                >
                  {acc.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-800 truncate group-hover:text-indigo-600 transition">
                    {acc.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{acc.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form area */}
        <div className="p-6 pt-5">
          {/* Method tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold mb-5 text-gray-600">
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`flex-1 py-1.5 rounded-md text-center transition ${
                activeTab === "password" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("magic")}
              className={`flex-1 py-1.5 rounded-md text-center transition ${
                activeTab === "magic" ? "bg-white text-gray-900 shadow-xs" : "hover:text-gray-900"
              }`}
            >
              Magic Link
            </button>
          </div>

          {activeTab === "password" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Work Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500 pl-9"
                  />
                  <Mail size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => alert("For this demo, any password works or select 1-click demo sign-in!")}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500 pl-9 pr-9"
                  />
                  <Lock size={15} className="absolute left-3 top-3 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full button-primary h-10 text-xs font-bold justify-center"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>Sign In to Cockpit →</>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email for Magic Link
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500 pl-9"
                  />
                  <Mail size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              {magicSent ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={15} /> Magic Link Sent!
                  </div>
                  <p>
                    Check your inbox at <strong>{email}</strong>. For this demo, you can click below to simulate clicking the magic link:
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const profile = businessProfiles[selectedKey];
                      onSuccess({
                        name: profile.name,
                        email,
                        businessName: profile.type + " Workspace",
                        businessKey: selectedKey,
                      });
                      onClose();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full text-xs mt-1"
                  >
                    Simulate Clicking Magic Link →
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setMagicSent(true)}
                  className="w-full button-primary h-10 text-xs font-bold justify-center"
                >
                  Send One-Click Magic Link
                </Button>
              )}
            </div>
          )}

          {/* Switch to Sign Up */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            Don't have a PayPilot account yet?{" "}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToSignUp(selectedKey);
              }}
              className="text-indigo-600 font-bold hover:underline ml-1"
            >
              Start Onboarding Wizard & Sign Up →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
