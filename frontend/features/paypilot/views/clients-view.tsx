"use client";

import { useState, useMemo } from "react";
import {
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  MoreVertical,
  Plus,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Card } from "@/frontend/components/ui/card";

export type ClientItem = {
  id: string;
  name: string;
  company: string;
  email: string;
  state: "Keep" | "Monitor only" | "Do not contact";
  reliability: number;
  openAmount: string;
  daysOverdue: number;
  lastContact: string;
  nextStep: string;
  promiseDate?: string;
  notes?: string;
};

const initialClients: ClientItem[] = [];

export function ClientsView() {
  const [clients, setClients] = useState<ClientItem[]>(initialClients);
  const [query, setQuery] = useState("");
  const [filterState, setFilterState] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [promiseInput, setPromiseInput] = useState("");

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.company.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase());
      const matchesState = filterState === "all" || c.state === filterState;
      return matchesSearch && matchesState;
    });
  }, [clients, query, filterState]);

  const updateClientState = (id: string, newState: ClientItem["state"]) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, state: newState } : c)));
    if (selectedClient && selectedClient.id === id) {
      setSelectedClient((c) => (c ? { ...c, state: newState } : null));
    }
  };

  const handleSetPromise = (id: string) => {
    if (!promiseInput.trim()) return;
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              promiseDate: promiseInput,
              nextStep: `Promise to pay by ${promiseInput} (Reminders held)`,
            }
          : c
      )
    );
    if (selectedClient && selectedClient.id === id) {
      setSelectedClient((c) =>
        c
          ? {
              ...c,
              promiseDate: promiseInput,
              nextStep: `Promise to pay by ${promiseInput} (Reminders held)`,
            }
          : null
      );
    }
    setPromiseInput("");
  };

  return (
    <div className="view-content clients-view">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RELATIONSHIPS & CONTACT GOVERNANCE</span>
          <h1>Clients</h1>
          <p>
            Manage who PayPilot monitors, scores, and contacts. The permission engine strictly
            enforces client states.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => setFilterState("Keep")}>
            <UserCheck size={15} /> Messageable ({clients.filter((c) => c.state === "Keep").length})
          </Button>
          <Button variant="secondary" onClick={() => setFilterState("Do not contact")}>
            <Ban size={15} /> Do Not Contact (
            {clients.filter((c) => c.state === "Do not contact").length})
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="audit-toolbar" style={{ marginBottom: "16px" }}>
        <div className="search-input">
          <Search size={16} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients by name, company, or email..."
          />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`badge ${filterState === "all" ? "badge-primary" : ""}`}
            style={{
              cursor: "pointer",
              border: "1px solid #e2e8f0",
              padding: "6px 12px",
              borderRadius: "6px",
            }}
            onClick={() => setFilterState("all")}
          >
            All ({clients.length})
          </button>
          <button
            className={`badge ${filterState === "Keep" ? "badge-primary" : ""}`}
            style={{
              cursor: "pointer",
              border: "1px solid #e2e8f0",
              padding: "6px 12px",
              borderRadius: "6px",
            }}
            onClick={() => setFilterState("Keep")}
          >
            Keep
          </button>
          <button
            className={`badge ${filterState === "Monitor only" ? "badge-primary" : ""}`}
            style={{
              cursor: "pointer",
              border: "1px solid #e2e8f0",
              padding: "6px 12px",
              borderRadius: "6px",
            }}
            onClick={() => setFilterState("Monitor only")}
          >
            Monitor only
          </button>
          <button
            className={`badge ${filterState === "Do not contact" ? "badge-primary" : ""}`}
            style={{
              cursor: "pointer",
              border: "1px solid #e2e8f0",
              padding: "6px 12px",
              borderRadius: "6px",
            }}
            onClick={() => setFilterState("Do not contact")}
          >
            Do not contact
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                textAlign: "left",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              <th style={{ padding: "12px 16px" }}>CLIENT & COMPANY</th>
              <th style={{ padding: "12px 16px" }}>EMAIL</th>
              <th style={{ padding: "12px 16px" }}>STATE</th>
              <th style={{ padding: "12px 16px" }}>RELIABILITY</th>
              <th style={{ padding: "12px 16px" }}>OPEN AMOUNT</th>
              <th style={{ padding: "12px 16px" }}>OVERDUE</th>
              <th style={{ padding: "12px 16px" }}>NEXT STEP</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state" style={{ margin: "28px 16px" }}>
                    <Users size={22} />
                    <strong>No clients imported</strong>
                    <p>
                      Connect PayPal and complete the first sync to build your client list from real
                      transactions.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((client) => (
                <tr
                  key={client.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onClick={() => setSelectedClient(client)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <strong>{client.name}</strong>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{client.company}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{client.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "12px",
                        background:
                          client.state === "Keep"
                            ? "#ecfdf5"
                            : client.state === "Do not contact"
                              ? "#fef2f2"
                              : "#fffbeb",
                        color:
                          client.state === "Keep"
                            ? "#065f46"
                            : client.state === "Do not contact"
                              ? "#991b1b"
                              : "#92400e",
                      }}
                    >
                      {client.state}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          client.reliability >= 8
                            ? "#16a34a"
                            : client.reliability >= 5
                              ? "#d97706"
                              : "#dc2626",
                      }}
                    >
                      {client.reliability} / 10
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{client.openAmount}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {client.daysOverdue > 0 ? (
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>
                        {client.daysOverdue} days
                      </span>
                    ) : (
                      <span style={{ color: "#16a34a" }}>Current</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "#64748b",
                      maxWidth: "220px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {client.nextStep}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                      }}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Client Detail Drawer */}
      {selectedClient && (
        <div className="what-if-overlay" role="dialog" aria-modal="true">
          <div className="what-if-dialog" style={{ maxWidth: "560px", width: "95%" }}>
            <button
              className="what-if-close"
              onClick={() => setSelectedClient(null)}
              aria-label="Close"
            >
              <X size={17} />
            </button>

            <span className="eyebrow" style={{ margin: 0 }}>
              CLIENT DETAIL · GOVERNED PROFILE
            </span>
            <h2 style={{ fontSize: "20px", margin: "6px 0 2px" }}>{selectedClient.name}</h2>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
              {selectedClient.company} · {selectedClient.email}
            </div>

            {/* State Selector */}
            <div
              style={{
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}
              >
                OUTBOUND CONTACT PERMISSION
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["Keep", "Monitor only", "Do not contact"] as const).map((st) => (
                  <button
                    key={st}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid",
                      borderColor: selectedClient.state === st ? "#6366f1" : "#cbd5e1",
                      background: selectedClient.state === st ? "#eff6ff" : "#fff",
                      color: selectedClient.state === st ? "#1e40af" : "#475569",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                    onClick={() => updateClientState(selectedClient.id, st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                {selectedClient.state === "Keep"
                  ? "Monitored, scored and eligible for approved reminders."
                  : selectedClient.state === "Monitor only"
                    ? "Scored in forecasts; never sent any outbound message."
                    : "Hard blocked: Permission engine denies 100% of outbound messages."}
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                }}
              >
                <span className="eyebrow">RELIABILITY SCORE</span>
                <strong
                  style={{
                    fontSize: "18px",
                    color:
                      selectedClient.reliability >= 8
                        ? "#16a34a"
                        : selectedClient.reliability >= 5
                          ? "#d97706"
                          : "#dc2626",
                  }}
                >
                  {selectedClient.reliability} / 10
                </strong>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Derived from PayPal timing
                </div>
              </div>
              <div
                style={{
                  padding: "12px",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                }}
              >
                <span className="eyebrow">OPEN AMOUNT</span>
                <strong style={{ fontSize: "18px", color: "#1e293b" }}>
                  {selectedClient.openAmount}
                </strong>
                <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                  {selectedClient.daysOverdue > 0
                    ? `${selectedClient.daysOverdue} days past due`
                    : "Current"}
                </div>
              </div>
            </div>

            {/* Promise to Pay */}
            <div
              style={{
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <div
                style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}
              >
                LOG PROMISE TO PAY
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                If the client promised to pay by a certain date, reminders are frozen until that
                day.
              </div>
              {selectedClient.promiseDate ? (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#065f46",
                  }}
                >
                  ✓ <strong>Promise logged:</strong> Payment expected by{" "}
                  {selectedClient.promiseDate}. Outbound reminders held.
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <Input
                    type="date"
                    value={promiseInput}
                    onChange={(e) => setPromiseInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button size="sm" onClick={() => handleSetPromise(selectedClient.id)}>
                    Hold Reminders
                  </Button>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedClient.notes && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                }}
              >
                <strong>Internal Note:</strong> {selectedClient.notes}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSelectedClient(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
