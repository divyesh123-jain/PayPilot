"use client";

import { ArrowRight, Check, ExternalLink, Inbox, ShieldCheck } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import type { BusinessProfile } from "../types";
import type { ApiProposal } from "@/frontend/lib/api";

export type ApprovalItem = {
  title: string;
  detail: string;
  amount: string;
  policy: string;
  call: string;
};

function toApprovalItem(proposal: ApiProposal): ApprovalItem {
  return {
    title: proposal.action
      ? `Review ${proposal.action.replaceAll("_", " ")}`
      : "Review proposed action",
    detail: proposal.rationale || "PayPilot prepared an action from connected account activity.",
    amount:
      proposal.amountCents === undefined
        ? "—"
        : `$${(proposal.amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    policy: proposal.policyDecision.reason,
    call: `${proposal.action || "action"}(proposal=${proposal.id})`,
  };
}

export function InboxView({
  business,
  remoteProposals,
  loading,
  error,
  onAsk,
  onApprove,
  onOpenApproval,
}: {
  business: BusinessProfile;
  remoteProposals: ApiProposal[] | null;
  loading: boolean;
  error: string | null;
  onAsk: () => void;
  onApprove: (item: ApprovalItem) => void;
  onOpenApproval: (item: ApprovalItem) => void;
}) {
  const proposals = remoteProposals?.filter((proposal) => proposal.status === "proposed") ?? [];

  return (
    <div className="view-content inbox-view">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">AGENT INBOX</span>
          <h1>Your decisions</h1>
          <p>PayPilot will place account-backed proposals here for your review.</p>
        </div>
        <div className="welcome-actions">
          <Button variant="secondary" onClick={onAsk}>
            Ask about your account
          </Button>
          <Button onClick={onAsk}>
            <Check size={15} /> Ask PayPilot
          </Button>
        </div>
      </div>
      {loading && <div className="data-status loading-status">Syncing connected account…</div>}
      {error && (
        <div className="data-status error-status">
          Live account data is unavailable. Connect the API to load decisions.
        </div>
      )}

      <section className="inbox-hero panel">
        <div className="inbox-hero-copy">
          <div className="inbox-kicker">
            <span className="live-dot" /> AGENT TEAM · READY
          </div>
          <h2>
            {proposals.length > 0 ? (
              <>
                Your financial team found{" "}
                <strong>
                  {proposals.length} decision{proposals.length === 1 ? "" : "s"}
                </strong>{" "}
                for {business.name}.
              </>
            ) : (
              <>Your decision queue is ready for {business.name}.</>
            )}
          </h2>
          <p>
            Scout watches connected activity, Strategist ranks the impact, and Executor prepares
            safe drafts. Nothing moves without your permission.
          </p>
          <Button variant="dark" onClick={onAsk}>
            Open Ask PayPilot <ArrowRight size={15} />
          </Button>
        </div>
        <div className="inbox-signal-grid">
          <div>
            <span>Needs approval</span>
            <strong>{proposals.length}</strong>
            <small>ready to review</small>
          </div>
          <div>
            <span>Blocked by policy</span>
            <strong>—</strong>
            <small>after data sync</small>
          </div>
          <div>
            <span>Watching</span>
            <strong>—</strong>
            <small>after data sync</small>
          </div>
        </div>
      </section>

      <div className="inbox-grid">
        <section className="panel inbox-feed-panel">
          <div className="panel-header inbox-section-header">
            <div>
              <span className="eyebrow">ACCOUNT-BACKED SIGNALS</span>
              <h2>Decision queue</h2>
            </div>
            <Badge variant="soft">{proposals.length} open</Badge>
          </div>
          {proposals.length === 0 ? (
            <div className="empty-state" style={{ margin: "18px 0" }}>
              <Inbox size={22} />
              <strong>No proposals yet</strong>
              <p>
                Connect PayPal and sync your account. PayPilot will show only decisions based on
                your real activity.
              </p>
            </div>
          ) : (
            proposals.map((proposal) => {
              const item = toApprovalItem(proposal);
              return (
                <div className="inbox-item approval-item" key={proposal.id}>
                  <div className="inbox-item-icon purple">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="inbox-item-copy">
                    <div className="inbox-item-title">
                      <strong>{item.title}</strong>
                      <time>{proposal.status}</time>
                    </div>
                    <p>{item.detail}</p>
                    <div className="inbox-item-actions">
                      <Button size="sm" onClick={() => onOpenApproval(item)}>
                        Review proposal <ArrowRight size={13} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onApprove(item)}>
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <aside className="inbox-side">
          <Card className="deep-preset-card">
            <div className="panel-header">
              <div>
                <span className="eyebrow">WHAT PAYPILOT WILL WATCH</span>
                <h2>Connected account signals</h2>
              </div>
              <ExternalLink size={15} />
            </div>
            <PresetRow title="Cash runway" detail="Forecast + commitments" tone="teal" />
            <PresetRow title="Collections" detail="Invoice timing + nudges" tone="purple" />
            <PresetRow title="Risk watch" detail="Refunds + reserves" tone="red" />
          </Card>
          <Card className="quick-ask-card">
            <span className="eyebrow">QUICK ASK</span>
            <h2>Need context?</h2>
            <p>Ask PayPilot about your connected records once the first sync completes.</p>
            <Button variant="secondary" className="full-button" onClick={onAsk}>
              Ask PayPilot <ArrowRight size={14} />
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PresetRow({ title, detail, tone }: { title: string; detail: string; tone: string }) {
  return (
    <div className="preset-row">
      <span className={`preset-dot ${tone}`} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ArrowRight size={14} />
    </div>
  );
}
