"use client";

import { useState } from "react";
import { CheckCircle2, Clock, ExternalLink, Mail, Search, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";

export type SentMessage = {
  id: string;
  to: string;
  toEmail: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "queued" | "bounced";
  channel: "PayPal Invoicing v2" | "PayPilot Transactional";
  payLink: string;
  amount: string;
};

const initialSentMessages: SentMessage[] = [];

export function SentView() {
  const [messages] = useState<SentMessage[]>(initialSentMessages);
  const [selectedMessage, setSelectedMessage] = useState<SentMessage | null>(null);
  const [query, setQuery] = useState("");

  const filtered = messages.filter(
    (m) =>
      m.to.toLowerCase().includes(query.toLowerCase()) ||
      m.subject.toLowerCase().includes(query.toLowerCase()) ||
      m.toEmail.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="view-content sent-view">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OUTBOX & DELIVERY REPLAY</span>
          <h1>Sent Messages</h1>
          <p>
            Approved messages will appear here after a real account connection and an outbound
            delivery.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            background: "#f0fdf4",
            color: "#166534",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #bbf7d0",
          }}
        >
          <CheckCircle2 size={15} color="#16a34a" /> Approval required before delivery
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "16px",
          minHeight: "520px",
        }}
      >
        {/* Messages List Column */}
        <div
          className="panel"
          style={{ padding: "14px", display: "flex", flexDirection: "column" }}
        >
          <div className="search-input" style={{ marginBottom: "12px" }}>
            <Search size={15} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sent messages..."
              style={{ fontSize: "13px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div className="empty-state" style={{ margin: "20px 8px" }}>
                <Mail size={22} />
                <strong>No messages sent</strong>
                <p>
                  PayPilot keeps this outbox empty until you connect an account and approve a real
                  message.
                </p>
              </div>
            ) : (
              filtered.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: selectedMessage?.id === msg.id ? "#6366f1" : "#e2e8f0",
                    background: selectedMessage?.id === msg.id ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <strong style={{ fontSize: "13px" }}>{msg.to}</strong>
                    <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>
                      {msg.status.toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#1e293b",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {msg.subject}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    <span>{msg.channel}</span>
                    <span>{msg.sentAt.split("·")[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Preview Column */}
        <div className="panel" style={{ padding: "20px" }}>
          {selectedMessage ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "14px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "18px", margin: "0 0 6px" }}>{selectedMessage.subject}</h2>
                  <div style={{ fontSize: "13px", color: "#475569" }}>
                    <strong>To:</strong> {selectedMessage.to} &lt;{selectedMessage.toEmail}&gt;
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    <strong>From:</strong> {selectedMessage.from}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "#dcfce7",
                      color: "#166534",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    DELIVERED VIA {selectedMessage.channel.toUpperCase()}
                  </span>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    {selectedMessage.sentAt}
                  </div>
                </div>
              </div>

              {/* Email Content Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  fontFamily: "sans-serif",
                  lineHeight: "1.6",
                  fontSize: "14px",
                  color: "#1e293b",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedMessage.body}

                {/* PayPal Direct Payment Button */}
                <div
                  style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}
                >
                  <a
                    href={selectedMessage.payLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#0070ba",
                      color: "#fff",
                      padding: "10px 18px",
                      borderRadius: "20px",
                      fontWeight: 600,
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    Pay {selectedMessage.amount} with PayPal <ExternalLink size={14} />
                  </a>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                    Payment link and delivery metadata are shown only for account-backed messages.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              Select a message to inspect client view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
