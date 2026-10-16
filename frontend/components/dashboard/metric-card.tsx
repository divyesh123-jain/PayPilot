import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 100},${30 - ((value - min) / range) * 25}`
    )
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  hint,
  accent,
  chart,
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  hint: string;
  accent: string;
  chart: number[];
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span>{label}</span>
        <Button variant="icon" className="card-more" aria-label={`More options for ${label}`}>
          <MoreHorizontal size={16} />
        </Button>
      </div>
      <div className="metric-value">{value}</div>
      <div className={`metric-change ${trend === "up" ? "positive" : "negative"}`}>
        {trend === "up" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        {change}
        <span>{hint}</span>
      </div>
      <Sparkline values={chart} color={accent} />
    </div>
  );
}

export function AgentHealthCard({ accent }: { accent: string }) {
  return (
    <div className="metric-card mini-metric-card">
      <div className="metric-card-header">
        <span>Agent health</span>
        <span className="health-dot" />
      </div>
      <div className="metric-value metric-status">Excellent</div>
      <div className="metric-subtitle">3 agents · 0 errors</div>
      <div className="mini-bars" aria-hidden="true">
        {[42, 56, 48, 71, 63, 81, 74, 91, 78, 88].map((height, index) => (
          <span
            key={index}
            style={{ height: `${height}%`, background: index === 8 ? accent : `${accent}45` }}
          />
        ))}
      </div>
    </div>
  );
}
