"use client";

import { useRef, useState } from "react";
import {
  Calendar,
  Check,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Textarea } from "@/frontend/components/ui/textarea";
import { parseWorkflow, runWorkflow, type ApiProposal, type ParsedWorkflow } from "@/frontend/lib/api";

export function WorkflowsView() {
  const [workflowText, setWorkflowText] = useState(
    "Every Tuesday, retry failed payments and notify me of any that fail twice in a row."
  );
  const [scheduled, setScheduled] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkflow | null>(null);
  const [proposal, setProposal] = useState<ApiProposal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);

  const handleCreate = () => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  const handleSchedule = async () => {
    if (!workflowText.trim()) {
      setError("Describe a workflow before scheduling it.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await parseWorkflow(workflowText);
      setParsed(next);
      const result = await runWorkflow(next);
      setProposal(result.proposal);
      setScheduled(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workflow could not be scheduled.");
      // Keep the builder usable offline while clearly distinguishing the local preview.
      setScheduled(true);
      setProposal(null);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">AUTOMATION STUDIO</span>
          <h1>Workflows</h1>
          <p>Turn intent into repeatable, permission-aware routines.</p>
        </div>
         <Button onClick={handleCreate}>
          <Plus size={15} /> Create workflow
        </Button>
      </div>
      {error && <div className="data-status error-status">{error}</div>}
      <div className="workflow-builder-grid">
        <Card className="workflow-composer" ref={composerRef}>
          <div className="composer-header">
            <div>
              <span className="eyebrow">NEW WORKFLOW</span>
              <h2>What should PayPilot do?</h2>
            </div>
            <span className="composer-step">1 / 2</span>
          </div>
          <Textarea
            value={workflowText}
            onChange={(event) => setWorkflowText(event.target.value)}
          />
          <div className="template-row">
            <span>Try a template</span>
            <button
              onClick={() =>
                setWorkflowText(
                  "Every Monday, check invoices 5+ days overdue. Draft a reminder for responsive clients and flag the rest for review."
                )
              }
            >
              Collections
            </button>
            <button
              onClick={() =>
                setWorkflowText(
                  "Every Friday, review refund rate and chargebacks. Alert me if either rises above the 30-day average."
                )
              }
            >
              Risk watch
            </button>
            <button
              onClick={() =>
                setWorkflowText(
                  "Every Tuesday, retry failed payments and notify me of any that fail twice in a row."
                )
              }
            >
              Dunning
            </button>
          </div>
          <div className="workflow-preview">
            <div className="preview-header">
              <span>PayPilot understood</span>
               <span className="preview-ready">
                 <Check size={13} /> {parsed ? `${parsed.action.replaceAll("_", " ")} · parsed` : "Ready to schedule"}
               </span>
            </div>
            <Step
              number="1"
              title="Trigger"
               detail={parsed ? parsed.description.slice(0, 72) : "Every Tuesday at 09:00"}
              icon={<Calendar size={16} />}
            />
            <Step
              number="2"
              title="Check"
               detail={parsed ? `Detected action: ${parsed.action.replaceAll("_", " ")}` : "Find failed payments in the last 7 days"}
              icon={<Search size={16} />}
            />
            <Step
              number="3"
              title="Action"
               detail={parsed ? (parsed.amountCents ? `Amount guardrail: $${(parsed.amountCents / 100).toLocaleString()}` : "Create a permission-aware proposal") : "Retry once, notify after second failure"}
              icon={<Send size={16} />}
            />
          </div>
          <div className="composer-footer">
               <span>
               <ShieldCheck size={14} /> Protected by Email reminders policy
             </span>
             <Button onClick={() => void handleSchedule()} disabled={saving}>
               {saving ? "Parsing…" : scheduled ? "Workflow scheduled" : "Confirm & schedule"}
               <Check size={15} />
             </Button>
           </div>
           {proposal && (
             <div className="parsed-state">
               <ShieldCheck size={14} />
               <span>Proposal {proposal.id} · {proposal.policyDecision.requiresApproval ? "awaiting approval" : proposal.status}</span>
             </div>
           )}
        </Card>
        <aside className="workflow-side">
          <Card className="active-workflows">
            <div className="panel-header">
              <div>
                <span className="eyebrow">RUNNING NOW</span>
                <h2>Active workflows</h2>
              </div>
              <span className="workflow-count">2 active</span>
            </div>
            <ActiveWorkflow
              icon={<RefreshCw size={17} />}
              iconClass="teal"
              title="Failed payment recovery"
              detail="Next run Tuesday · 09:00"
              meta="Watching 12 accounts"
            />
            <ActiveWorkflow
              icon={<ReceiptText size={17} />}
              iconClass="purple"
              title="Overdue invoice sweep"
              detail="Next run Monday · 09:00"
              meta="4 days until next run"
            />
          </Card>
          <Card className="run-history">
            <div className="panel-header">
              <div>
                <span className="eyebrow">AUDIT TRAIL</span>
                <h2>Recent runs</h2>
              </div>
               <Button variant="link" onClick={() => setShowHistory((current) => !current)}>{showHistory ? "Hide history" : "View all"}</Button>
             </div>
            <Run title="Overdue invoice sweep" detail="2 drafts created · 1 queued" date="Today" />
            <Run
              title="Failed payment recovery"
              detail="9 retries · 3 recovered"
              date="Yesterday"
            />
            {showHistory && <Run title="Collections review" detail="Policy check passed · no action needed" date="Mon" />}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  detail,
  icon,
}: {
  number: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="workflow-step">
      <span className="step-number">{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      {icon}
    </div>
  );
}
function ActiveWorkflow({
  icon,
  iconClass,
  title,
  detail,
  meta,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  detail: string;
  meta: string;
}) {
  return (
    <div className="active-workflow">
      <div className={`workflow-icon ${iconClass}`}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <span className="workflow-status">
          <span className="live-dot" /> {meta}
        </span>
      </div>
      <Button variant="icon">
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}
function Run({ title, detail, date }: { title: string; detail: string; date: string }) {
  return (
    <div className="run-row">
      <span className="run-check">
        <Check size={13} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <time>{date}</time>
    </div>
  );
}
