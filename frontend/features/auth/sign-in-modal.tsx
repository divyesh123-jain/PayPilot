"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCw, Sparkles, User, X } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { BusinessKey } from "@/frontend/features/paypilot/types";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: (preset?: BusinessKey) => void;
}

export function SignInModal({ isOpen, onClose, onSwitchToSignUp }: SignInModalProps) {
  const [activeTab, setActiveTab] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your work email and password to continue.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setError(
        "Sign-in is not connected in this environment yet. Start a new workspace to continue with real setup."
      );
    }, 300);
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

        {/* Form area */}
        <div className="p-6 pt-5">
          {/* Method tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold mb-5 text-gray-600">
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`flex-1 py-1.5 rounded-md text-center transition ${
                activeTab === "password"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "hover:text-gray-900"
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
              {error && (
                <p role="alert" className="text-xs text-red-700">
                  {error}
                </p>
              )}
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

              <Button
                onClick={() => {
                  setError(null);
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                    setError("Enter a valid work email address first.");
                    return;
                  }
                  setError(
                    "Magic-link delivery is not connected in this environment yet. Start a new workspace to continue with real setup."
                  );
                }}
                className="w-full button-primary h-10 text-xs font-bold justify-center"
              >
                Request sign-in link
              </Button>
              {error && (
                <p role="alert" className="text-xs text-red-700">
                  {error}
                </p>
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
                onSwitchToSignUp();
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
