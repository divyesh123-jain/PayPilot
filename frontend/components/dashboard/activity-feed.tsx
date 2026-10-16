import { Activity, ArrowRight, Check, MoreHorizontal, Send, Sparkles, Zap } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import type { BusinessProfile } from "@/frontend/features/paypilot/types";

function AgentAvatar({ role, color }: { role: string; color: string }) {
  const Icon = role === "Scout" ? Activity : role === "Strategist" ? Sparkles : Zap;
  return (
    <div className="agent-avatar" style={{ background: `${color}18`, color }}>
      <Icon size={16} />
    </div>
  );
}

export function ActivityFeed({
  business,
  onOpenAgent,
}: {
  business: BusinessProfile;
  onOpenAgent: () => void;
}) {
  return (
    <section className="panel activity-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">AGENT ACTIVITY</span>
          <h2>What needs your attention</h2>
        </div>
        <Button variant="link" onClick={onOpenAgent}>
          Open Ask PayPilot <ArrowRight size={15} />
        </Button>
      </div>
      <div className="activity-list">
        <div className="activity-item">
          <AgentAvatar role="Scout" color="#6c7bff" />
          <div className="activity-copy">
            <div>
              <strong>Scout detected a payment pattern</strong>
              <span className="activity-time">8 min ago</span>
            </div>
            <p>{business.alert.detail}</p>
            <div className="activity-actions">
              <Button variant="dark" size="sm" onClick={onOpenAgent}>
                Review insight
              </Button>
              <Button variant="ghost" onClick={onOpenAgent}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
        <div className="activity-item">
          <AgentAvatar role="Strategist" color="#48bcae" />
          <div className="activity-copy">
            <div>
              <strong>Forecast updated with new data</strong>
              <span className="activity-time">31 min ago</span>
            </div>
            <p>Expected collections rose 6.4% after yesterday’s completed payments.</p>
            <span className="activity-meta">
              <Check size={13} /> No action needed
            </span>
          </div>
        </div>
        <div className="activity-item">
          <AgentAvatar role="Executor" color="#d37bc9" />
          <div className="activity-copy">
            <div>
              <strong>One action is waiting for approval</strong>
              <span className="activity-time">2 hr ago</span>
            </div>
            <p>Drafted a personalized follow-up for the highest-priority account.</p>
            <Button variant="link" onClick={onOpenAgent}>
              Review draft <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AgentAvatarStack() {
  return (
    <div className="agent-orbit">
      <AgentAvatar role="Scout" color="#6c7bff" />
      <AgentAvatar role="Strategist" color="#48bcae" />
      <AgentAvatar role="Executor" color="#d37bc9" />
    </div>
  );
}
