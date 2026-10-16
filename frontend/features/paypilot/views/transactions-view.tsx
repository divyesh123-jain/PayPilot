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
import type { BusinessProfile, TransactionStatus } from "../types";

const statusVariant: Record<TransactionStatus, "success" | "pending" | "neutral" | "danger"> = {
  Completed: "success",
  Pending: "pending",
  Refunded: "neutral",
  Failed: "danger",
};

export function TransactionsView({ business }: { business: BusinessProfile }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const transactions = useMemo(
    () =>
      business.transactions
        .filter((transaction) =>
          `${transaction.name} ${transaction.type} ${transaction.reference}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
        .filter((transaction) => filter === "All statuses" || transaction.status === filter),
    [business, filter, query]
  );
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PAYPAL DATA EXPLORER</span>
          <h1>Transactions</h1>
          <p>Every movement, reconciled and explained by PayPilot.</p>
        </div>
        <Button variant="secondary">
          <Download size={15} /> Export CSV
        </Button>
      </div>
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
          {transactions.length} of {business.transactions.length} records
        </span>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input type="checkbox" aria-label="Select all transactions" />
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
              {transactions.map((transaction) => (
                <TableRow key={transaction.reference}>
                  <TableCell>
                    <input type="checkbox" aria-label={`Select ${transaction.reference}`} />
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
          {transactions.length === 0 && (
            <div className="empty-state">
              <Search size={20} />
              <strong>No transactions found</strong>
              <span>Try a different search or status filter.</span>
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>Showing live Sandbox data · Last synced 2 min ago</span>
          <span>1 / 1</span>
        </div>
      </section>
    </div>
  );
}
