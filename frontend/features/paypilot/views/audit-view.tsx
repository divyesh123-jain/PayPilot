"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Code2,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { verifyAudit, type AuditVerifyResponse } from "@/frontend/lib/api";
import type { ApiAuditEvent } from "@/frontend/lib/api";

export function AuditView({
  events,
  loading,
  error,
}: {
  events: ApiAuditEvent[] | null;
  loading: boolean;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<AuditVerifyResponse | null>(null);
  const displayEvents = useMemo(() => {
    const source =
      events && events.length > 0
        ? events.map((event) => ({
            time: new Date(event.occurredAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            actor: event.actorType === "user" ? "Workspace member" : event.actorType,
            event: event.action.replaceAll(".", " · "),
            detail: `${event.outcome} · ${event.resourceType}${event.resourceId ? ` · ${event.resourceId}` : ""}`,
            tone:
              event.outcome === "rejected" || event.outcome === "failed"
                ? "red"
                : event.outcome === "proposed"
                  ? "purple"
                  : "teal",
            hash: event.id.slice(0, 8) + "…" + event.id.slice(-4),
          }))
        : [];
    return source.filter((event) =>
      `${event.event} ${event.detail} ${event.actor} ${event.hash}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [events, query]);
  const exportLog = () => {
    const text = displayEvents
      .map(
        (event) => `${event.time}\t${event.actor}\t${event.event}\t${event.detail}\t${event.hash}`
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`Time\tActor\tEvent\tDetail\tHash\n${text}`], { type: "text/plain;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "paypilot-audit-log.tsv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyAudit();
      setVerification(res);
    } catch {
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRUST CENTER · FULL HISTORY</span>
          <h1>Audit log</h1>
          <p>
            A cryptographic append-only trail of every observation, decision, policy check, and
            action.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={handleVerify} disabled={verifying}>
            <ShieldCheck size={15} /> {verifying ? "Verifying chain..." : "Verify hash chain"}
          </Button>
          <Button variant="secondary" onClick={exportLog}>
            <ArrowRight size={15} /> Export log
          </Button>
        </div>
      </div>

      {verification && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            background: "#ecfdf5",
            border: "1px solid #10b98140",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#065f46",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {verification.valid ? (
              <CheckCircle2 size={18} color="#059669" />
            ) : (
              <LockKeyhole size={18} color="#dc2626" />
            )}
            <div>
              <strong>
                {verification.valid ? "Cryptographic Chain Verified" : "Hash chain needs attention"}
              </strong>
              <div style={{ fontSize: "12px", color: "#047857" }}>
                {verification.valid
                  ? `All ${verification.checked} audited records validated against immutable SHA-256 parent hashes. Zero tamper detected.`
                  : `${verification.invalidIds.length} of ${verification.checked} records failed validation.`}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              background: "#d1fae5",
              padding: "4px 8px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            {verification.valid ? "SHA-256 VALID" : "CHECK FAILED"}
          </span>
        </div>
      )}

      <div className="audit-toolbar">
        <div className="search-input">
          <Search size={16} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events..."
          />
        </div>
        <span className="audit-filter">
          <Clock3 size={14} /> Last 30 days
        </span>
        <span className="audit-count">{displayEvents.length} events</span>
      </div>
      {loading && (
        <div className="data-status loading-status">Loading the append-only audit trail…</div>
      )}
      {error && (
        <div className="data-status error-status">
          Live audit history unavailable. Connect the API to load audit records.
        </div>
      )}

      <section className="panel audit-panel">
        <div className="audit-header">
          <span>EVENT & HASH</span>
          <span>ACTOR</span>
          <span>TIME</span>
        </div>
        {displayEvents.map((event) => (
          <div className="audit-row" key={`${event.time}-${event.event}`}>
            <span className={`audit-icon ${event.tone}`}>
              {event.tone === "red" ? (
                <LockKeyhole size={15} />
              ) : event.tone === "purple" ? (
                <Code2 size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
            </span>
            <div>
              <strong>{event.event}</strong>
              <p>
                {event.detail} ·{" "}
                <code style={{ fontSize: "11px", color: "#64748b" }}>{event.hash}</code>
              </p>
            </div>
            <span className="audit-actor">{event.actor}</span>
            <time>{event.time}</time>
            <Button variant="icon" aria-label={`Open ${event.event}`}>
              <ArrowRight size={14} />
            </Button>
          </div>
        ))}
        {displayEvents.length === 0 && (
          <div className="empty-state">
            <Search size={20} />
            <strong>No audit events found</strong>
            <span>Try a different search term.</span>
          </div>
        )}
      </section>
    </div>
  );
}
