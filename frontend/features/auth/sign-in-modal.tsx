"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { startPayPalLogin } from "@/frontend/lib/api";
import type { BusinessKey } from "@/frontend/features/paypilot/types";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: (preset?: BusinessKey) => void;
}

export function SignInModal({ isOpen, onClose, onSwitchToSignUp }: SignInModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayPalSignIn = () => {
    setError(null);
    setLoading(true);
    try {
      startPayPalLogin("/");
    } catch {
      setLoading(false);
      setError("Could not start PayPal sign-in. Check that the API is reachable.");
    }
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
                Continue with your PayPal account
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

        <div className="p-6 pt-5 space-y-4">
          <Button
            type="button"
            disabled={loading}
            onClick={handlePayPalSignIn}
            className="w-full button-primary h-11 text-sm font-bold justify-center"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Redirecting to PayPal…
              </>
            ) : (
              <>Continue with PayPal</>
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            PayPilot uses Login with PayPal for workspace access. Your PayPal secret never enters
            the browser.
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-700 text-center">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            Don&apos;t have a PayPilot account yet?{" "}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToSignUp();
              }}
              className="text-indigo-600 font-bold hover:underline ml-1"
            >
              Start Onboarding Wizard →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
