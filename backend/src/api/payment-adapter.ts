import type { TransactionInput } from "../domain/business-context.js";
import {
  createPayPalFromEnv,
  PAYPAL_SANDBOX_BASE_URL,
  PayPalClient,
  type PayPalOrder,
  type WebhookVerificationInput,
} from "../integrations/paypal.js";
import { replayTransactions, SEED_TRANSACTIONS } from "./fixtures.js";

export type PaymentMode = "live" | "mock" | "replay";

export interface PaymentExecutionInput {
  readonly amountCents: number;
  readonly currency: string;
  readonly reference?: string;
}

export interface PaymentExecution {
  readonly externalId: string;
  readonly status: "completed" | "pending";
  readonly amountCents: number;
  readonly currency: string;
}

export interface PayPalTransmissionHeaders {
  readonly transmissionId: string;
  readonly transmissionTime: string;
  readonly certUrl: string;
  readonly authAlgo: string;
  readonly transmissionSig: string;
}

export interface PaymentAdapter {
  readonly mode: PaymentMode;
  listTransactions(): Promise<readonly TransactionInput[]>;
  executePayment(input: PaymentExecutionInput): Promise<PaymentExecution>;
  /** Confirms sandbox/live credentials can mint an OAuth token. No-op in mock/replay. */
  verifyConnection(): Promise<{ ok: true; baseUrl: string }>;
  /** Verifies a PayPal webhook signature before the event is ingested. */
  verifyWebhook(event: Readonly<Record<string, unknown>>, headers: PayPalTransmissionHeaders): Promise<void>;
}

export interface PaymentAdapterOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly paypal?: PayPalClient;
}

export function paymentModeFromEnv(env: NodeJS.ProcessEnv = process.env): PaymentMode {
  const value = env.PAYMENT_MODE ?? "mock";
  if (value !== "live" && value !== "mock" && value !== "replay") {
    throw new Error("PAYMENT_MODE must be live, mock, or replay");
  }
  return value;
}

export function createPaymentAdapter(options: PaymentAdapterOptions = {}): PaymentAdapter {
  const env = options.env ?? process.env;
  const mode = paymentModeFromEnv(env);
  if (mode === "mock") return new FixturePaymentAdapter("mock", SEED_TRANSACTIONS, "mock-payment");
  if (mode === "replay") return new FixturePaymentAdapter("replay", replayTransactions(), "replay-payment");
  // PAYMENT_MODE=live always hits the configured PayPal host (sandbox by default).
  const paypal = options.paypal ?? createPayPalFromEnv({ ...env, PAYPILOT_INTEGRATION_MODE: "live" });
  return new LivePaymentAdapter(paypal, env.PAYPAL_WEBHOOK_ID, env.PAYPAL_BASE_URL ?? PAYPAL_SANDBOX_BASE_URL);
}

class FixturePaymentAdapter implements PaymentAdapter {
  public constructor(
    public readonly mode: "mock" | "replay",
    private readonly transactions: readonly TransactionInput[],
    private readonly idPrefix: string,
  ) {}

  public async listTransactions(): Promise<readonly TransactionInput[]> {
    return this.transactions.map((transaction) => ({ ...transaction }));
  }

  public async executePayment(input: PaymentExecutionInput): Promise<PaymentExecution> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("amountCents must be a positive integer");
    }
    return {
      externalId: `${this.idPrefix}-${input.amountCents}`,
      status: "completed",
      amountCents: input.amountCents,
      currency: input.currency,
    };
  }

  public async verifyConnection(): Promise<{ ok: true; baseUrl: string }> {
    return { ok: true, baseUrl: "mock://paypal" };
  }

  public async verifyWebhook(event: Readonly<Record<string, unknown>>, headers: PayPalTransmissionHeaders): Promise<void> {
    const client = new PayPalClient({ mode: "mock" });
    await client.verifyWebhookSignature({
      ...toVerificationInput(event, headers, "mock-webhook"),
    });
  }
}

class LivePaymentAdapter implements PaymentAdapter {
  public readonly mode = "live" as const;

  public constructor(
    private readonly client: PayPalClient,
    private readonly webhookId: string | undefined,
    private readonly baseUrl: string,
  ) {}

  public async listTransactions(): Promise<readonly TransactionInput[]> {
    const page = await this.client.listTransactions({
      startDate: "2020-01-01T00:00:00-00:00",
      endDate: "2099-12-31T23:59:59-00:00",
      pageSize: 100,
      page: 1,
    });
    return (page.transactionDetails ?? []).flatMap((item, index) => {
      const info = item.transactionInfo ?? {};
      const value = Number(info.transactionAmount && typeof info.transactionAmount === "object"
        ? (info.transactionAmount as { value?: string }).value
        : 0);
      if (!Number.isFinite(value) || value <= 0) return [];
      return [{
        id: String(info.transaction_id ?? `paypal-${index + 1}`),
        occurredAt: String(info.transaction_initiation_date ?? new Date(0).toISOString()),
        amountCents: Math.round(value * 100),
        direction: "inflow" as const,
        status: "completed" as const,
        ...(typeof item.payerInfo?.email_address === "string" ? { counterparty: item.payerInfo.email_address } : {}),
      }];
    });
  }

  public async executePayment(input: PaymentExecutionInput): Promise<PaymentExecution> {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("amountCents must be a positive integer");
    }
    const created: PayPalOrder = await this.client.createOrder({
      intent: "CAPTURE",
      purchase_units: [{
        ...(input.reference === undefined ? {} : { reference_id: input.reference }),
        amount: { currency_code: input.currency, value: (input.amountCents / 100).toFixed(2) },
      }],
    });
    // Capture only after buyer approval; otherwise leave the sandbox order pending.
    let order = created;
    if (created.status === "APPROVED") {
      try {
        order = await this.client.captureOrder(created.id);
      } catch {
        order = created;
      }
    }
    return {
      externalId: order.id,
      status: order.status === "COMPLETED" ? "completed" : "pending",
      amountCents: input.amountCents,
      currency: input.currency,
    };
  }

  public async verifyConnection(): Promise<{ ok: true; baseUrl: string }> {
    await this.client.getAccessToken();
    return { ok: true, baseUrl: this.baseUrl };
  }

  public async verifyWebhook(event: Readonly<Record<string, unknown>>, headers: PayPalTransmissionHeaders): Promise<void> {
    if (!this.webhookId) {
      throw new Error("PAYPAL_WEBHOOK_ID is required to verify PayPal sandbox webhooks");
    }
    await this.client.verifyWebhookSignature(toVerificationInput(event, headers, this.webhookId));
  }
}

function toVerificationInput(
  event: Readonly<Record<string, unknown>>,
  headers: PayPalTransmissionHeaders,
  webhookId: string,
): WebhookVerificationInput {
  return {
    transmissionId: headers.transmissionId,
    transmissionTime: headers.transmissionTime,
    certUrl: headers.certUrl,
    authAlgo: headers.authAlgo,
    transmissionSig: headers.transmissionSig,
    webhookId,
    webhookEvent: event,
  };
}
