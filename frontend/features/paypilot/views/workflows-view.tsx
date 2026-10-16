"use client";

import { useState } from "react";
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

export function WorkflowsView() {
  const [workflowText, setWorkflowText] = useState(
    "Every Tuesday, retry failed payments and notify me of any that fail twice in a row."
  );
  const [scheduled, setScheduled] = useState(false);
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">AUTOMATION STUDIO</span>
          <h1>Workflows</h1>
          <p>Turn intent into repeatable, permission-aware routines.</p>
        </div>
        <Button onClick={() => setScheduled(true)}>
          <Plus size={15} /> Create workflow
        </Button>
      </div>
      <div className="workflow-builder-grid">
        <Card className="workflow-composer">
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
                <Check size={13} /> Ready to schedule
              </span>
            </div>
            <Step
              number="1"
              title="Trigger"
              detail="Every Tuesday at 09:00"
              icon={<Calendar size={16} />}
            />
            <Step
              number="2"
              title="Check"
              detail="Find failed payments in the last 7 days"
              icon={<Search size={16} />}
            />
            <Step
              number="3"
              title="Action"
              detail="Retry once, notify after second failure"
              icon={<Send size={16} />}
            />
          </div>
          <div className="composer-footer">
            <span>
              <ShieldCheck size={14} /> Protected by Email reminders policy
            </span>
            <Button onClick={() => setScheduled(true)}>
              {scheduled ? "Workflow scheduled" : "Confirm & schedule"}
              <Check size={15} />
            </Button>
          </div>
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
              <Button variant="link">View all</Button>
            </div>
            <Run title="Overdue invoice sweep" detail="2 drafts created · 1 queued" date="Today" />
            <Run
              title="Failed payment recovery"
              detail="9 retries · 3 recovered"
              date="Yesterday"
            />
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
