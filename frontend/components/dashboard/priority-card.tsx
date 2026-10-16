import { ArrowRight, Zap } from "lucide-react";
import { Avatar } from "@/frontend/components/ui/avatar";
import type { BusinessProfile } from "@/frontend/features/paypilot/types";

export function PriorityCard({
  priority,
  accent,
  onOpen,
}: {
  priority: BusinessProfile["priorities"][number];
  accent: string;
  onOpen: () => void;
}) {
  return (
    <button className="priority-card" onClick={onOpen}>
      <div className="priority-card-top">
        <Avatar initials={priority.initials} color={accent} />
        <span className={`priority-status ${priority.status}`}>
          {priority.status === "urgent"
            ? "Needs action"
            : priority.status === "watch"
              ? "Monitor"
              : "On track"}
        </span>
        <ArrowRight size={15} />
      </div>
      <strong>{priority.name}</strong>
      <p>{priority.description}</p>
      <div className="priority-amount">{priority.amount}</div>
    </button>
  );
}

export function WhatIfCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="priority-card what-if-card" onClick={onOpen}>
      <div className="what-if-icon">
        <Zap size={17} />
      </div>
      <strong>What-if simulator</strong>
      <p>Model a decision before you make it.</p>
      <span>
        Try a scenario <ArrowRight size={14} />
      </span>
    </button>
  );
}
