"use client";

import { ArrowDownRight, ArrowUpRight, CalendarDays, Info, SlidersHorizontal } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { ForecastPanel } from "@/frontend/components/dashboard/forecast-chart";
import type { ApiForecast } from "@/frontend/lib/api";
import type { BusinessProfile } from "../types";

export function ForecastView({
  business,
  remoteForecast,
  loading,
  error,
  onWhatIf,
}: {
  business: BusinessProfile;
  remoteForecast: ApiForecast | null;
  loading: boolean;
  error: string | null;
  onWhatIf: () => void;
}) {
  const forecast = remoteForecast && remoteForecast.points.length > 1
    ? {
        days: remoteForecast.points.map((point) => point.expectedBalanceCents / 100),
        labels: remoteForecast.points.map((point) => new Date(`${point.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
        low: remoteForecast.points.map((point) => point.lowBalanceCents / 100),
        high: remoteForecast.points.map((point) => point.highBalanceCents / 100),
        narrative: remoteForecast.narrative,
        confidence: `${remoteForecast.points.at(-1)?.confidencePercent ?? 0}% confidence`,
      }
    : business.forecast;
  const first = forecast.days[0] ?? 0;
  const last = forecast.days[forecast.days.length - 1] ?? 0;
  const range = last - first;
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">STRATEGIST · CASH MODEL</span>
          <h1>Forecast</h1>
          <p>Know what your cash can carry before the week asks for it.</p>
        </div>
        <Button onClick={onWhatIf}>
          <SlidersHorizontal size={15} /> Run what-if
        </Button>
      </div>
      <div className="forecast-stat-grid">
        <ForecastStat
          label="Expected balance"
          value={`$${last.toLocaleString()}`}
          detail={forecast.confidence}
          tone="teal"
        />
        <ForecastStat
          label="7-day movement"
          value={`${range >= 0 ? "+" : "−"}$${Math.abs(range).toLocaleString()}`}
          detail="vs. today"
          tone={range >= 0 ? "teal" : "red"}
        />
        <ForecastStat
          label="Coverage window"
          value="14 days"
          detail="comfortable buffer"
          tone="purple"
        />
      </div>
      <div className="forecast-layout">
        <ForecastPanel data={forecast} accent={business.accent} />
        <Card className="forecast-notes">
          <div className="panel-header">
            <div>
              <span className="eyebrow">MODEL NOTES</span>
              <h2>What changed</h2>
            </div>
            <Info size={15} />
          </div>
          <Note
            icon={<CalendarDays size={15} />}
            title="Upcoming obligation"
            detail={remoteForecast?.bufferBreached ? "The projected balance falls below your comfort buffer." : "The projected balance stays above your comfort buffer."}
          />
          <Note
            icon={range >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            title="Confidence"
            detail={forecast.confidence + " based on recent payment timing."}
          />
          <Button variant="secondary" className="full-button" onClick={onWhatIf}>
            Explore a scenario <SlidersHorizontal size={14} />
          </Button>
        </Card>
      </div>
      {loading && <div className="data-status loading-status">Loading the cash model…</div>}
      {error && <div className="data-status error-status">Live forecast unavailable. Showing the local scenario model.</div>}
    </div>
  );
}

function ForecastStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="forecast-stat panel">
      <span className={`stat-dot ${tone}`} />
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Note({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="forecast-note">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
