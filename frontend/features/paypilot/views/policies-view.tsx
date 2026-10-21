"use client";

import { useEffect, useState } from "react";
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
import {
  parsePolicy,
  savePolicy as savePolicyRequest,
  savePolicyText,
  type ApiPolicy,
  type ApiPolicyRule,
  type ParsedPolicy,
} from "@/frontend/lib/api";

const policyActions = {
  reminders: "send_reminder",
  refunds: "issue_refund",
  spending: "execute_payment",
} as const;

export function PoliciesView({
  policy,
  loading,
  error,
  onPolicySaved,
}: {
  policy: ApiPolicy | null;
  loading: boolean;
  error: string | null;
  onPolicySaved: (policy: ApiPolicy) => void;
}) {
  const [policies, setPolicies] = useState({ reminders: true, refunds: true, spending: false });
  const [policyText, setPolicyText] = useState("");
  const [parsed, setParsed] = useState<ParsedPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!policy) return;
    setPolicies({
      reminders: policy.rules.some((rule) => rule.action === policyActions.reminders),
      refunds: policy.rules.some((rule) => rule.action === policyActions.refunds),
      spending: policy.rules.some((rule) => rule.action === policyActions.spending),
    });
  }, [policy]);

  const toggle = async (key: keyof typeof policies) => {
    const enabled = !policies[key];
    const next = { ...policies, [key]: enabled };
    setPolicies(next);
    setMessage(null);
    if (!policy) {
      setMessage("Policy preference updated locally. It will sync when the API is available.");
      return;
    }
    const action = policyActions[key];
    const rules = policy.rules.filter((rule) => rule.action !== action);
    if (enabled) {
      rules.push({
        id: `${key}-runtime`,
        action,
        effect: key === "spending" ? "allow" : "require_approval",
        description:
          key === "spending" ? "Allow approved payment actions" : `Require approval for ${key}`,
      });
    }
    setSaving(true);
    try {
      const saved = await savePolicyRequest({ ...policy, rules });
      onPolicySaved(saved);
      setMessage(
        `${key === "spending" ? "Autonomous actions" : key[0].toUpperCase() + key.slice(1)} policy ${enabled ? "enabled" : "disabled"}.`
      );
    } catch (caught) {
      setPolicies(policies);
      setFormError(caught instanceof Error ? caught.message : "Policy could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleParse = async () => {
    if (!policyText.trim()) {
      setFormError("Describe a rule before parsing it.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await parsePolicy(policyText);
      setParsed(result);
      setMessage("Draft policy ready for review.");
    } catch (caught) {
      const lower = policyText.toLowerCase();
      const action = lower.includes("refund")
        ? "issue_refund"
        : lower.includes("reminder") || lower.includes("collection")
          ? "send_reminder"
          : lower.includes("payment")
            ? "execute_payment"
            : null;
      if (action) {
        setParsed({
          rule: {
            id: "local-draft",
            action,
            effect:
              lower.includes("never") || lower.includes("block")
                ? "deny"
                : lower.includes("approval") || lower.includes("review")
                  ? "require_approval"
                  : "allow",
            description: policyText.trim(),
          },
          confidence: "medium",
          warnings: ["API unavailable; this is a local draft preview."],
        });
        setMessage("API unavailable. Draft policy is ready for local review.");
      } else {
        setFormError(caught instanceof Error ? caught.message : "Policy could not be parsed.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveParsed = async () => {
    if (!parsed) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved = await savePolicyText(policyText);
      onPolicySaved(saved);
      setParsed(null);
      setPolicyText("");
      setMessage("Policy saved and enforced for new actions.");
    } catch (caught) {
      onPolicySaved({
        id: policy?.id ?? "local-policy",
        businessId: policy?.businessId ?? "local-business",
        version: (policy?.version ?? 0) + 1,
        rules: [...(policy?.rules ?? []), parsed.rule as ApiPolicyRule],
      });
      setParsed(null);
      setPolicyText("");
      setMessage("Saved locally. It will sync when the API reconnects.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GUARDRAILS & TRUST</span>
          <h1>Permission policies</h1>
          <p>Teach PayPilot how to act — and where to stop.</p>
        </div>
        <Button
          onClick={() => {
            setPolicyText("");
            setParsed(null);
            setFormError(null);
          }}
        >
          <Plus size={15} /> New policy
        </Button>
      </div>
      {loading && <div className="data-status loading-status">Loading runtime policies…</div>}
      {error && (
        <div className="data-status error-status">
          Live policies unavailable. Changes will stay local until the API reconnects.
        </div>
      )}
      {message && <div className="data-status success-status">{message}</div>}
      {formError && <div className="data-status error-status">{formError}</div>}
      {saving && <div className="data-status loading-status">Saving policy changes…</div>}
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
              <span className="policy-count">{policy?.rules.length ?? 0} active</span>
            </div>
            <PolicyCard
              icon={<Send size={17} />}
              iconClass="purple"
              title="Email reminders"
              enabled={policies.reminders}
              onToggle={() => void toggle("reminders")}
              description="Max 2 reminders per client per week. Allowed hours: 09:00–18:00. Tone escalation capped at firm."
              tags={["Max 2 / client / week", "9am – 6pm", "Approval required"]}
            />
            <PolicyCard
              icon={<RefreshCw size={17} />}
              iconClass="orange"
              title="Refunds"
              enabled={policies.refunds}
              onToggle={() => void toggle("refunds")}
              description="Refunds up to $100 can be drafted. Anything higher needs your explicit approval."
              tags={["Up to $100", "Always approve over limit"]}
            />
            <PolicyCard
              icon={<Zap size={17} />}
              iconClass="teal"
              title="Autonomous actions"
              enabled={policies.spending}
              onToggle={() => void toggle("spending")}
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
            <div className="empty-state" style={{ margin: "14px 0" }}>
              <ShieldCheck size={20} />
              <strong>No policy violations</strong>
              <p>Account-backed events will appear here after the first sync.</p>
            </div>
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
            <Button
              variant="dark"
              className="full-button"
              onClick={() => void handleParse()}
              disabled={saving}
            >
              <Sparkles size={15} /> Parse policy
            </Button>
            {parsed && (
              <div className="parsed-state">
                <ShieldCheck size={14} />
                <span>
                  {parsed.rule.description} · {parsed.confidence} confidence
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleSaveParsed()}
                  disabled={saving}
                >
                  Save policy
                </Button>
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
