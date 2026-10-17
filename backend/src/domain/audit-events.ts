import { createHash } from "node:crypto";

export type AuditOutcome = "accepted" | "rejected" | "proposed" | "completed" | "failed";
export type AuditResourceType = "business" | "transaction" | "policy" | "workflow" | "approval_request" | "notification" | "agent_run";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AuditEventInput {
  readonly id?: string;
  readonly businessId: string;
  readonly actorId: string;
  readonly actorType: "user" | "agent" | "system";
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly resourceType: AuditResourceType;
  readonly resourceId?: string;
  readonly occurredAt: string;
  readonly correlationId?: string;
  readonly metadata?: Record<string, JsonValue>;
}

export interface AuditEvent extends AuditEventInput {
  readonly id: string;
  readonly metadata: Readonly<Record<string, JsonValue>>;
  readonly prevHash?: string;
  readonly hash?: string;
}

function stableId(input: AuditEventInput): string {
  const serialized = JSON.stringify({
    businessId: input.businessId,
    actorId: input.actorId,
    action: input.action,
    outcome: input.outcome,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    occurredAt: input.occurredAt,
    correlationId: input.correlationId ?? null,
    metadata: input.metadata ?? {},
  });
  return `audit_${createHash("sha256").update(serialized).digest("hex").slice(0, 24)}`;
}

export function createAuditEvent(input: AuditEventInput): AuditEvent {
  if (!input.businessId.trim() || !input.actorId.trim() || !input.action.trim()) {
    throw new Error("businessId, actorId, and action are required for audit events");
  }
  if (Number.isNaN(Date.parse(input.occurredAt))) throw new Error("occurredAt must be an ISO date");
  return {
    ...input,
    id: input.id ?? stableId(input),
    metadata: { ...(input.metadata ?? {}) },
  };
}

export interface AuditEventStore {
  append(event: AuditEvent): void;
  list(filter?: { businessId?: string; action?: string; resourceId?: string }): readonly AuditEvent[];
}

/** An append-only store useful in unit tests and as a domain port for persistence adapters. */
export class InMemoryAuditEventStore implements AuditEventStore {
  private readonly events: AuditEvent[] = [];

  append(event: AuditEvent): void {
    if (this.events.some((existing) => existing.id === event.id)) {
      throw new Error(`Audit event ${event.id} already exists`);
    }
    const prevHash = this.events.at(-1)?.hash ?? "GENESIS";
    const chained = { ...event, metadata: { ...event.metadata }, prevHash };
    this.events.push({ ...chained, hash: hashEvent(chained) });
  }

  list(filter: { businessId?: string; action?: string; resourceId?: string } = {}): readonly AuditEvent[] {
    return this.events
      .filter((event) =>
        (filter.businessId === undefined || event.businessId === filter.businessId) &&
        (filter.action === undefined || event.action === filter.action) &&
        (filter.resourceId === undefined || event.resourceId === filter.resourceId),
      )
      .map((event) => ({ ...event, metadata: { ...event.metadata } }));
  }
}

/** The hash excludes the chain fields so verification can be reproduced from the row itself. */
export function hashEvent(event: Omit<AuditEvent, "hash" | "prevHash"> & { prevHash: string }): string {
  return createHash("sha256")
    .update(event.prevHash + canonicalJson(event))
    .digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}
