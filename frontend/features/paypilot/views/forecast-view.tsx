"use client";

import { ArrowDownRight, ArrowUpRight, CalendarDays, Info, SlidersHorizontal } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { ForecastPanel } from "@/frontend/components/dashboard/forecast-chart";
import type { BusinessProfile } from "../types";

export function ForecastView({ business, onWhatIf }: { business: BusinessProfile; onWhatIf: () => void }) {
  const first = business.forecast.days[0];
  const last = business.forecast.days[business.forecast.days.length - 1];
  const range = last - first;
  return (
    <div className="view-content">
      <div className="page-heading"><div><span className="eyebrow">STRATEGIST · CASH MODEL</span><h1>Forecast</h1><p>Know what your cash can carry before the week asks for it.</p></div><Button onClick={onWhatIf}><SlidersHorizontal size={15} /> Run what-if</Button></div>
      <div className="forecast-stat-grid">
        <ForecastStat label="Expected balance" value={`$${last.toLocaleString()}`} detail={business.forecast.confidence} tone="teal" />
        <ForecastStat label="7-day movement" value={`${range >= 0 ? "+" : "−"}$${Math.abs(range).toLocaleString()}`} detail="vs. today" tone={range >= 0 ? "teal" : "red"} />
        <ForecastStat label="Coverage window" value="14 days" detail="comfortable buffer" tone="purple" />
      </div>
      <div className="forecast-layout">
        <ForecastPanel data={business.forecast} accent={business.accent} />
        <Card className="forecast-notes"><div className="panel-header"><div><span className="eyebrow">MODEL NOTES</span><h2>What changed</h2></div><Info size={15} /></div><Note icon={<CalendarDays size={15} />} title="Upcoming obligation" detail="Thursday · $3,800 expense is covered in the base case." /><Note icon={range >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />} title="Confidence" detail={business.forecast.confidence + " based on recent payment timing."} /><Button variant="secondary" className="full-button" onClick={onWhatIf}>Explore a scenario <SlidersHorizontal size={14} /></Button></Card>
      </div>
    </div>
  );
}

function ForecastStat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className="forecast-stat panel"><span className={`stat-dot ${tone}`} /><span className="eyebrow">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Note({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="forecast-note"><span>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div></div>;
}
