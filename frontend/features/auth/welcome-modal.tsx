"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  LineChart,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { BusinessKey } from "@/frontend/features/paypilot/types";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  businessName: string;
  businessKey: BusinessKey;
  onOpenFirstProposal?: () => void;
  onExploreDashboard?: () => void;
}

export function WelcomeModal({
  isOpen,
  onClose,
  userName,
  businessName,
  businessKey,
  onOpenFirstProposal,
  onExploreDashboard,
}: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="what-if-overlay z-50 fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="what-if-dialog bg-white rounded-2xl shadow-2xl border border-indigo-100 max-w-lg w-full overflow-hidden"
        style={{ padding: 0 }}
      >
        {/* Celebration Banner Top */}
        <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-950 text-white p-6 sm:p-7 overflow-hidden">
          {/* Background decorative glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-bold text-indigo-200">
              <Sparkles size={13} className="text-amber-300" /> Workspace created
            </span>
          </div>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight">
            Welcome to PayPilot, {userName || "Partner"}! 🎉
          </h2>

          <p className="text-xs sm:text-sm text-indigo-100 mt-2 leading-relaxed">
            Your workspace for <strong>{businessName || "your business"}</strong> is ready. Review
            the connection and safety settings before using live data.
          </p>
        </div>

        {/* Milestones checklist */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500">
            Setup status
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-emerald-950 font-semibold block">
                  PayPal connection requested
                </strong>
                <span className="text-emerald-800">
                  Confirm the connection status in the dashboard before relying on imported data.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl">
              <CheckCircle2 size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-indigo-950 font-semibold block">
                  History sync pending
                </strong>
                <span className="text-indigo-800">
                  Forecasts and client insights will appear after PayPilot imports available PayPal
                  history.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
              <ShieldCheck size={18} className="text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-purple-950 font-semibold block">
                  Approval safeguards enabled
                </strong>
                <span className="text-purple-800">
                  Outbound actions remain behind your explicit approval.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
              <Zap size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-amber-950 font-semibold block">No live proposal yet</strong>
                <span className="text-amber-800">
                  PayPilot will show the first proposal after it finds a real account signal.
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
            <Button
              onClick={() => {
                onClose();
                if (onExploreDashboard) onExploreDashboard();
              }}
              className="button-primary flex-1 h-11 text-xs font-bold justify-center"
            >
              <Inbox size={15} /> Open your dashboard →
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                if (onExploreDashboard) onExploreDashboard();
              }}
              className="flex-1 h-11 text-xs font-semibold justify-center text-gray-700"
            >
              Explore Dashboard
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
