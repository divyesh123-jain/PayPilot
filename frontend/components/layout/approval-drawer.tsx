"use client";

import { useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  Clock,
  Code2,
  Copy,
  LockKeyhole,
  Mail,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { ApprovalItem } from "@/frontend/features/paypilot/views/inbox-view";

export function ApprovalDrawer({
  item,
  onClose,
  onApprove,
  onUndo,
  onReject,
  approved,
}: {
  item: ApprovalItem;
  onClose: () => void;
  onApprove: () => void;
  onUndo: () => void;
  onReject: () => void;
  approved: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (approved) {
      setSecondsLeft(30);
      timer = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [approved]);

  return (
    <>
      <button className="drawer-backdrop" aria-label="Close approval drawer" onClick={onClose} />
      <aside
        className="approval-drawer"
        aria-label="Approval preview"
        style={{ maxWidth: "520px", width: "95%" }}
      >
        <div className="approval-drawer-header">
          <div>
            <span className="eyebrow">EXECUTOR · APPROVAL REQUIRED</span>
            <h2>{approved ? "30-Second Outbox Hold" : "Review Proposed Action"}</h2>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>

        {approved ? (
          <div className="approved-state" style={{ textAlign: "center", padding: "24px 10px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "28px",
                background: secondsLeft > 0 ? "#eff6ff" : "#ecfdf5",
                color: secondsLeft > 0 ? "#2563eb" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              {secondsLeft > 0 ? <Clock size={28} /> : <Check size={28} />}
            </div>

            <h3 style={{ fontSize: "18px", margin: "0 0 6px" }}>
              {secondsLeft > 0 ? `Holding in Outbox (${secondsLeft}s)` : "Dispatched to Sent Queue"}
            </h3>
            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: "1.5",
                maxWidth: "380px",
                margin: "0 auto 20px",
              }}
            >
              {secondsLeft > 0
                ? "The reminder is currently held in the outbox. The system re-checks policy rules and PayPal connection health before dispatching."
                : "The 30-second hold elapsed. Policy check passed. Reminder delivered to Sent messages."}
            </p>

            {secondsLeft > 0 && (
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "#e2e8f0",
                  borderRadius: "3px",
                  overflow: "hidden",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${((30 - secondsLeft) / 30) * 100}%`,
                    background: "#3b82f6",
                    transition: "width 1s linear",
                  }}
                />
              </div>
            )}

            <div className="approved-actions" style={{ justifyContent: "center", gap: "10px" }}>
              {secondsLeft > 0 && (
                <Button variant="secondary" onClick={onUndo}>
                  <XCircle size={15} /> Cancel Send & Keep Draft
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                Back to Inbox
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="approval-summary">
              <span className="approval-summary-icon">
                <ShieldCheck size={19} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </div>

            {/* Email Preview Section */}
            <div
              className="approval-section"
              style={{
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                <span>OUTBOUND ACTION PREVIEW</span>
                <span style={{ color: "#6366f1" }}>Approval required</span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "6px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <strong>To:</strong> Recipient from connected account
                </div>
                <div>
                  <strong>From:</strong> Your configured workspace identity
                </div>
                <div>
                  <strong>Subject:</strong> {item.title} · {item.amount}
                </div>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#334155",
                  lineHeight: "1.5",
                  fontStyle: "italic",
                }}
              >
                {item.detail}
              </div>
            </div>

            {/* Policy Check */}
            <div className="approval-section">
              <div className="approval-section-title">
                <span>
                  <LockKeyhole size={14} /> Permission Engine Pre-Check
                </span>
                <b className="approval-pass">
                  <Check size={12} /> Pass
                </b>
              </div>
              <p>{item.policy}</p>
              <small>PayPilot will run the policy check again immediately before execution.</small>
            </div>

            {/* Exact Call Preview */}
            <div className="approval-section">
              <div className="approval-section-title">
                <span>
                  <Code2 size={14} /> PayPal Call Preview
                </span>
                <button
                  className="icon-btn"
                  aria-label="Copy call preview"
                  onClick={() => void navigator.clipboard?.writeText(item.call)}
                >
                  <Copy size={13} />
                </button>
              </div>
              <code>{item.call}</code>
              <div className="approval-amount">
                <span>Proposed amount</span>
                <strong>{item.amount}</strong>
              </div>
            </div>

            <div className="approval-undo">
              <Clock size={14} />
              <span>
                Approval records your decision. Nothing executes until the final policy check
                passes.
              </span>
            </div>

            <div className="approval-actions">
              <Button variant="secondary" onClick={onClose}>
                Keep as draft
              </Button>
              <Button variant="ghost" onClick={onReject}>
                Reject draft
              </Button>
              <Button onClick={onApprove}>
                Approve & Start 30s Hold <ArrowRight size={14} />
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
