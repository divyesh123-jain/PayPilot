import { MoreHorizontal } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { formatCurrency } from "@/frontend/lib/utils";
import type { BusinessProfile } from "@/frontend/features/paypilot/types";

export function ForecastChart({
  data,
  accent,
}: {
  data: BusinessProfile["forecast"];
  accent: string;
}) {
  const width = 760;
  const height = 235;
  const left = 12;
  const right = 8;
  const top = 18;
  const bottom = 30;
  const all = [...data.low, ...data.high];
  const min = Math.min(...all) * 0.96;
  const max = Math.max(...all) * 1.03;
  const x = (index: number) => left + (index / (data.days.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - min) / (max - min)) * (height - top - bottom);
  const line = data.days.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const low = data.low.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const high = [...data.high]
    .reverse()
    .map((value, index) => `${x(data.high.length - 1 - index)},${y(value)}`)
    .join(" ");
  return (
    <div className="forecast-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Cash flow forecast chart"
      >
        <defs>
          <linearGradient id="forecast-band" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={accent} stopOpacity=".16" />
            <stop offset="1" stopColor={accent} stopOpacity=".02" />
          </linearGradient>
          <linearGradient id="forecast-line" x1="0" x2="1">
            <stop offset="0" stopColor={accent} />
            <stop offset="1" stopColor="#5cd6bf" />
          </linearGradient>
        </defs>
        <line x1="0" x2={width} y1={y(min)} y2={y(min)} className="chart-grid" />
        <line
          x1="0"
          x2={width}
          y1={y((min + max) / 2)}
          y2={y((min + max) / 2)}
          className="chart-grid"
        />
        <line x1="0" x2={width} y1={y(max)} y2={y(max)} className="chart-grid" />
        <polygon points={`${low} ${high}`} fill="url(#forecast-band)" />
        <polyline
          points={line}
          fill="none"
          stroke="url(#forecast-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.days.map((value, index) => (
          <circle
            key={index}
            cx={x(index)}
            cy={y(value)}
            r={index === 0 ? 4 : 3.5}
            fill="var(--surface)"
            stroke={accent}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="chart-labels">
        {data.labels.map((label, index) => (
          <span key={label} className={index === 0 ? "current" : ""}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ForecastPanel({
  data,
  accent,
}: {
  data: BusinessProfile["forecast"];
  accent: string;
}) {
  return (
    <section className="panel forecast-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">CASH OUTLOOK</span>
          <h2>Forecast</h2>
        </div>
        <div className="forecast-legend">
          <span>
            <i className="legend-line" style={{ background: accent }} />
            Expected
          </span>
          <span>
            <i className="legend-band" />
            Confidence band
          </span>
          <button className="select-button">Next 30 days</button>
        </div>
      </div>
      <div className="forecast-summary">
        <div>
          <strong>{formatCurrency(data.days[data.days.length - 1])}</strong>
          <span>projected balance</span>
        </div>
        <div className="forecast-confidence">
          <span className="confidence-check">✓</span>
          <div>
            <strong>{data.confidence}</strong>
            <span>based on payment history</span>
          </div>
        </div>
      </div>
      <ForecastChart data={data} accent={accent} />
      <div className="forecast-narrative">
        <div className="narrative-avatar">✦</div>
        <p>
          <strong>Strategist’s take</strong>
          {data.narrative}
        </p>
        <Button variant="icon" aria-label="Forecast options">
          <MoreHorizontal size={16} />
        </Button>
      </div>
    </section>
  );
}
