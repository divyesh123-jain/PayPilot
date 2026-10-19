"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NotificationDrawer, BusinessContext, Topbar } from "@/frontend/components/layout/topbar";
import { ApprovalDrawer } from "@/frontend/components/layout/approval-drawer";
import { Sidebar } from "@/frontend/components/layout/sidebar";
import { InboxView, approvalItem, type ApprovalItem } from "@/frontend/features/paypilot/views/inbox-view";
import { ClientsView } from "@/frontend/features/paypilot/views/clients-view";
import { AgentView } from "@/frontend/features/paypilot/views/agent-view";
import { TransactionsView } from "@/frontend/features/paypilot/views/transactions-view";
import { PoliciesView } from "@/frontend/features/paypilot/views/policies-view";
import { WorkflowsView } from "@/frontend/features/paypilot/views/workflows-view";
import { ForecastView } from "@/frontend/features/paypilot/views/forecast-view";
import { RiskView } from "@/frontend/features/paypilot/views/risk-view";
import { SentView } from "@/frontend/features/paypilot/views/sent-view";
import { AuditView } from "@/frontend/features/paypilot/views/audit-view";
import { WhatIfDialog } from "@/frontend/features/paypilot/components/what-if-dialog";
import { OnboardingModal } from "@/frontend/features/paypilot/components/onboarding-modal";
import { SettingsDialog } from "@/frontend/features/paypilot/components/settings-dialog";
import { LandingPage } from "@/frontend/features/landing/landing-page";
import { SignInModal } from "@/frontend/features/auth/sign-in-modal";
import { WelcomeModal } from "@/frontend/features/auth/welcome-modal";
import { businessProfiles } from "@/frontend/features/paypilot/data";
import type { BusinessKey, ViewKey } from "@/frontend/features/paypilot/types";
import { Sparkles } from "lucide-react";
import {
  approveProposal,
  getAuditEvents,
  getApiSession,
  getFindings,
  getForecast,
  getPolicy,
  getProposals,
  getTransactions,
  rejectProposal,
  resetOnboarding,
  setBusinessSession,
  simulateReminder,
  subscribeEventStream,
  type ApiAuditEvent,
  type ApiFinding,
  type ApiForecast,
  type ApiPolicy,
  type ApiProposal,
  type ApiTransaction,
} from "@/frontend/lib/api";

