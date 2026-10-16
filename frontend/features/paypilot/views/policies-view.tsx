"use client";

import { useState } from "react";
import {
  ArrowRight,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Switch } from "@/frontend/components/ui/switch";
import { Textarea } from "@/frontend/components/ui/textarea";

export function PoliciesView() {
  const [policies, setPolicies] = useState({ reminders: true, refunds: true, spending: false });
  const [policyText, setPolicyText] = useState("");
  const [parsed, setParsed] = useState(false);
  const toggle = (key: keyof typeof policies) =>
    setPolicies((current) => ({ ...current, [key]: !current[key] }));
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GUARDRAILS & TRUST</span>
          <h1>Permission policies</h1>
          <p>Teach PayPilot how to act — and where to stop.</p>
        </div>
        <Button onClick={() => setParsed(true)}>
          <Plus size={15} /> New policy
        </Button>
      </div>
      <div className="policy-layout">
        <div className="policy-main">
          <div className="policy-hero">
            <div className="policy-hero-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="eyebrow">ACTIVE PROTECTION</span>
              <h2>PayPilot is permission-aware</h2>
              <p>
                Every action is checked against your rules before it reaches PayPal. Violations are
                blocked, explained, and logged.
              </p>
            </div>
            <div className="policy-score">
              <strong>100%</strong>
              <span>enforced</span>
            </div>
          </div>
          <div className="policy-list">
            <div className="policy-list-header">
              <div>
                <span className="eyebrow">ACTIVE RULES</span>
                <h2>Runtime policies</h2>
              </div>
              <span className="policy-count">3 active</span>
            </div>
            <PolicyCard
              icon={<Send size={17} />}
              iconClass="purple"
              title="Email reminders"
              enabled={policies.reminders}
              onToggle={() => toggle("reminders")}
              description="Max 2 reminders per client per week. Allowed hours: 09:00–18:00. Tone escalation capped at firm."
              tags={["Max 2 / client / week", "9am – 6pm", "Approval required"]}
            />
            <PolicyCard
              icon={<RefreshCw size={17} />}
              iconClass="orange"
              title="Refunds"
              enabled={policies.refunds}
              onToggle={() => toggle("refunds")}
              description="Refunds up to $100 can be drafted. Anything higher needs your explicit approval."
              tags={["Up to $100", "Always approve over limit"]}
            />
            <PolicyCard
              icon={<Zap size={17} />}
              iconClass="teal"
              title="Autonomous actions"
              enabled={policies.spending}
              onToggle={() => toggle("spending")}
              description="Allow PayPilot to execute pre-approved workflows without asking every time."
              tags={["Currently off", "High trust mode"]}
            />
          </div>
        </div>
        <aside className="policy-side">
          <Card className="violation-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">RECENT EVENTS</span>
                <h2>Violation log</h2>
              </div>
              <Button variant="icon">
                <MoreHorizontal size={16} />
              </Button>
            </div>
            <Violation
              title="Reminder #3 blocked"
              detail="Priya Sharma · 2 hr ago"
              meta="Queued for Monday at 9:00am"
            />
            <Violation
              title="Refund needs approval"
              detail="Order #10460 · Yesterday"
              meta="$145 exceeds $100 limit"
            />
            <Button variant="link">
              View full log <ArrowRight size={14} />
            </Button>
          </Card>
          <Card className="policy-builder">
            <span className="eyebrow">NATURAL LANGUAGE</span>
            <h2>Tell PayPilot a new rule</h2>
            <p>
              Describe your guardrail in plain English. We’ll turn it into an enforceable policy.
            </p>
            <Textarea
              value={policyText}
              onChange={(event) => setPolicyText(event.target.value)}
              placeholder="e.g. Never send a reminder on weekends..."
            />
            <Button variant="dark" className="full-button" onClick={() => setParsed(true)}>
              <Sparkles size={15} /> Parse policy
            </Button>
            {parsed && (
              <div className="parsed-state">
                <ShieldCheck size={14} /> <span>Draft policy ready for review</span>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PolicyCard({
  icon,
  iconClass,
  title,
  enabled,
  onToggle,
  description,
  tags,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  enabled: boolean;
  onToggle: () => void;
  description: string;
  tags: string[];
}) {
  return (
    <div className="policy-card">
      <div className={`policy-card-icon ${iconClass}`}>{icon}</div>
      <div className="policy-card-copy">
        <div className="policy-card-title">
          <h3>{title}</h3>
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`Toggle ${title}`} />
        </div>
        <p>{description}</p>
        <div className="policy-tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <Button variant="icon" aria-label={`${title} options`}>
        <MoreHorizontal size={17} />
      </Button>
    </div>
  );
}
function Violation({ title, detail, meta }: { title: string; detail: string; meta: string }) {
  return (
    <div className="violation-item">
      <span className="violation-icon">
        <Lock size={14} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <small>{meta}</small>
      </div>
    </div>
  );
}
