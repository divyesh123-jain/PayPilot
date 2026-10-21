"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  MoreHorizontal,
  Send,
  Sparkles,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { AgentAvatarStack } from "@/frontend/components/dashboard/activity-feed";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Textarea } from "@/frontend/components/ui/textarea";
import type { BusinessProfile } from "../types";
import { askAgent, type AgentChatResponse, type ApiProposal } from "@/frontend/lib/api";

type Message = {
  id: string;
  role: "user" | "agent";
  agentName?: "Scout" | "Strategist" | "Executor";
  text: string;
  time: string;
  toolTrace?: readonly string[];
  proposals?: readonly any[];
};

export function AgentView({
  business,
  remoteProposals,
}: {
  business: BusinessProfile;
  remoteProposals: ApiProposal[] | null;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const prompts = [
    "What is my cash situation this week?",
    "Who should I follow up with first?",
    "Show me anything risky.",
  ];

  const submitQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: q,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await askAgent(q);
      const agentRole = /follow|reminder|priya/i.test(q)
        ? "Executor"
        : /risk|anomaly|threat/i.test(q)
          ? "Scout"
          : "Strategist";

      setMessages((prev) => [
        ...prev,
        {
          id: res.messageId || `agent-${Date.now()}`,
          role: "agent",
          agentName: agentRole,
          text: res.answer,
          time: "Just now",
          toolTrace: res.toolTrace,
          proposals: res.proposals,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-error-${Date.now()}`,
          role: "agent",
          agentName: "Strategist",
          text: "I can answer once the PayPilot API is connected and your account data has finished syncing.",
          time: "Just now",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="view-content agent-view">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR FINANCIAL TEAM</span>
          <h1>Ask PayPilot</h1>
          <p>Ask the team anything. Every answer is grounded in your payment data.</p>
        </div>
        <div className="agent-live-pill">
          <span className="live-dot" /> 3 agents online
        </div>
      </div>
      <div className="agent-layout">
        <Card className="agent-chat">
          <div className="chat-header">
            <AgentAvatarStack />
            <div>
              <strong>PayPilot intelligence</strong>
              <span>Scout · Strategist · Executor</span>
            </div>
            <Button variant="icon" aria-label="Chat options">
              <MoreHorizontal size={16} />
            </Button>
          </div>
          <div className="chat-body">
            {messages.length === 0 && (
              <div className="empty-state" style={{ margin: "24px 0" }}>
                <Sparkles size={22} />
                <strong>No account context yet</strong>
                <p>
                  Connect PayPal and sync your records. Answers will be grounded in your workspace
                  data.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="chat-message-label">
                  {msg.role === "agent" && <span className="message-agent-dot" />}
                  {msg.role === "agent" ? msg.agentName : "You"} <time>{msg.time}</time>
                </div>
                <p>{msg.text}</p>
                {msg.toolTrace && msg.toolTrace.length > 0 && <ToolTrace items={msg.toolTrace} />}
                {msg.proposals && msg.proposals.length > 0 && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        color: "#475569",
                      }}
                    >
                      <ShieldAlert size={14} color="#6366f1" /> Staged in Approval Queue
                    </div>
                    <div style={{ color: "#64748b", marginTop: "2px" }}>
                      Proposal {msg.proposals[0].id} requires human approval before external PayPal
                      call.
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-message agent">
                <div className="chat-message-label">
                  <span className="message-agent-dot" /> Strategist <time>Thinking...</time>
                </div>
                <p style={{ color: "#64748b" }}>
                  Consulting Scout and running policy verification...
                </p>
              </div>
            )}
          </div>
          <div className="suggestion-row">
            {prompts.map((item) => (
              <button key={item} onClick={() => submitQuestion(item)} disabled={loading}>
                {item}
              </button>
            ))}
          </div>
          <div className="chat-composer">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(prompt);
                }
              }}
              placeholder="Ask about your cash, overdue invoices, or risk..."
              disabled={loading}
            />
            <Button
              variant="icon"
              className="send-button"
              onClick={() => submitQuestion(prompt)}
              aria-label="Send message"
              disabled={loading || !prompt.trim()}
            >
              <Send size={17} />
            </Button>
            <span>↵ to send · shift + ↵ for new line</span>
          </div>
        </Card>
        <aside className="agent-side">
          <Card className="team-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">THE TEAM</span>
                <h2>Specialists</h2>
              </div>
            </div>
            <Specialist
              icon={<Activity size={16} />}
              title="Scout"
              detail="Monitors & detects"
              status="Online"
            />
            <Specialist
              icon={<Sparkles size={16} />}
              title="Strategist"
              detail="Analyzes & predicts"
              status="Online"
            />
            <Specialist
              icon={<Zap size={16} />}
              title="Executor"
              detail="Acts with approval"
              status="Waiting"
              waiting
            />
          </Card>
          <Card className="draft-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">WAITING FOR YOU</span>
                <h2>Approval queue</h2>
              </div>
              <span className="queue-count">
                {remoteProposals?.filter((proposal) => proposal.status === "proposed").length ?? 0}
              </span>
            </div>
            {(remoteProposals?.filter((proposal) => proposal.status === "proposed").length ?? 0) >
            0 ? (
              <div className="draft-item">
                <div className="draft-icon">
                  <Send size={15} />
                </div>
                <div>
                  <strong>Proposal ready</strong>
                  <p>Review it in the Inbox before any external action.</p>
                </div>
                <ArrowRight size={15} />
              </div>
            ) : (
              <div className="empty-state" style={{ margin: "14px 0" }}>
                <strong>Queue is empty</strong>
                <p>Approved proposals will appear here.</p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ToolTrace({ items }: { items: readonly string[] }) {
  return (
    <div className="tool-trace">
      <div className="tool-trace-title">AGENT REASONING TRACE</div>
      {items.map((item, index) => (
        <span key={index} className="trace-item">
          {item}
        </span>
      ))}
    </div>
  );
}

function Specialist({
  icon,
  title,
  detail,
  status,
  waiting,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  status: string;
  waiting?: boolean;
}) {
  return (
    <div className="specialist-row">
      <span className="specialist-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <span className={`specialist-status ${waiting ? "waiting" : ""}`}>{status}</span>
    </div>
  );
}
