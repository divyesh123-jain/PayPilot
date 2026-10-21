"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Info,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { ForecastPanel } from "@/frontend/components/dashboard/forecast-chart";
import type { ApiForecast } from "@/frontend/lib/api";
import type { BusinessProfile } from "../types";

export type Obligation = {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  recurrence: "Monthly" | "One-time" | "Weekly";
};

const defaultObligations: Obligation[] = [];

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
  const [obligations, setObligations] = useState<Obligation[]>(defaultObligations);
  const [newObligationName, setNewObligationName] = useState("");
  const [newObligationAmount, setNewObligationAmount] = useState("");
  const [newObligationDate, setNewObligationDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const totalObligations = obligations.reduce((acc, ob) => acc + ob.amount, 0);

  const forecast =
    remoteForecast && remoteForecast.points.length > 1
      ? {
          days: remoteForecast.points.map((point) => point.expectedBalanceCents / 100),
          labels: remoteForecast.points.map((point) =>
            new Date(`${point.date}T00:00:00Z`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          ),
          low: remoteForecast.points.map((point) => point.lowBalanceCents / 100),
          high: remoteForecast.points.map((point) => point.highBalanceCents / 100),
          narrative: remoteForecast.narrative,
          confidence: `${remoteForecast.points.at(-1)?.confidencePercent ?? 0}% confidence`,
        }
      : business.forecast;
  const first = forecast.days[0];
  const last = forecast.days[forecast.days.length - 1];
  const hasForecast = first !== undefined && last !== undefined && forecast.days.length > 1;
  const range = hasForecast ? last - first : 0;

  const handleAddObligation = () => {
    if (!newObligationName || !newObligationAmount) return;
    const item: Obligation = {
      id: `ob-${Date.now()}`,
      name: newObligationName,
      amount: Number(newObligationAmount),
      dueDate: newObligationDate || "Next week",
      recurrence: "Monthly",
    };
    setObligations((prev) => [...prev, item]);
    setNewObligationName("");
    setNewObligationAmount("");
    setNewObligationDate("");
    setShowAddForm(false);
  };

  const handleRemoveObligation = (id: string) => {
    setObligations((prev) => prev.filter((o) => o.id !== id));
  };

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
          value={hasForecast ? `$${last.toLocaleString()}` : "—"}
          detail={forecast.confidence}
          tone="teal"
        />
        <ForecastStat
          label="7-day movement"
          value={
            hasForecast ? `${range >= 0 ? "+" : "−"}$${Math.abs(range).toLocaleString()}` : "—"
          }
          detail="vs. today"
          tone={range >= 0 ? "teal" : "red"}
        />
        <ForecastStat
          label="Upcoming obligations"
          value={`$${totalObligations.toLocaleString()}`}
          detail={`${obligations.length} scheduled liabilities`}
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
            detail={
              remoteForecast?.bufferBreached
                ? "The projected balance falls below your comfort buffer."
                : hasForecast
                  ? "No comfort-buffer breach is currently projected."
                  : "Connect PayPal to calculate projected obligations."
            }
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

      {/* Scheduled Obligations Section (Gap #5) */}
      <section className="panel" style={{ marginTop: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
          }}
        >
          <div>
            <span className="eyebrow">SCHEDULED OBLIGATIONS & LIABILITIES</span>
            <h2 style={{ fontSize: "16px", margin: "2px 0 0" }}>Planned Expenses</h2>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Subtracted from Monte Carlo cash simulation to detect projected shortfall dates early.
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> Add obligation
          </Button>
        </div>

        {showAddForm && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "14px",
            }}
          >
            <Input
              placeholder="Obligation name (e.g. Contractor payout)"
              value={newObligationName}
              onChange={(e) => setNewObligationName(e.target.value)}
              style={{ flex: 2 }}
            />
            <Input
              type="number"
              placeholder="Amount ($)"
              value={newObligationAmount}
              onChange={(e) => setNewObligationAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <Input
              type="date"
              value={newObligationDate}
              onChange={(e) => setNewObligationDate(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button size="sm" onClick={handleAddObligation}>
              Save
            </Button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {obligations.map((ob) => (
            <div
              key={ob.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
              }}
            >
              <div>
                <strong>{ob.name}</strong>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  Due: {ob.dueDate} · {ob.recurrence}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                  ${ob.amount.toLocaleString()}
                </span>
                <Button
                  variant="icon"
                  onClick={() => handleRemoveObligation(ob.id)}
                  aria-label="Remove obligation"
                >
                  <Trash2 size={14} color="#94a3b8" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {loading && <div className="data-status loading-status">Loading the cash model…</div>}
      {error && (
        <div className="data-status error-status">
          Live forecast unavailable. Connect the API to calculate from account data.
        </div>
      )}
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
