"use client";

import {
  ChevronDown,
  ClipboardList,
  Clock3,
  LineChart,
  MessageCircleQuestion,
  Radar,
  LayoutList,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/frontend/components/ui/avatar";
import { Select } from "@/frontend/components/ui/select";
import { businessOptions, navItems } from "@/frontend/features/paypilot/data";
import type { BusinessKey, ViewKey } from "@/frontend/features/paypilot/types";

const navIcons = {
  inbox: ClipboardList,
  transactions: ReceiptText,
  ask: MessageCircleQuestion,
  forecast: LineChart,
  risk: Radar,
  policies: ShieldCheck,
  workflows: Workflow,
  audit: Clock3,
};

export function Sidebar({
  businessKey,
  profile,
  activeView,
  onBusinessChange,
  onNavigate,
}: {
  businessKey: BusinessKey;
  profile: { name: string; type: string; initials: string; accent: string };
  activeView: ViewKey;
  onBusinessChange: (value: BusinessKey) => void;
  onNavigate: (view: ViewKey) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <span />
          <span />
          <span />
        </div>
        <span>paypilot</span>
        <span className="brand-beta">BETA</span>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="business-select-wrap">
        <label className="business-select" htmlFor="business-switcher">
          <Avatar initials={profile.initials} color={profile.accent} />
          <div className="business-select-copy">
            <strong>{profile.name}</strong>
            <span>{profile.type}</span>
          </div>
          <ChevronDown size={15} />
        </label>
        <Select
          id="business-switcher"
          aria-label="Select business type"
          value={businessKey}
          onChange={(event) => onBusinessChange(event.target.value as BusinessKey)}
        >
          {businessOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <nav className="main-nav">
        {navItems.map((item, index) => {
          const Icon = navIcons[item.key];
          return (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              whileTap={{ scale: 0.98 }}
              className={`nav-item ${activeView === item.key ? "active" : ""}`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.key === "policies" && <em>2</em>}
            </motion.button>
          );
        })}
      </nav>
      <div className="sidebar-spacer" />
      <div className="agent-status-card">
        <div className="status-card-top">
          <span className="live-dot" /> <span>Agent is live</span>
          <Zap size={15} />
        </div>
        <p>Monitoring PayPal in real time.</p>
        <div className="agent-stack">
          <span className="agent-avatar" style={{ color: "#6c7bff", background: "#eceeff" }}>
            <LayoutList size={15} />
          </span>
          <span className="agent-avatar" style={{ color: "#48bcae", background: "#e5f8f3" }}>
            <Sparkles size={15} />
          </span>
          <span className="agent-avatar" style={{ color: "#d37bc9", background: "#fbeaf8" }}>
            <Zap size={15} />
          </span>
          <span className="agent-stack-label">3 agents</span>
        </div>
      </div>
      <button className="nav-item settings-link">
        <Settings size={17} />
        <span>Settings</span>
      </button>
      <div className="profile-row">
        <div className="profile-avatar">AM</div>
        <div>
          <strong>Alex Morgan</strong>
          <span>Owner</span>
        </div>
        <Settings size={15} />
      </div>
    </aside>
  );
}
