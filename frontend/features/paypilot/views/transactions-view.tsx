"use client";

import { useMemo, useState } from "react";
import { Download, Filter, MoreHorizontal, Search } from "lucide-react";
import { Avatar } from "@/frontend/components/ui/avatar";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Select } from "@/frontend/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table";
import { initials } from "@/frontend/lib/utils";
import type { ApiTransaction } from "@/frontend/lib/api";
import type { BusinessProfile, TransactionStatus } from "../types";

const statusVariant: Record<TransactionStatus, "success" | "pending" | "neutral" | "danger"> = {
  Completed: "success",
  Pending: "pending",
  Refunded: "neutral",
  Failed: "danger",
};

export function TransactionsView({
  business,
  remoteTransactions,
  loading,
  error,
}: {
  business: BusinessProfile;
  remoteTransactions: ApiTransaction[] | null;
  loading: boolean;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [selected, setSelected] = useState<string[]>([]);
  const transactions = useMemo(() => {
    if (!remoteTransactions) return business.transactions;
    return remoteTransactions.map((transaction) => ({
      date: new Date(transaction.occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      name: transaction.counterparty ?? transaction.reference ?? transaction.id,
      type: transaction.category ?? (transaction.direction === "inflow" ? "Payment received" : "Payment sent"),
      amount: `${transaction.signedAmountCents !== undefined && transaction.signedAmountCents >= 0 ? "+" : ""}$${(
        Math.abs(transaction.signedAmountCents ?? transaction.amountCents) / 100
      ).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      status: transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) as TransactionStatus,
      reference: transaction.reference ?? transaction.id,
    }));
  }, [business.transactions, remoteTransactions]);
  const filteredTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) =>
          `${transaction.name} ${transaction.type} ${transaction.reference}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .filter((transaction) => filter === "All statuses" || transaction.status === filter),
    [transactions, filter, query],
  );
  const toggleSelected = (reference: string) =>
    setSelected((current) => current.includes(reference) ? current.filter((item) => item !== reference) : [...current, reference]);
  const allVisibleSelected = filteredTransactions.length > 0 && filteredTransactions.every((item) => selected.includes(item.reference));
  const exportCsv = () => {
    const header = ["Date", "Customer / account", "Type", "Amount", "Status", "Reference"];
    const rows = filteredTransactions.map((transaction) => [
      transaction.date,
      transaction.name,
      transaction.type,
      transaction.amount,
      transaction.status,
      transaction.reference,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "paypilot-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PAYPAL DATA EXPLORER</span>
          <h1>Transactions</h1>
          <p>Every movement, reconciled and explained by PayPilot.</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          <Download size={15} /> Export CSV
        </Button>
      </div>
      {loading && <div className="data-status loading-status">Loading the latest PayPal transactions…</div>}
      {error && <div className="data-status error-status">Live data is unavailable. Showing the local replay dataset.</div>}
      <div className="transaction-toolbar">
        <div className="search-input">
          <Search size={16} />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transactions..."
          />
        </div>
        <Select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter transactions"
        >
          <option>All statuses</option>
          <option>Completed</option>
          <option>Pending</option>
          <option>Refunded</option>
          <option>Failed</option>
        </Select>
        <Button variant="secondary" className="filter-button">
          <Filter size={15} /> More filters
        </Button>
        <span className="toolbar-count">
           {filteredTransactions.length} of {transactions.length} records
           {selected.length > 0 && ` · ${selected.length} selected`}
        </span>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    aria-label="Select all transactions"
                    checked={allVisibleSelected}
                    onChange={() => setSelected(allVisibleSelected ? [] : filteredTransactions.map((item) => item.reference))}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer / account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.reference}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${transaction.reference}`}
                      checked={selected.includes(transaction.reference)}
                      onChange={() => toggleSelected(transaction.reference)}
                    />
                  </TableCell>
                  <TableCell className="muted-cell">{transaction.date}</TableCell>
                  <TableCell>
                    <div className="customer-cell">
                      <Avatar initials={initials(transaction.name)} color={business.accent} />
                      <strong>{transaction.name}</strong>
                    </div>
                  </TableCell>
                  <TableCell className="muted-cell">{transaction.type}</TableCell>
                  <TableCell
                    className={transaction.amount.startsWith("+") ? "amount-positive" : ""}
                  >
                    {transaction.amount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[transaction.status]}>
                      <span className="status-dot" />
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="reference-cell">{transaction.reference}</TableCell>
                  <TableCell>
                    <Button variant="icon" aria-label="Transaction options">
                      <MoreHorizontal size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredTransactions.length === 0 && (
            <div className="empty-state">
              <Search size={20} />
              <strong>{transactions.length === 0 ? "No transactions yet" : "No transactions found"}</strong>
              <span>{transactions.length === 0 ? "New PayPal activity will appear here." : "Try a different search or status filter."}</span>
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>Showing live Sandbox data · Last synced 2 min ago</span>
          <span>{filteredTransactions.length === 0 ? "0 / 0" : "1 / 1"}</span>
        </div>
      </section>
    </div>
  );
}
