"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Download,
  MoreHorizontal,
  Search,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/frontend/components/ui/dialog";
import { AlertBanner } from "@/frontend/components/dashboard/alert-banner";
import { ActivityFeed } from "@/frontend/components/dashboard/activity-feed";
import { ForecastPanel } from "@/frontend/components/dashboard/forecast-chart";
import { AgentHealthCard, MetricCard } from "@/frontend/components/dashboard/metric-card";
import { PriorityCard, WhatIfCard } from "@/frontend/components/dashboard/priority-card";
import { formatCurrency } from "@/frontend/lib/utils";
import { whatIfScenarios } from "../data";
import type { BusinessProfile, ViewKey } from "../types";

function SectionHeader({
  kicker,
  title,
  action,
  onAction,
}: {
  kicker: string;
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="section-header">
      <span className="eyebrow">{kicker}</span>
      <div className="section-title-row">
        <h2>{title}</h2>
        <Button variant="link" onClick={onAction}>
          {action}
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

export function OverviewView({
  business,
  onNavigate,
}: {
  business: BusinessProfile;
  onNavigate: (view: ViewKey) => void;
}) {
  const whatIf = whatIfScenarios.freelancer;
  const [discount, setDiscount] = useState(whatIf.discount);
  const simulated = Math.round(whatIf.outstanding * (1 - discount / 100));
  return (
    <div className="view-content overview-view">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">WEDNESDAY, OCTOBER 15, 2026</span>
          <h1>
            Good morning, Alex <span className="wave">✦</span>
          </h1>
          <p>
            Here’s the financial pulse for <strong>{business.name}</strong>.
          </p>
        </div>
        <div className="welcome-actions">
          <Button variant="secondary" onClick={() => onNavigate("transactions")}>
            <Download size={15} /> Export report
          </Button>
          <Button onClick={() => onNavigate("ask")}>
            <SparkleIcon /> Ask PayPilot
          </Button>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AlertBanner
          data={business.alert}
          onAction={() => onNavigate(business.alert.tone === "red" ? "ask" : "workflows")}
        />
      </motion.div>
      <motion.div
        className="metrics-grid"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {[
          <MetricCard
            key="expected"
            {...business.metric}
            accent={business.accent}
            chart={[35, 40, 38, 50, 47, 62, 65, 74]}
          />,
          <MetricCard
            key="collected"
            label="Collected"
            value={business.collected}
            change="73%"
            trend="up"
            hint="of expected"
            accent="#4bbcae"
            chart={[31, 38, 44, 42, 57, 62, 70, 77]}
          />,
          <MetricCard
            key="attention"
            label="Needs attention"
            value={business.outstanding}
            change="3 items"
            trend="down"
            hint="in your queue"
            accent="#ee9071"
            chart={[75, 68, 72, 58, 60, 52, 43, 35]}
          />,
          <AgentHealthCard key="health" accent={business.accent} />,
        ].map((card) => (
          <motion.div
            key={card.key}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          >
            {card}
          </motion.div>
        ))}
      </motion.div>
      <div className="dashboard-two-col">
        <ForecastPanel data={business.forecast} accent={business.accent} />
        <ActivityFeed business={business} onOpenAgent={() => onNavigate("ask")} />
      </div>
      <section className="priorities-section">
        <SectionHeader
          kicker="PRIORITIZED FOR YOU"
          title="Your money, in order"
          action="View all activity"
          onAction={() => onNavigate("transactions")}
        />
        <div className="priority-grid">
          {business.priorities.map((priority) => (
            <motion.div key={priority.name} whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
              <PriorityCard
                priority={priority}
                accent={business.accent}
                onOpen={() => onNavigate("ask")}
              />
            </motion.div>
          ))}
          <Dialog>
            <DialogTrigger asChild>
              <WhatIfCard onOpen={() => undefined} />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <div>
                  <span className="eyebrow">DECISION LAB</span>
                  <DialogTitle>Should I offer a discount?</DialogTitle>
                </div>
              </DialogHeader>
              <p className="modal-intro">
                Compare the expected value of a fast, certain payment vs. waiting on a late invoice.
              </p>
              <div className="scenario-box">
                <div className="scenario-top">
                  <span>Priya Sharma · outstanding invoice</span>
                  <strong>{formatCurrency(whatIf.outstanding)}</strong>
                </div>
                <label htmlFor="discount">
                  Discount offered <b>{discount}%</b>
                </label>
                <input
                  id="discount"
                  type="range"
                  min="0"
                  max="20"
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value))}
                  style={{ accentColor: business.accent }}
                />
                <div className="range-labels">
                  <span>0%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
              </div>
              <div className="compare-grid">
                <div>
                  <span>Fast payment</span>
                  <strong>{formatCurrency(simulated)}</strong>
                  <small>certain · today</small>
                </div>
                <div className="vs">vs.</div>
                <div>
                  <span>Wait 7 more days</span>
                  <strong>{formatCurrency(whatIf.waitOutcome)}</strong>
                  <small>{Math.round(whatIf.waitProbability * 100)}% probability</small>
                </div>
              </div>
              <div className="recommendation">
                <span className="confidence-check">
                  <Check size={13} />
                </span>
                <p>
                  <strong>Strategist recommends the discount.</strong> It gives you a{" "}
                  {formatCurrency(simulated)} certain outcome vs.{" "}
                  {formatCurrency(whatIf.waitOutcome)} expected value if you wait.
                </p>
              </div>
              <div className="modal-actions">
                <Button variant="secondary">Keep exploring</Button>
                <Button onClick={() => onNavigate("ask")}>
                  Draft offer <ArrowRight size={15} />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}

function SparkleIcon() {
  return <span aria-hidden="true">✦</span>;
}
