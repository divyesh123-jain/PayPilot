"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown, CircleHelp, Search, ShieldCheck, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/frontend/components/ui/button";
import { navItems } from "@/frontend/features/paypilot/data";
import type { ViewKey } from "@/frontend/features/paypilot/types";
import { getNotifications, markNotificationRead, type ApiNotification } from "@/frontend/lib/api";

export function Topbar({
  activeView,
  alertsOpen,
  onAlertsToggle,
  syncLabel = "Synced just now",
  onGoToLanding,
}: {
  activeView: ViewKey;
  alertsOpen: boolean;
  onAlertsToggle: () => void;
  syncLabel?: string;
  onGoToLanding?: () => void;
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
        {onGoToLanding && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onGoToLanding}
            className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 border-gray-200"
          >
            ← Landing Page
          </Button>
        )}
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
          <span className="sync-dot" /> {syncLabel}
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
          <span /> PayPal connection
        </span>
        <button className="context-link" onClick={onPolicies}>
          <ShieldCheck size={14} /> Policies on
        </button>
      </div>
    </div>
  );
}

export function NotificationDrawer({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getNotifications()
      .then((result) => {
        if (!active) return;
        setNotifications(result.data);
        setError(null);
      })
      .catch(() => {
        if (active) setError("Notifications are unavailable while the API is offline.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => notification.readAt === undefined
  ).length;
  const handleRead = async (notification: ApiNotification) => {
    if (notification.readAt) return;
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    }
  };

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
            Agent notifications <span>{unreadCount}</span>
          </h3>
        </div>
        <Button variant="icon" onClick={onClose} aria-label="Close notifications">
          <X size={17} />
        </Button>
      </div>
      {loading && (
        <div className="empty-state" style={{ padding: "24px 8px" }}>
          Loading notifications…
        </div>
      )}
      {error && <div className="data-status error-status">{error}</div>}
      {!loading && !error && notifications.length === 0 && (
        <div className="empty-state" style={{ padding: "24px 8px" }}>
          <Bell size={20} />
          <strong>No notifications yet</strong>
          <span>Account-backed events will appear here.</span>
        </div>
      )}
      {!loading &&
        notifications.map((notification) => (
          <button
            type="button"
            className={notification.readAt ? "drawer-item" : "drawer-item unread"}
            key={notification.id}
            onClick={() => void handleRead(notification)}
            style={{
              width: "100%",
              textAlign: "left",
              cursor: notification.readAt ? "default" : "pointer",
              border: 0,
              background: "transparent",
            }}
          >
            <div
              className={`drawer-icon ${notification.severity === "critical" ? "danger" : notification.severity === "warning" ? "amber" : "teal"}`}
            >
              {notification.severity === "critical" ? (
                <Bell size={16} />
              ) : notification.severity === "warning" ? (
                <ShieldCheck size={16} />
              ) : (
                <SparklesIcon />
              )}
            </div>
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              <small>{formatNotificationTime(notification.createdAt)}</small>
            </div>
          </button>
        ))}
      <Button variant="link" className="drawer-footer" onClick={onClose}>
        View notification history <ChevronDown size={15} />
      </Button>
    </motion.div>
  );
}

function formatNotificationTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Recently"
    : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function SparklesIcon() {
  return <span style={{ fontSize: 15 }}>✦</span>;
}
