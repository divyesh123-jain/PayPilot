"use client";

import { Bell, ChevronDown, CircleHelp, Search, ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/frontend/components/ui/button";
import { navItems } from "@/frontend/features/paypilot/data";
import type { ViewKey } from "@/frontend/features/paypilot/types";

export function Topbar({
  activeView,
  alertsOpen,
  onAlertsToggle,
}: {
  activeView: ViewKey;
  alertsOpen: boolean;
  onAlertsToggle: () => void;
}) {
  const title = navItems.find((item) => item.key === activeView)?.label ?? "Overview";
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Workspace</span>
        <ChevronDown size={13} />
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <Button variant="icon" className="search-btn" aria-label="Search">
          <Search size={18} />
        </Button>
        <Button
          variant="icon"
          className={alertsOpen ? "notification-btn active" : "notification-btn"}
          aria-label="Open notifications"
          onClick={onAlertsToggle}
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </Button>
        <CircleHelp className="help-button" size={19} />
        <div className="topbar-divider" />
        <span className="sync-text">
          <span className="sync-dot" /> Synced just now
        </span>
      </div>
    </header>
  );
}

export function BusinessContext({
  name,
  descriptor,
  accent,
  onPolicies,
}: {
  name: string;
  descriptor: string;
  accent: string;
  onPolicies: () => void;
}) {
  return (
    <div className="business-context">
      <div className="context-left">
        <span className="context-accent" style={{ background: accent }} />
        <span>
          Viewing <strong>{name}</strong>
        </span>
        <span className="context-divider" />
        <span>{descriptor}</span>
      </div>
      <div className="context-right">
        <span className="sandbox-badge">
          <span /> PayPal Sandbox
        </span>
        <button className="context-link" onClick={onPolicies}>
          <ShieldCheck size={14} /> Policies on
        </button>
      </div>
    </div>
  );
}

export function NotificationDrawer({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="notification-drawer"
    >
      <div className="drawer-header">
        <div>
          <span className="eyebrow">INBOX</span>
          <h3>
            Agent notifications <span>3</span>
          </h3>
        </div>
        <Button variant="icon" onClick={onClose} aria-label="Close notifications">
          <X size={17} />
        </Button>
      </div>
      <div className="drawer-item unread">
        <div className="drawer-icon danger">
          <Bell size={16} />
        </div>
        <div>
          <strong>3 invoices need attention</strong>
          <p>Priya’s invoice is 21 days overdue.</p>
          <small>8 min ago</small>
        </div>
      </div>
      <div className="drawer-item unread">
        <div className="drawer-icon teal">
          <SparklesIcon />
        </div>
        <div>
          <strong>Forecast updated</strong>
          <p>Thursday cash gap is now 16% less likely.</p>
          <small>31 min ago</small>
        </div>
      </div>
      <div className="drawer-item">
        <div className="drawer-icon purple">
          <ShieldCheck size={16} />
        </div>
        <div>
          <strong>Policy blocked an action</strong>
          <p>Reminder #3 was queued for Monday.</p>
          <small>2 hr ago</small>
        </div>
      </div>
      <Button variant="link" className="drawer-footer" onClick={onClose}>
        View notification history <ChevronDown size={15} />
      </Button>
    </motion.div>
  );
}

function SparklesIcon() {
  return <span style={{ fontSize: 15 }}>✦</span>;
}
