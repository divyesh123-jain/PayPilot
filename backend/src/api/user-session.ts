import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const SESSION_COOKIE = "paypilot_sid";

export interface AuthUser {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly paypalPayerId: string;
  readonly createdAt: string;
}

interface SessionRecord extends AuthUser {
  readonly sessionId: string;
  readonly expiresAt: number;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map<string, SessionRecord>();

export function createUserSession(user: Omit<AuthUser, "createdAt"> & { createdAt?: string }): AuthUser {
  pruneExpired();
  const sessionId = randomBytes(24).toString("hex");
  const createdAt = user.createdAt ?? new Date().toISOString();
  const record: SessionRecord = {
    sessionId,
    userId: user.userId,
    email: user.email,
    name: user.name,
    paypalPayerId: user.paypalPayerId,
    createdAt,
    expiresAt: Date.now() + TTL_MS,
  };
  sessions.set(sessionId, record);
  return {
    userId: record.userId,
    email: record.email,
    name: record.name,
    paypalPayerId: record.paypalPayerId,
    createdAt: record.createdAt,
  };
}

export function getSessionUser(sessionId: string | undefined): AuthUser | undefined {
  if (!sessionId) return undefined;
  pruneExpired();
  const record = sessions.get(sessionId);
  if (!record) return undefined;
  if (record.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }
  return {
    userId: record.userId,
    email: record.email,
    name: record.name,
    paypalPayerId: record.paypalPayerId,
    createdAt: record.createdAt,
  };
}

export function destroySession(sessionId: string | undefined): void {
  if (!sessionId) return;
  sessions.delete(sessionId);
}

export function signSessionId(sessionId: string, secret = sessionSecret()): string {
  const signature = createHmac("sha256", secret).update(sessionId).digest("base64url");
  return `${sessionId}.${signature}`;
}

export function verifySignedSessionId(value: string | undefined, secret = sessionSecret()): string | undefined {
  if (!value) return undefined;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return undefined;
  const sessionId = value.slice(0, idx);
  const signature = value.slice(idx + 1);
  const expected = createHmac("sha256", secret).update(sessionId).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined;
  return sessionId;
}

export function readSessionCookie(request: IncomingMessage): string | undefined {
  const raw = request.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function currentUserFromRequest(request: IncomingMessage): AuthUser | undefined {
  const signed = readSessionCookie(request);
  const sessionId = verifySignedSessionId(signed);
  return getSessionUser(sessionId);
}

export function setSessionCookie(response: ServerResponse, sessionId: string, secure: boolean): void {
  const value = encodeURIComponent(signSessionId(sessionId));
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
  ];
  if (secure) parts.push("Secure");
  appendSetCookie(response, parts.join("; "));
}

export function clearSessionCookie(response: ServerResponse, secure: boolean): void {
  const parts = [`${SESSION_COOKIE}=`, "HttpOnly", "Path=/", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  appendSetCookie(response, parts.join("; "));
}

export function findSessionIdForUser(user: AuthUser): string | undefined {
  for (const [sessionId, record] of sessions) {
    if (record.userId === user.userId && record.paypalPayerId === user.paypalPayerId) return sessionId;
  }
  return undefined;
}

/** Creates a session and returns the raw session id for cookie signing. */
export function createUserSessionWithId(user: Omit<AuthUser, "createdAt"> & { createdAt?: string }): { user: AuthUser; sessionId: string } {
  pruneExpired();
  const sessionId = randomBytes(24).toString("hex");
  const createdAt = user.createdAt ?? new Date().toISOString();
  const record: SessionRecord = {
    sessionId,
    userId: user.userId,
    email: user.email,
    name: user.name,
    paypalPayerId: user.paypalPayerId,
    createdAt,
    expiresAt: Date.now() + TTL_MS,
  };
  sessions.set(sessionId, record);
  return {
    sessionId,
    user: {
      userId: record.userId,
      email: record.email,
      name: record.name,
      paypalPayerId: record.paypalPayerId,
      createdAt: record.createdAt,
    },
  };
}

export function resetSessionsForTests(): void {
  sessions.clear();
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || "paypilot-dev-session-secret";
}

function appendSetCookie(response: ServerResponse, value: string): void {
  const existing = response.getHeader("Set-Cookie");
  if (!existing) {
    response.setHeader("Set-Cookie", value);
    return;
  }
  if (Array.isArray(existing)) {
    response.setHeader("Set-Cookie", [...existing, value]);
    return;
  }
  response.setHeader("Set-Cookie", [String(existing), value]);
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, value] of sessions) {
    if (value.expiresAt < now) sessions.delete(key);
  }
}
