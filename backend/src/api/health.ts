import { isDbConfigured, testConnection } from "../db/client.js";
import { PAYPAL_SANDBOX_BASE_URL } from "../integrations/paypal.js";
import type { PaymentMode } from "./payment-adapter.js";
import { paymentModeFromEnv } from "./payment-adapter.js";

export interface HealthCheckOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly paymentMode?: PaymentMode;
  readonly checkDatabase?: boolean;
}

export interface HealthCheckResult {
  readonly ok: true;
  readonly status: "ok";
  readonly service: "paypilot-api";
  readonly timestamp: string;
  readonly uptimeSeconds: number;
  readonly paymentMode: PaymentMode;
  readonly paypal: {
    readonly configured: boolean;
    readonly baseUrl: string;
    readonly webhookConfigured: boolean;
  };
  readonly database: {
    readonly configured: boolean;
    readonly ok: boolean | null;
    readonly message?: string;
  };
}

const startedAt = Date.now();

export async function buildHealthCheck(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
  const env = options.env ?? process.env;
  const paymentMode = options.paymentMode ?? paymentModeFromEnv(env);
  const baseUrl = env.PAYPAL_BASE_URL ?? PAYPAL_SANDBOX_BASE_URL;
  const databaseConfigured = isDbConfigured();

  let databaseOk: boolean | null = null;
  let databaseMessage: string | undefined;
  if (options.checkDatabase && databaseConfigured) {
    const check = await testConnection();
    databaseOk = check.ok;
    databaseMessage = check.message;
  } else if (!databaseConfigured) {
    databaseOk = null;
    databaseMessage = "In-memory mode (DATABASE_URL not set)";
  }

  return {
    ok: true,
    status: "ok",
    service: "paypilot-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    paymentMode,
    paypal: {
      configured: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
      baseUrl,
      webhookConfigured: Boolean(env.PAYPAL_WEBHOOK_ID),
    },
    database: {
      configured: databaseConfigured,
      ok: databaseOk,
      ...(databaseMessage === undefined ? {} : { message: databaseMessage }),
    },
  };
}
