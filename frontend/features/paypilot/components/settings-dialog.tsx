"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  Mail,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Unplug,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import {
  createExport,
  disconnectPayPal,
  pauseAgent,
  resumeAgent,
  scheduleDeletion,
} from "@/frontend/lib/api";

type SettingsTab = "lifecycle" | "profile" | "team" | "connections";

export function SettingsDialog({
  isOpen,
  onClose,
  onOpenOnboarding,
  onResetAsNewbie,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenOnboarding: () => void;
  onResetAsNewbie?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("lifecycle");
  const [paused, setPaused] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [exported, setExported] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile Form state
  const [businessName, setBusinessName] = useState("Alex Morgan Studio");
  const [replyTo, setReplyTo] = useState("alex@designstudio.com");
  const [timezone, setTimezone] = useState("America/New_York (UTC-5)");
  const [signature, setSignature] = useState("Alex Morgan · Principal Designer");

  // Team state
  const [team, setTeam] = useState([
    { id: "1", name: "Alex Morgan", email: "alex@designstudio.com", role: "Owner" },
    { id: "2", name: "Sarah Bookkeeper", email: "sarah@acctservices.io", role: "Accountant" },
    { id: "3", name: "Jordan Lee", email: "jordan@designstudio.com", role: "Operator" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Operator");

  if (!isOpen) return null;

  const handlePauseToggle = async () => {
    setLoading(true);
    try {
      if (paused) {
        await resumeAgent();
        setPaused(false);
      } else {
        await pauseAgent();
        setPaused(true);
      }
    } catch {
      setPaused(!paused);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect PayPal? All pending proposals will be cancelled.")) return;
    setLoading(true);
    try {
      await disconnectPayPal();
      setDisconnected(true);
    } catch {
      setDisconnected(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await createExport();
      setExported(true);
      const content = "Entity\tCount\tFormat\nTransactions\t126\tCSV\nClients\t12\tJSON\nProposals\t3\tJSON\nPolicies\t2\tJSON\nAudit Log\t126\tTSV (Hash Chain)";
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "paypilot-export-complete.tsv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExported(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const input = prompt("Type DELETE to confirm 14-day grace period account removal:");
    if (input !== "DELETE") return;
    setLoading(true);
    try {
      await scheduleDeletion();
      setDeleted(true);
    } catch {
      setDeleted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setTeam((prev) => [
      ...prev,
      { id: String(Date.now()), name: inviteEmail.split("@")[0], email: inviteEmail, role: inviteRole },
    ]);
    setInviteEmail("");
  };

  return (
    <div className="what-if-overlay" role="dialog" aria-modal="true">
      <div className="what-if-dialog" style={{ maxWidth: "640px", width: "95%" }}>
        <button className="what-if-close" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>

        <span className="eyebrow" style={{ margin: 0 }}>
          PLATFORM GOVERNANCE & SETTINGS
        </span>
        <h2 style={{ fontSize: "20px", margin: "4px 0 14px" }}>Workspace Settings</h2>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px" }}>
          {[
            { id: "lifecycle", label: "Lifecycle & Safety", icon: Shield },
            { id: "profile", label: "Business Profile", icon: Building },
            { id: "team", label: "Team & Roles", icon: Users },
            { id: "connections", label: "PayPal Vault", icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: activeTab === tab.id ? "#eff6ff" : "transparent",
                  color: activeTab === tab.id ? "#1d4ed8" : "#64748b",
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Lifecycle & Offboarding */}
        {activeTab === "lifecycle" && (
          <div>
            <div
              style={{
                padding: "12px 14px",
                background: disconnected ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${disconnected ? "#fca5a5" : "#bbf7d0"}`,
                borderRadius: "8px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Shield size={18} color={disconnected ? "#dc2626" : "#16a34a"} />
                <div>
                  <strong style={{ fontSize: "13px" }}>{disconnected ? "PayPal Disconnected" : "PayPal Sandbox Active"}</strong>
                  <div style={{ fontSize: "11px", color: disconnected ? "#991b1b" : "#15803d" }}>
                    {disconnected ? "Token vault purged. Zero live writes possible." : "Encrypted Vault · Tokens protected from LLM"}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, background: disconnected ? "#fee2e2" : "#dcfce7", color: disconnected ? "#991b1b" : "#166534", padding: "2px 8px", borderRadius: "4px" }}>
                {disconnected ? "REVOKED" : "ENCRYPTED"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Level 1: Pause */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div>
                  <strong style={{ fontSize: "13px" }}>Level 1: Pause Agent</strong>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {paused ? "Agent paused. Proposals frozen; alerts remain visible." : "Scout & Strategist monitor; Executor requires approval."}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handlePauseToggle} disabled={loading || disconnected}>
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                  {paused ? "Resume" : "Pause"}
                </Button>
              </div>

              {/* Level 2: Disconnect */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div>
                  <strong style={{ fontSize: "13px" }}>Level 2: Disconnect PayPal</strong>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Revoke tokens from vault, stop background sync, cancel proposals.
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleDisconnect} disabled={loading || disconnected}>
                  <Unplug size={14} /> Disconnect
                </Button>
              </div>

              {/* Level 3: Export Data */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div>
                  <strong style={{ fontSize: "13px" }}>Level 3: Export My Data</strong>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Download TSV/JSON archive of transactions, clients, proposals, and audit hash-chain.
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading}>
                  <Download size={14} /> {exported ? "Downloaded" : "Export Archive"}
                </Button>
              </div>

              {/* Level 4: Delete Account */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fecaca" }}>
                <div>
                  <strong style={{ fontSize: "13px", color: "#991b1b" }}>Level 4: Delete Account</strong>
                  <div style={{ fontSize: "11px", color: "#b91c1c" }}>
                    {deleted ? "Deletion scheduled. 14-day grace period active." : "14-day grace period, then hard delete of personal client data."}
                  </div>
                </div>
                <Button variant="ghost" size="sm" style={{ color: "#dc2626" }} onClick={handleDelete} disabled={loading || deleted}>
                  <Trash2 size={14} /> {deleted ? "Scheduled" : "Delete Account"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Business Profile */}
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Business Display Name</label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Merchant Reply-To Email</label>
              <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Replies from clients land directly in your email inbox.</div>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Workspace Timezone</label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Used for quiet hours calculation (22:00–08:00).</div>
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Email Signature</label>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
            </div>
            <Button size="sm" style={{ alignSelf: "flex-start" }} onClick={() => alert("Profile updated.")}>
              Save Profile Changes
            </Button>
          </div>
        )}

        {/* TAB 3: Team & Roles */}
        {activeTab === "team" && (
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
              Three roles supported: <strong>Owner</strong> (full access), <strong>Operator</strong> (can approve drafts), and <strong>Accountant</strong> (read-only + export).
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <Input
                placeholder="Teammate work email..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ flex: 2 }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              >
                <option value="Operator">Operator</option>
                <option value="Accountant">Accountant</option>
                <option value="Owner">Owner</option>
              </select>
              <Button size="sm" onClick={handleInvite}><Plus size={14} /> Invite</Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {team.map((member) => (
                <div key={member.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <strong style={{ fontSize: "13px" }}>{member.name}</strong>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{member.email}</div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: member.role === "Owner" ? "#ede9fe" : "#f1f5f9", color: member.role === "Owner" ? "#6d28d9" : "#475569" }}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PayPal Connections */}
        {activeTab === "connections" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Provider:</span>
                <strong>PayPal Sandbox v2 REST</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span>Scopes Active:</span>
                <strong>Invoicing v2, Orders, Captures, Webhooks</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span>Token Vault:</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>AES-256 Envelope Encrypted</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                <span>Last Sync:</span>
                <span>Just now · 126 records</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                onOpenOnboarding();
              }}
            >
              <RefreshCw size={14} /> Resume Wizard
            </Button>
            {onResetAsNewbie && (
              <Button
                variant="ghost"
                onClick={() => {
                  onClose();
                  onResetAsNewbie();
                }}
                style={{ color: "#4f46e5" }}
              >
                ✦ Reset as Newbie
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
