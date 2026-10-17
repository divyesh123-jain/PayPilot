"use client";

import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  X,
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
  return (
    <>
      <button className="drawer-backdrop" aria-label="Close approval drawer" onClick={onClose} />
      <aside className="approval-drawer" aria-label="Approval preview">
        <div className="approval-drawer-header">
          <div>
            <span className="eyebrow">EXECUTOR · APPROVAL REQUIRED</span>
            <h2>{approved ? "Action approved" : "Review this action"}</h2>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        {approved ? (
          <div className="approved-state">
            <span>
              <Check size={22} />
            </span>
            <h3>Draft approved</h3>
            <p>
              The reminder is queued safely. You can undo this decision for the next 30 seconds.
            </p>
            <div className="approved-actions">
              <Button variant="secondary" onClick={onUndo}>
                <RotateCcw size={14} /> Undo approval
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Back to inbox
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
            <div className="approval-section">
              <div className="approval-section-title">
                <span>
                  <LockKeyhole size={14} /> Policy check
                </span>
                <b className="approval-pass">
                  <Check size={12} /> Pass
                </b>
              </div>
              <p>{item.policy}</p>
              <small>Policy engine checked this draft before it reached you.</small>
            </div>
            <div className="approval-section">
              <div className="approval-section-title">
                <span>
                  <Code2 size={14} /> Call preview
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
                <span>Invoice value</span>
                <strong>{item.amount}</strong>
              </div>
            </div>
            <div className="approval-undo">
              <RotateCcw size={14} />
              <span>
                Nothing is sent until you approve. Approved actions can be undone immediately.
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
                Approve & queue <ArrowRight size={14} />
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
