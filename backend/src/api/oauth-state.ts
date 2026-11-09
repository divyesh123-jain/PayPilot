import { createHash, randomBytes } from "node:crypto";

export type OAuthPurpose = "login" | "connect";

export interface OAuthStateRecord {
  readonly state: string;
  readonly purpose: OAuthPurpose;
  readonly returnTo?: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const states = new Map<string, OAuthStateRecord>();

export function createOAuthState(purpose: OAuthPurpose, returnTo?: string): OAuthStateRecord {
  pruneExpired();
  const state = randomBytes(24).toString("hex");
  const now = Date.now();
  const record: OAuthStateRecord = {
    state,
    purpose,
    ...(returnTo === undefined || !returnTo.trim() ? {} : { returnTo: returnTo.trim() }),
    createdAt: now,
    expiresAt: now + TTL_MS,
  };
  states.set(state, record);
  return record;
}

export function consumeOAuthState(state: string, expectedPurpose?: OAuthPurpose): OAuthStateRecord {
  pruneExpired();
  const record = states.get(state);
  states.delete(state);
  if (!record) throw new Error("Invalid or expired OAuth state");
  if (record.expiresAt < Date.now()) throw new Error("Invalid or expired OAuth state");
  if (expectedPurpose !== undefined && record.purpose !== expectedPurpose) {
    throw new Error(`OAuth state purpose mismatch: expected ${expectedPurpose}`);
  }
  return record;
}

export function mockAuthorizationCode(purpose: OAuthPurpose): string {
  return `mock-${purpose}-${createHash("sha256").update(purpose).digest("hex").slice(0, 12)}`;
}

export function isMockAuthorizationCode(code: string): boolean {
  return code.startsWith("mock-login-") || code.startsWith("mock-connect-");
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, value] of states) {
    if (value.expiresAt < now) states.delete(key);
  }
}

/** Test helper: clear all pending OAuth states. */
export function resetOAuthStatesForTests(): void {
  states.clear();
}
