"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationDrawer, BusinessContext, Topbar } from "@/frontend/components/layout/topbar";
import { ApprovalDrawer } from "@/frontend/components/layout/approval-drawer";
import { Sidebar } from "@/frontend/components/layout/sidebar";
import { InboxView, type ApprovalItem } from "@/frontend/features/paypilot/views/inbox-view";
import { AgentView } from "@/frontend/features/paypilot/views/agent-view";
import { TransactionsView } from "@/frontend/features/paypilot/views/transactions-view";
import { PoliciesView } from "@/frontend/features/paypilot/views/policies-view";
import { WorkflowsView } from "@/frontend/features/paypilot/views/workflows-view";
import { ForecastView } from "@/frontend/features/paypilot/views/forecast-view";
import { RiskView } from "@/frontend/features/paypilot/views/risk-view";
import { AuditView } from "@/frontend/features/paypilot/views/audit-view";
import { WhatIfDialog } from "@/frontend/features/paypilot/components/what-if-dialog";
import { businessProfiles } from "@/frontend/features/paypilot/data";
import type { BusinessKey, ViewKey } from "@/frontend/features/paypilot/types";
import { approveProposal, getApiSession, simulateReminder } from "@/frontend/lib/api";

export default function PayPilotApp() {
  const [businessKey, setBusinessKey] = useState<BusinessKey>("freelancer");
  const [activeView, setActiveView] = useState<ViewKey>("inbox");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [approval, setApproval] = useState<ApprovalItem | null>(null);
  const [approved, setApproved] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [syncLabel, setSyncLabel] = useState("Local replay ready");
  const [proposalId, setProposalId] = useState<string | null>(null);
  const business = useMemo(() => businessProfiles[businessKey], [businessKey]);

  useEffect(() => {
    let active = true;
    getApiSession()
      .then((session) => {
        if (active) setSyncLabel(`API connected · ${session.paymentMode}`);
      })
      .catch(() => {
        if (active) setSyncLabel("Local replay ready");
      });
    return () => { active = false; };
  }, []);

  const openApproval = (item: ApprovalItem) => {
    setApproved(false);
    setProposalId(null);
    setApproval(item);
    void simulateReminder(item.detail)
      .then((result) => { setProposalId(result.proposal.id); setSyncLabel("API proposal staged"); })
      .catch(() => setSyncLabel("Local approval preview"));
  };

  const approve = async (item?: ApprovalItem) => {
    const target = item ?? approval;
    if (target && !approval) setApproval(target);
    let activeProposalId = proposalId;
    if (!activeProposalId && target) {
      try {
        const result = await simulateReminder(target.detail);
        activeProposalId = result.proposal.id;
        setProposalId(activeProposalId);
      } catch {
        activeProposalId = null;
      }
    }
    if (activeProposalId) {
      try {
        await approveProposal(activeProposalId);
        setSyncLabel("Approval recorded by API");
      } catch {
        setSyncLabel("Local approval recorded");
      }
    }
    setApproved(true);
  };
  const goAsk = () => setActiveView("ask");

  return <main className="app-shell">
    <Sidebar businessKey={businessKey} profile={business} activeView={activeView} onBusinessChange={setBusinessKey} onNavigate={setActiveView} />
    <div className="main-shell">
      <Topbar activeView={activeView} alertsOpen={alertsOpen} onAlertsToggle={() => setAlertsOpen((open) => !open)} syncLabel={syncLabel} />
      <AnimatePresence>{alertsOpen && <NotificationDrawer onClose={() => setAlertsOpen(false)} />}</AnimatePresence>
      <BusinessContext name={business.name} descriptor={business.descriptor} accent={business.accent} onPolicies={() => setActiveView("policies")} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${activeView}-${businessKey}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}>
          {activeView === "inbox" && <InboxView business={business} onAsk={goAsk} onApprove={approve} onOpenApproval={openApproval} />}
          {activeView === "transactions" && <TransactionsView business={business} />}
          {activeView === "ask" && <AgentView business={business} />}
          {activeView === "forecast" && <ForecastView business={business} onWhatIf={() => setWhatIfOpen(true)} />}
          {activeView === "risk" && <RiskView business={business} onPolicies={() => setActiveView("policies")} />}
          {activeView === "policies" && <PoliciesView />}
          {activeView === "workflows" && <WorkflowsView />}
          {activeView === "audit" && <AuditView />}
        </motion.div>
      </AnimatePresence>
    </div>
    {approval && <ApprovalDrawer item={approval} approved={approved} onClose={() => setApproval(null)} onApprove={approve} onUndo={() => setApproved(false)} />}
    {whatIfOpen && <WhatIfDialog businessKey={businessKey} onClose={() => setWhatIfOpen(false)} onAsk={() => { setWhatIfOpen(false); goAsk(); }} />}
  </main>;
}
