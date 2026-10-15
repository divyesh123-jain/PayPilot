/** Canonical business contexts shared by PayPilot's UI and domain services. */
export const BUSINESS_TYPES = [
  "freelancer",
  "ecommerce",
  "saas",
  "agency",
  "service",
  "creator",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
export type CurrencyCode = string;
export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";
export type TransactionDirection = "inflow" | "outflow";

export interface BusinessProfileInput {
  id?: string;
  name: string;
  type: BusinessType;
  currency?: CurrencyCode;
  timezone?: string;
  descriptor?: string;
  comfortBufferCents?: number;
  metadata?: Record<string, unknown>;
}

export interface BusinessProfile {
  readonly id: string;
  readonly name: string;
  readonly type: BusinessType;
  readonly currency: CurrencyCode;
  readonly timezone: string;
  readonly descriptor: string;
  readonly comfortBufferCents: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface TransactionInput {
  id: string;
  occurredAt: string;
  amountCents: number;
  direction: TransactionDirection;
  status: TransactionStatus;
  counterparty?: string;
  category?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface Transaction extends TransactionInput {
  readonly businessId: string;
  readonly signedAmountCents: number;
  readonly counterparty?: string;
  readonly category?: string;
  readonly reference?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface BusinessContext {
  readonly profile: BusinessProfile;
  readonly transactions: readonly Transaction[];
  readonly asOf: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} must not be empty`);
  }
  return normalized;
}

function requireCents(value: number, field: string, allowZero = true): number {
  if (!Number.isSafeInteger(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new Error(`${field} must be a ${allowZero ? "non-negative" : "positive"} integer in cents`);
  }
  return value;
}

function requireIsoDate(value: string, field: string): string {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid ISO-8601 date`);
  }
  return value;
}

export function createBusinessProfile(input: BusinessProfileInput): BusinessProfile {
  const name = requireNonEmpty(input.name, "name");
  const id = requireNonEmpty(input.id ?? `business-${input.type}`, "id");
  const currency = (input.currency ?? "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("currency must be a three-letter ISO code");
  }

  return {
    id,
    name,
    type: input.type,
    currency,
    timezone: input.timezone ?? "UTC",
    descriptor: input.descriptor?.trim() ?? "",
    comfortBufferCents: requireCents(input.comfortBufferCents ?? 0, "comfortBufferCents"),
    metadata: { ...(input.metadata ?? {}) },
  };
}

export function createTransaction(businessId: string, input: TransactionInput): Transaction {
  const id = requireNonEmpty(input.id, "transaction id");
  const normalizedBusinessId = requireNonEmpty(businessId, "businessId");
  const amountCents = requireCents(input.amountCents, "amountCents", false);
  requireIsoDate(input.occurredAt, "occurredAt");

  return {
    ...input,
    id,
    businessId: normalizedBusinessId,
    amountCents,
    signedAmountCents: input.direction === "inflow" ? amountCents : -amountCents,
    metadata: { ...(input.metadata ?? {}) },
  };
}

export function createBusinessContext(
  profileInput: BusinessProfileInput,
  transactions: readonly TransactionInput[] = [],
  asOf = new Date().toISOString(),
): BusinessContext {
  const profile = createBusinessProfile(profileInput);
  requireIsoDate(asOf, "asOf");
  return {
    profile,
    transactions: transactions.map((transaction) => createTransaction(profile.id, transaction)),
    asOf,
  };
}

export function sumSettledCash(transactions: readonly Transaction[]): number {
  return transactions
    .filter((transaction) => transaction.status === "completed")
    .reduce((total, transaction) => total + transaction.signedAmountCents, 0);
}