export default function PayPilotApp() {
  const [pageMode, setPageMode] = useState<"landing" | "dashboard">("landing");
  const [signInOpen, setSignInOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [signupPreset, setSignupPreset] = useState<BusinessKey>("freelancer");
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    businessName: string;
    businessKey: BusinessKey;
    isAuthenticated: boolean;
  } | null>(null);

  const [businessKey, setBusinessKey] = useState<BusinessKey>("freelancer");
  const [activeView, setActiveView] = useState<ViewKey>("inbox");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [approval, setApproval] = useState<ApprovalItem | null>(null);
  const [approved, setApproved] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncLabel, setSyncLabel] = useState("Local replay ready");
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [remoteTransactions, setRemoteTransactions] = useState<ApiTransaction[] | null>(null);
  const [remoteFindings, setRemoteFindings] = useState<ApiFinding[] | null>(null);
  const [remoteForecast, setRemoteForecast] = useState<ApiForecast | null>(null);
  const [remotePolicy, setRemotePolicy] = useState<ApiPolicy | null>(null);
  const [remoteProposals, setRemoteProposals] = useState<ApiProposal[] | null>(null);
  const [remoteAuditEvents, setRemoteAuditEvents] = useState<ApiAuditEvent[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const business = useMemo(() => businessProfiles[businessKey], [businessKey]);

  const loadRemoteData = async () => {
    setRemoteLoading(true);
    setRemoteError(null);
    const results = await Promise.allSettled([
      getTransactions(),
      getFindings(),
      getForecast(),
      getPolicy(),
      getProposals(),
      getAuditEvents(),
    ]);
    const [transactions, findings, forecast, policy, proposals, auditEvents] = results;
    if (transactions.status === "fulfilled") setRemoteTransactions(transactions.value.data);
    if (findings.status === "fulfilled") setRemoteFindings(findings.value.data);
    if (forecast.status === "fulfilled") setRemoteForecast(forecast.value);
    if (policy.status === "fulfilled") setRemotePolicy(policy.value);
    if (proposals.status === "fulfilled") setRemoteProposals(proposals.value.data);
    if (auditEvents.status === "fulfilled") setRemoteAuditEvents(auditEvents.value.data);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") setRemoteError(failed.reason instanceof Error ? failed.reason.message : "Some live data could not be loaded.");
    setRemoteLoading(false);
  };

  useEffect(() => {
    let active = true;
    getApiSession()
      .then((session) => {
        if (active) setSyncLabel(`API connected · ${session.paymentMode}`);
      })
      .catch(() => {
        if (active) setSyncLabel("Local replay ready");
      });

    void loadRemoteData();

    const unsubscribe = subscribeEventStream((event, data) => {
      if (!active) return;
      if (event === "proposal.updated") {
        setSyncLabel(`Proposal ${(data as any)?.id} updated`);
      } else if (event === "webhook.ingested") {
        setSyncLabel(`Live webhook ${(data as any)?.eventId} ingested`);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedSession = localStorage.getItem("paypilot_user_session");
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.isAuthenticated) {
            setCurrentUser(parsed);
            if (parsed.businessKey) {
              setBusinessKey(parsed.businessKey);
            }
          }
        }
      } catch {
        // storage fallback
      }
      const isCompleted = localStorage.getItem("paypilot_onboarding_completed") === "true";
      setOnboardingCompleted(isCompleted);
    }
  }, []);

  const handleOpenSignUp = (preset?: BusinessKey) => {
    if (preset) {
      setSignupPreset(preset);
      setBusinessKey(preset);
    }
    setOnboardingOpen(true);
    setSignInOpen(false);
  };

  const handleOpenSignIn = () => {
    setSignInOpen(true);
    setOnboardingOpen(false);
  };

  const handleSignInSuccess = (user: {
    name: string;
    email: string;
    businessName: string;
    businessKey: BusinessKey;
  }) => {
    const session = { ...user, isAuthenticated: true };
    setCurrentUser(session);
    try {
      localStorage.setItem("paypilot_user_session", JSON.stringify(session));
      localStorage.setItem("paypilot_onboarding_completed", "true");
    } catch {
      // storage
    }
    setOnboardingCompleted(true);
    setBusinessKey(user.businessKey);
    setPageMode("dashboard");
    setWelcomeOpen(true);
    void setBusinessSession(user.businessKey);
    void loadRemoteData();
  };

  const handleOnboardingComplete = (userInfo?: {
    name: string;
    email: string;
    businessName: string;
    businessKey: BusinessKey;
  }) => {
    const user = userInfo || {
      name: "Alex Morgan",
      email: "alex@morgancreative.agency",
      businessName: "Morgan Creative Studio",
      businessKey,
    };
    const session = { ...user, isAuthenticated: true };
    setCurrentUser(session);
    try {
      localStorage.setItem("paypilot_user_session", JSON.stringify(session));
      localStorage.setItem("paypilot_onboarding_completed", "true");
    } catch {
      // storage
    }
    setOnboardingCompleted(true);
    setBusinessKey(user.businessKey);
    setPageMode("dashboard");
    setWelcomeOpen(true);
    setSyncLabel("Onboarding complete · Active");
    void loadRemoteData();
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("paypilot_user_session");
    }
    setCurrentUser(null);
    setPageMode("landing");
  };

  const handleGoToLanding = () => {
    setPageMode("landing");
  };

  const handleEnterDashboard = () => {
    setPageMode("dashboard");
  };

  const handleResetAsNewbie = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("paypilot_onboarding_completed");
      localStorage.removeItem("paypilot_onboarding_v2");
    }
    try {
      await resetOnboarding(true);
    } catch {
      // offline fallback
    }
    setOnboardingCompleted(false);
    setOnboardingOpen(true);
    setSyncLabel("Onboarding reset · Newbie mode active");
  };

  const handleBusinessChange = (nextKey: BusinessKey) => {
    setBusinessKey(nextKey);
    setRemoteForecast(null);
    setBusinessSession(nextKey)
      .then((session) => {
        setSyncLabel(`Preset active: ${session.business.type}`);
        void loadRemoteData();
      })
      .catch(() => {
        setSyncLabel("Preset active (local)");
        setRemoteLoading(false);
      });
  };
  const reject = async () => {
    if (proposalId) {
      try {
        await rejectProposal(proposalId);
        setSyncLabel("Draft rejected and logged");
        setRemoteProposals((current) =>
          current?.map((proposal) => proposal.id === proposalId ? { ...proposal, status: "rejected" } : proposal) ?? current,
        );
      } catch {
        setSyncLabel("Draft kept locally");
      }
    }
    setApproval(null);
    setApproved(false);
  };

  const openApproval = (item: ApprovalItem) => {
    setApproved(false);
    setProposalId(null);
    setApproval(item);
    void simulateReminder(item.detail)
      .then((result) => {
        setProposalId(result.proposal.id);
        setSyncLabel("API proposal staged");
      })
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
        const updated = await approveProposal(activeProposalId);
        setRemoteProposals((current) =>
          current?.map((proposal) => proposal.id === updated.id ? updated : proposal) ?? current,
        );
        setSyncLabel("Approval recorded by API");
      } catch {
        setSyncLabel("Local approval recorded");
      }
    }
    setApproved(true);
  };
  const goAsk = () => setActiveView("ask");

  if (pageMode === "landing") {
    return (
      <>
        <LandingPage
          onOpenSignIn={handleOpenSignIn}
          onOpenSignUp={handleOpenSignUp}
          onEnterDashboard={handleEnterDashboard}
          isAuthenticated={!!currentUser?.isAuthenticated}
          currentUser={currentUser || undefined}
        />
        <SignInModal
          isOpen={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSuccess={handleSignInSuccess}
          onSwitchToSignUp={handleOpenSignUp}
        />
        <OnboardingModal
          isOpen={onboardingOpen}
          businessKey={businessKey}
          initialPreset={signupPreset}
          onBusinessChange={handleBusinessChange}
          onOpenApproval={openApproval}
          onClose={() => setOnboardingOpen(false)}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar
        businessKey={businessKey}
        profile={business}
        activeView={activeView}
        userName={currentUser?.name}
        onBusinessChange={handleBusinessChange}
        onNavigate={setActiveView}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onGoToLanding={handleGoToLanding}
        onSignOut={handleSignOut}
      />
      <div className="main-shell">
        <Topbar
          activeView={activeView}
          alertsOpen={alertsOpen}
          onAlertsToggle={() => setAlertsOpen((open) => !open)}
          syncLabel={syncLabel}
          onGoToLanding={handleGoToLanding}
        />
        {!onboardingCompleted && !onboardingOpen && (
          <div
            style={{
              background: "linear-gradient(90deg, #eef2ff 0%, #f5f3ff 100%)",
              borderBottom: "1px solid #c7d2fe",
              padding: "10px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#3730a3" }}>
              <Sparkles size={15} color="#6366f1" />
              <span>
                <strong>Newbie Onboarding in Progress:</strong> You're new to PayPilot! Resume the 7-step onboarding flow to finalize your PayPal baseline and safe reminders.
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => setOnboardingOpen(true)}
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px 12px",
                  fontWeight: 600,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Resume Onboarding Flow →
              </button>
            </div>
          </div>
        )}
        <AnimatePresence>
          {alertsOpen && <NotificationDrawer onClose={() => setAlertsOpen(false)} />}
        </AnimatePresence>
        <BusinessContext
          name={business.name}
          descriptor={business.descriptor}
          accent={business.accent}
          onPolicies={() => setActiveView("policies")}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeView}-${businessKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {activeView === "inbox" && (
              <InboxView
                business={business}
                remoteProposals={remoteProposals}
                loading={remoteLoading}
                error={remoteError}
                onAsk={goAsk}
                onApprove={approve}
                onOpenApproval={openApproval}
              />
            )}
            {activeView === "clients" && <ClientsView />}
            {activeView === "transactions" && (
              <TransactionsView business={business} remoteTransactions={remoteTransactions} loading={remoteLoading} error={remoteError} />
            )}
            {activeView === "ask" && <AgentView business={business} onReviewApproval={() => openApproval(approvalItem)} />}
            {activeView === "forecast" && (
              <ForecastView business={business} remoteForecast={remoteForecast} loading={remoteLoading} error={remoteError} onWhatIf={() => setWhatIfOpen(true)} />
            )}
            {activeView === "risk" && (
              <RiskView business={business} findings={remoteFindings} loading={remoteLoading} error={remoteError} onPolicies={() => setActiveView("policies")} />
            )}
            {activeView === "policies" && <PoliciesView policy={remotePolicy} loading={remoteLoading} error={remoteError} onPolicySaved={setRemotePolicy} />}
            {activeView === "workflows" && <WorkflowsView />}
            {activeView === "sent" && <SentView />}
            {activeView === "audit" && <AuditView events={remoteAuditEvents} loading={remoteLoading} error={remoteError} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {approval && (
        <ApprovalDrawer
          item={approval}
          approved={approved}
          onClose={() => setApproval(null)}
          onApprove={approve}
          onUndo={() => setApproved(false)}
          onReject={reject}
        />
      )}
      {whatIfOpen && (
        <WhatIfDialog
          businessKey={businessKey}
          onClose={() => setWhatIfOpen(false)}
          onAsk={() => {
            setWhatIfOpen(false);
            goAsk();
          }}
        />
      )}
      <WelcomeModal
        isOpen={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        userName={currentUser?.name || business.name}
        businessName={currentUser?.businessName || business.name}
        businessKey={businessKey}
        onOpenFirstProposal={() => {
          setActiveView("inbox");
          openApproval(approvalItem);
        }}
        onExploreDashboard={() => setWelcomeOpen(false)}
      />
      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSuccess={handleSignInSuccess}
        onSwitchToSignUp={handleOpenSignUp}
      />
      <OnboardingModal
        isOpen={onboardingOpen}
        businessKey={businessKey}
        initialPreset={signupPreset}
        onBusinessChange={handleBusinessChange}
        onOpenApproval={openApproval}
        onClose={() => setOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onResetAsNewbie={handleResetAsNewbie}
      />
    </main>
  );
}
