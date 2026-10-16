"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { getWhatIfScenario } from "../data";
import type { BusinessKey } from "../types";

export function WhatIfDialog({ businessKey, onClose, onAsk }: { businessKey: BusinessKey; onClose: () => void; onAsk: () => void }) {
  const scenario = getWhatIfScenario(businessKey);
  const fastOutcome = Math.round(scenario.outstanding * (1 - scenario.discount / 100));
  const waitOutcome = scenario.waitOutcome;
  return <div className="what-if-overlay" role="dialog" aria-modal="true" aria-label="What-if scenario"><div className="what-if-dialog"><button className="what-if-close" onClick={onClose} aria-label="Close"><X size={17} /></button><span className="eyebrow">DECISION LAB · DETERMINISTIC MODEL</span><h2>{scenario.title}</h2><p>Compare a fast, certain outcome with waiting on the current signal. The model uses the same local scenario data every time.</p><div className="scenario-box"><div className="scenario-top"><span>{scenario.subject}</span><strong>${scenario.outstanding.toLocaleString()}</strong></div><div className="scenario-detail"><span>Offer today</span><b>{scenario.discount}% credit</b></div><div className="scenario-detail"><span>Wait window</span><b>{scenario.waitDays} days</b></div></div><div className="compare-grid"><div><span>Fast payment</span><strong>${fastOutcome.toLocaleString()}</strong><small>{Math.round(scenario.fastPaymentProbability * 100)}% likely · today</small></div><div className="vs">vs.</div><div><span>Wait {scenario.waitDays} days</span><strong>${waitOutcome.toLocaleString()}</strong><small>{Math.round(scenario.waitProbability * 100)}% probability</small></div></div><div className="recommendation"><span className="confidence-check"><Check size={13} /></span><p><strong>Strategist recommends the fast path.</strong> {scenario.recommendation}</p></div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Keep exploring</Button><Button onClick={onAsk}><SlidersHorizontal size={14} /> Ask about this <span>→</span></Button></div></div></div>;
}
