"use client";

import { ArrowRight, CheckCircle2, Clock3, Code2, LockKeyhole, Search } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";

const events = [
  { time: "Today · 10:42", actor: "Executor", event: "Drafted reminder for Priya Sharma", detail: "Approval required · email_reminders.v2", tone: "purple" },
  { time: "Today · 10:41", actor: "Policy engine", event: "Blocked third reminder", detail: "email_reminders · max 2 / client / week", tone: "red" },
  { time: "Today · 09:12", actor: "Strategist", event: "Updated cash forecast", detail: "84% confidence · 8 data points", tone: "teal" },
  { time: "Yesterday · 16:08", actor: "Alex Morgan", event: "Approved failed payment workflow", detail: "workflow_7F3A · scheduled Tuesday 09:00", tone: "blue" },
  { time: "Yesterday · 14:23", actor: "Scout", event: "Synced PayPal Sandbox", detail: "126 transactions · 0 errors", tone: "teal" },
];

export function AuditView() {
  return <div className="view-content"><div className="page-heading"><div><span className="eyebrow">TRUST CENTER · FULL HISTORY</span><h1>Audit log</h1><p>A readable trail of every observation, decision, policy check, and action.</p></div><Button variant="secondary"><ArrowRight size={15} /> Export log</Button></div><div className="audit-toolbar"><div className="search-input"><Search size={16} /><Input placeholder="Search events..." /></div><span className="audit-filter"><Clock3 size={14} /> Last 30 days</span><span className="audit-count">126 events</span></div><section className="panel audit-panel"><div className="audit-header"><span>EVENT</span><span>ACTOR</span><span>TIME</span></div>{events.map((event) => <div className="audit-row" key={`${event.time}-${event.event}`}><span className={`audit-icon ${event.tone}`}>{event.tone === "red" ? <LockKeyhole size={15} /> : event.tone === "purple" ? <Code2 size={15} /> : <CheckCircle2 size={15} />}</span><div><strong>{event.event}</strong><p>{event.detail}</p></div><span className="audit-actor">{event.actor}</span><time>{event.time}</time><Button variant="icon" aria-label={`Open ${event.event}`}><ArrowRight size={14} /></Button></div>)}</section></div>;
}
