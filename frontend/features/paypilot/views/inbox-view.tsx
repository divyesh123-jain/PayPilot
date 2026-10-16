"use client";

import { ArrowRight, Ban, Check, Clock3, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Badge } from "@/frontend/components/ui/badge";
import type { BusinessProfile } from "../types";

export type ApprovalItem = {
  title: string;
  detail: string;
  amount: string;
  policy: string;
  call: string;
};

export const approvalItem: ApprovalItem = {
  title: "Send a reminder to Priya Sharma",
  detail: "A firm, personal reminder for the overdue web design invoice.",
  amount: "$2,200",
  policy: "Email reminders · max 2 per client / week · approval required",
  call: "send_reminder(client=Priya Sharma, invoice=PP-9D31C0, tone=firm)",
};

export function InboxView({
  business,
  onAsk,
  onApprove,
  onOpenApproval,
}: {
  business: BusinessProfile;
  onAsk: () => void;
  onApprove: (item: ApprovalItem) => void;
  onOpenApproval: (item: ApprovalItem) => void;
}) {
  return (
    <div className="view-content inbox-view">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">AGENT INBOX · WEDNESDAY, OCTOBER 15, 2026</span>
          <h1>Good morning, Alex <span className="wave">✦</span></h1>
          <p>PayPilot sorted the signal from the noise. Here are the decisions that need you.</p>
        </div>
        <div className="welcome-actions">
          <Button variant="secondary" onClick={onAsk}>Ask a question</Button>
          <Button onClick={() => onOpenApproval(approvalItem)}><Check size={15} /> Review approval</Button>
        </div>
      </div>

      <section className="inbox-hero panel">
        <div className="inbox-hero-copy">
          <div className="inbox-kicker"><span className="live-dot" /> AGENT TEAM · 3 ONLINE</div>
          <h2>Your financial team found <strong>3 decisions</strong> for {business.name}.</h2>
          <p>Scout watched the activity, Strategist ranked the impact, and Executor prepared safe drafts. Nothing moves without your permission.</p>
          <Button variant="dark" onClick={onAsk}>Open Ask PayPilot <ArrowRight size={15} /></Button>
        </div>
        <div className="inbox-signal-grid">
          <div><span>Needs approval</span><strong>1</strong><small>ready to review</small></div>
          <div><span>Blocked by policy</span><strong>1</strong><small>no action taken</small></div>
          <div><span>Watching</span><strong>12</strong><small>accounts monitored</small></div>
        </div>
      </section>

      <div className="inbox-grid">
        <section className="panel inbox-feed-panel">
          <div className="panel-header inbox-section-header">
            <div><span className="eyebrow">PRIORITIZED SIGNALS</span><h2>Decision queue</h2></div>
            <Badge variant="soft">3 open</Badge>
          </div>
          <div className="inbox-item approval-item">
            <div className="inbox-item-icon purple"><Sparkles size={17} /></div>
            <div className="inbox-item-copy">
              <div className="inbox-item-title"><strong>{approvalItem.title}</strong><time>8 min ago</time></div>
              <p>{approvalItem.detail} PayPilot estimates a <b>72% chance of payment within 48 hours.</b></p>
              <div className="inbox-item-actions">
                <Button size="sm" onClick={() => onOpenApproval(approvalItem)}>Review approval <ArrowRight size={13} /></Button>
                <Button variant="ghost" size="sm" onClick={() => onApprove(approvalItem)}>Approve draft</Button>
              </div>
            </div>
          </div>
          <div className="inbox-item">
            <div className="inbox-item-icon amber"><Clock3 size={17} /></div>
            <div className="inbox-item-copy">
              <div className="inbox-item-title"><strong>Forecast shifted for Thursday</strong><time>31 min ago</time></div>
              <p>{business.forecast.narrative}</p>
              <span className="inbox-meta"><Check size={13} /> No action needed · {business.forecast.confidence}</span>
            </div>
          </div>
          <div className="inbox-item blocked-item">
            <div className="inbox-item-icon red"><Ban size={17} /></div>
            <div className="inbox-item-copy">
              <div className="inbox-item-title"><strong>Third reminder blocked by policy</strong><time>2 hr ago</time></div>
              <p>Executor stopped the action because this client already received two reminders this week. It is queued for Monday at 09:00.</p>
              <span className="blocked-label"><ShieldAlert size={13} /> Blocked safely · no external call made</span>
            </div>
          </div>
        </section>

        <aside className="inbox-side">
          <Card className="deep-preset-card">
            <div className="panel-header"><div><span className="eyebrow">DEEP PRESETS</span><h2>See the story behind the signal</h2></div><ExternalLink size={15} /></div>
            <PresetRow title="Cash runway" detail="Forecast + commitments" tone="teal" />
            <PresetRow title="Collections" detail="Invoice timing + nudges" tone="purple" />
            <PresetRow title="Risk watch" detail="Refunds + reserves" tone="red" />
          </Card>
          <Card className="quick-ask-card">
            <span className="eyebrow">QUICK ASK</span>
            <h2>What changed since yesterday?</h2>
            <p>Let PayPilot explain the meaningful movements across your accounts.</p>
            <Button variant="secondary" className="full-button" onClick={onAsk}>Ask PayPilot <ArrowRight size={14} /></Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PresetRow({ title, detail, tone }: { title: string; detail: string; tone: string }) {
  return <button className="preset-row"><span className={`preset-dot ${tone}`} /><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={14} /></button>;
}
