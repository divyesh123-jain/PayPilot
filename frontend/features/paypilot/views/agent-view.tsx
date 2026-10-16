"use client";

import { useState } from "react";
import { Activity, ArrowRight, Check, MoreHorizontal, Send, Sparkles, Zap } from "lucide-react";
import { AgentAvatarStack } from "@/frontend/components/dashboard/activity-feed";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Textarea } from "@/frontend/components/ui/textarea";
import type { BusinessProfile } from "../types";

export function AgentView({ business }: { business: BusinessProfile }) {
  const [prompt, setPrompt] = useState("");
  const [sent, setSent] = useState(false);
  const prompts = [
    "What is my cash situation this week?",
    "Who should I follow up with first?",
    "Show me anything risky.",
  ];
  const submit = () => {
    if (prompt.trim()) setSent(true);
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
            <Button variant="icon">
              <MoreHorizontal size={16} />
            </Button>
          </div>
          <div className="chat-body">
            <div className="chat-message agent">
              <div className="chat-message-label">
                <span className="message-agent-dot" /> Strategist <time>Just now</time>
              </div>
              <p>
                Good morning, Alex. I’ve been monitoring <strong>{business.name}</strong>.{" "}
                <strong>{business.alert.title}</strong> — I have a plan ready when you are.
              </p>
              <ToolTrace items={["PayPal Sandbox · 126 transactions", "Policy engine · 3 active rules", "Forecast model · 84% confidence"]} />
              <div className="insight-card">
                <div className="insight-card-header">
                  <span>
                    <Sparkles size={14} /> Recommended next move
                  </span>
                  <span className="insight-confidence">{business.forecast.confidence}</span>
                </div>
                <strong>{business.alert.action}</strong>
                <p>{business.alert.detail}</p>
                <Button variant="dark" size="sm" onClick={() => setPrompt("Show me the full plan")}>
                  Show full plan <ArrowRight size={14} />
                </Button>
              </div>
            </div>
            {sent && (
              <div className="chat-message user">
                <div className="chat-message-label">
                  You <time>Just now</time>
                </div>
                <p>{prompt}</p>
              </div>
            )}
            {sent && (
              <div className="chat-message agent">
                <div className="chat-message-label">
                  <span className="message-agent-dot" /> Scout <time>Just now</time>
                </div>
                <p>
                  I found <strong>3 relevant signals</strong> across your latest PayPal activity.
                  The most important is the {business.priorities[0].description.toLowerCase()}. I’ve
                  added it to your priority queue and kept all actions in draft until you approve
                  them.
                </p>
                <ToolTrace items={["Scout · 3 signals matched", "Strategist · priority ranked", "Executor · draft held for approval"]} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSent(false);
                    setPrompt("");
                  }}
                >
                  Start another question
                </Button>
              </div>
            )}
          </div>
          <div className="suggestion-row">
            {prompts.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setPrompt(item);
                  setSent(true);
                }}
              >
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
                  submit();
                }
              }}
              placeholder="Ask about your payments..."
            />
            <Button
              variant="icon"
              className="send-button"
              onClick={submit}
              aria-label="Send message"
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
              <span className="queue-count">1</span>
            </div>
            <div className="draft-item">
              <div className="draft-icon">
                <Send size={15} />
              </div>
              <div>
              <strong>Reminder to Priya Sharma</strong>
                <p>Firm tone · Drafted 2 hr ago</p>
              </div>
              <Button variant="icon">
                <ArrowRight size={15} />
              </Button>
            </div>
            <Button variant="secondary" className="full-button">
              Review all drafts
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ToolTrace({ items }: { items: string[] }) {
  return <div className="tool-trace"><span className="tool-trace-label">TOOL TRACE</span>{items.map((item, index) => <span className="tool-trace-item" key={item}><span className="tool-trace-dot" />{item}{index < items.length - 1 && <span className="tool-trace-arrow">→</span>}</span>)}</div>;
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
      <div
        className="agent-avatar"
        style={{
          background: waiting ? "#fff5e4" : "#e8f7f3",
          color: waiting ? "#bf9252" : "#4aaa95",
        }}
      >
        {icon}
      </div>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <span className="specialist-status">{status}</span>
    </div>
  );
}
