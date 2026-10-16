import {
  IntegrationConfigurationError,
  IntegrationResponseError,
  WebhookVerificationError,
} from "./errors.js";
import { joinUrl, readJson, requestFailure, type FetchLike } from "./http.js";

export const PAYPAL_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";

export type PayPalMode = "live" | "mock";
export type PayPalCurrency = "USD" | string;

export interface PayPalClientOptions {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly baseUrl?: string;
  readonly mode?: PayPalMode;
  readonly fetchImpl?: FetchLike;
}

export interface PayPalOAuthToken {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly scope?: string;
}

interface PayPalOAuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export interface PayPalOAuthAdapter {
  getAccessToken(): Promise<PayPalOAuthToken>;
}

export interface PayPalAmount {
  readonly currency_code: PayPalCurrency;
  readonly value: string;
}

export interface PayPalPurchaseUnit {
  readonly reference_id?: string;
  readonly amount: PayPalAmount;
  readonly description?: string;
}

export interface CreateOrderRequest {
  readonly intent?: "CAPTURE" | "AUTHORIZE";
  readonly purchase_units: readonly PayPalPurchaseUnit[];
  readonly application_context?: Readonly<Record<string, unknown>>;
}

export interface PayPalLink {
  readonly href: string;
  readonly rel: string;
  readonly method?: string;
}

export interface PayPalOrder {
  readonly id: string;
  readonly status?: string;
  readonly intent?: string;
  readonly purchase_units?: readonly PayPalPurchaseUnit[];
  readonly links?: readonly PayPalLink[];
  readonly [key: string]: unknown;
}

export interface PayPalOrdersAdapter {
  createOrder(request: CreateOrderRequest): Promise<PayPalOrder>;
  getOrder(orderId: string): Promise<PayPalOrder>;
}

export interface PayPalCapturesAdapter {
  captureOrder(orderId: string): Promise<PayPalOrder>;
}

export interface RefundRequest {
  readonly amount?: PayPalAmount;
  readonly invoice_id?: string;
  readonly note_to_payer?: string;
}

export interface PayPalRefund {
  readonly id: string;
  readonly status?: string;
  readonly amount?: PayPalAmount;
  readonly [key: string]: unknown;
}

export interface PayPalRefundsAdapter {
  refundCapture(captureId: string, request?: RefundRequest): Promise<PayPalRefund>;
}

export interface CreateInvoiceRequest {
  readonly detail: Readonly<Record<string, unknown>>;
  readonly invoicer: Readonly<Record<string, unknown>>;
  readonly primary_recipients: readonly Readonly<Record<string, unknown>>[];
  readonly items?: readonly Readonly<Record<string, unknown>>[];
}

export interface PayPalInvoice {
  readonly id?: string;
  readonly status?: string;
  readonly [key: string]: unknown;
}

export interface PayPalInvoicesAdapter {
  createInvoice(request: CreateInvoiceRequest): Promise<PayPalInvoice>;
  sendInvoice(invoiceId: string): Promise<void>;
  getInvoice(invoiceId: string): Promise<PayPalInvoice>;
}

export interface TransactionQuery {
  readonly startDate: string;
  readonly endDate: string;
  readonly transactionId?: string;
  readonly transactionStatus?: string;
  readonly pageSize?: number;
  readonly page?: number;
}

export interface PayPalTransaction {
  readonly transactionInfo?: Readonly<Record<string, unknown>>;
  readonly payerInfo?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export interface PayPalTransactionPage {
  readonly transactionDetails?: readonly PayPalTransaction[];
  readonly totalItems?: number;
  readonly totalPages?: number;
  readonly [key: string]: unknown;
}

export interface PayPalTransactionsAdapter {
  listTransactions(query: TransactionQuery): Promise<PayPalTransactionPage>;
}

export interface WebhookVerificationInput {
  readonly transmissionId: string;
  readonly transmissionTime: string;
  readonly certUrl: string;
  readonly authAlgo: string;
  readonly transmissionSig: string;
  readonly webhookId: string;
  readonly webhookEvent: Readonly<Record<string, unknown>>;
}

export interface WebhookVerificationResult {
  readonly verificationStatus: "SUCCESS" | "FAILURE";
}

export interface PayPalWebhooksAdapter {
  verifyWebhookSignature(input: WebhookVerificationInput): Promise<WebhookVerificationResult>;
}

export type PayPalIntegrations = PayPalOAuthAdapter &
  PayPalOrdersAdapter &
  PayPalCapturesAdapter &
  PayPalRefundsAdapter &
  PayPalInvoicesAdapter &
  PayPalTransactionsAdapter &
  PayPalWebhooksAdapter;

type TokenCache = { token: PayPalOAuthToken; expiresAt: number };

export class PayPalClient implements PayPalIntegrations {
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly mode: PayPalMode;
  private readonly fetchImpl: FetchLike;
  private tokenCache?: TokenCache;

  public constructor(options: PayPalClientOptions = {}) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.baseUrl = options.baseUrl ?? PAYPAL_SANDBOX_BASE_URL;
    this.mode = options.mode ?? "live";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async getAccessToken(): Promise<PayPalOAuthToken> {
    this.assertLiveCredentials();
    if (this.mode === "mock") return mockAccessToken();
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 30_000) return this.tokenCache.token;
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    let response: Response;
    try {
      response = await this.fetchImpl(joinUrl(this.baseUrl, "/v1/oauth2/token"), {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
    } catch (error) {
      return requestFailure("paypal", error);
    }
    const raw = await readJson<PayPalOAuthResponse>(response, "paypal");
    if (!raw.access_token || !raw.token_type || typeof raw.expires_in !== "number") {
      throw new IntegrationResponseError("paypal", "PayPal OAuth response is missing token fields", response.status, raw);
    }
    const token: PayPalOAuthToken = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      expiresIn: raw.expires_in,
      ...(raw.scope === undefined ? {} : { scope: raw.scope }),
    };
    this.tokenCache = { token, expiresAt: now + raw.expires_in * 1000 };
    return token;
  }

  public async createOrder(request: CreateOrderRequest): Promise<PayPalOrder> {
    if (this.mode === "mock") return mockOrder(request);
    return this.request<PayPalOrder>("/v2/checkout/orders", { method: "POST", body: { intent: "CAPTURE", ...request } });
  }

  public async getOrder(orderId: string): Promise<PayPalOrder> {
    if (this.mode === "mock") return { id: orderId, status: "COMPLETED" };
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
  }

  public async captureOrder(orderId: string): Promise<PayPalOrder> {
    if (this.mode === "mock") return { id: orderId, status: "COMPLETED" };
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST" });
  }

  public async refundCapture(captureId: string, request?: RefundRequest): Promise<PayPalRefund> {
    if (this.mode === "mock") return { id: `mock-refund-${captureId}`, status: "COMPLETED" };
    return this.request<PayPalRefund>(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
      method: "POST",
      ...(request === undefined ? {} : { body: request }),
    });
  }

  public async createInvoice(request: CreateInvoiceRequest): Promise<PayPalInvoice> {
    if (this.mode === "mock") return { id: "mock-invoice-1", status: "DRAFT", ...request };
    return this.request<PayPalInvoice>("/v2/invoicing/invoices", { method: "POST", body: request });
  }

  public async sendInvoice(invoiceId: string): Promise<void> {
    if (this.mode === "mock") return;
    await this.request<undefined>(`/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/send`, { method: "POST", allowEmpty: true });
  }

  public async getInvoice(invoiceId: string): Promise<PayPalInvoice> {
    if (this.mode === "mock") return { id: invoiceId, status: "DRAFT" };
    return this.request<PayPalInvoice>(`/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}`, { method: "GET" });
  }

  public async listTransactions(query: TransactionQuery): Promise<PayPalTransactionPage> {
    if (this.mode === "mock") return { transactionDetails: [], totalItems: 0, totalPages: 0 };
    const params = new URLSearchParams({ start_date: query.startDate, end_date: query.endDate });
    if (query.transactionId) params.set("transaction_id", query.transactionId);
    if (query.transactionStatus) params.set("transaction_status", query.transactionStatus);
    if (query.pageSize !== undefined) params.set("page_size", String(query.pageSize));
    if (query.page !== undefined) params.set("page", String(query.page));
    return this.request<PayPalTransactionPage>(`/v1/reporting/transactions?${params.toString()}`, { method: "GET" });
  }

  public async verifyWebhookSignature(input: WebhookVerificationInput): Promise<WebhookVerificationResult> {
    if (this.mode === "mock") {
      if (input.webhookId === "mock-webhook" && input.transmissionSig === "mock-signature") return { verificationStatus: "SUCCESS" };
      throw new WebhookVerificationError("PayPal mock webhook verification failed", { verificationStatus: "FAILURE" });
    }
    const result = await this.request<WebhookVerificationResult>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: {
        auth_algo: input.authAlgo,
        cert_url: input.certUrl,
        transmission_id: input.transmissionId,
        transmission_sig: input.transmissionSig,
        transmission_time: input.transmissionTime,
        webhook_event: input.webhookEvent,
        webhook_id: input.webhookId,
      },
    });
    if (result.verificationStatus !== "SUCCESS") {
      throw new WebhookVerificationError("PayPal webhook verification failed", result);
    }
    return result;
  }

  private assertLiveCredentials(): void {
    if (this.mode === "mock") return;
    if (!this.clientId || !this.clientSecret) {
      throw new IntegrationConfigurationError("paypal", "PayPal sandbox credentials are required; set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET or use mock mode");
    }
  }

  private async request<T>(path: string, options: { method: string; body?: unknown; allowEmpty?: boolean }): Promise<T> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = { Authorization: `Bearer ${token.accessToken}`, Accept: "application/json" };
    const init: RequestInit = { method: options.method, headers };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    let response: Response;
    try {
      response = await this.fetchImpl(joinUrl(this.baseUrl, path), init);
    } catch (error) {
      return requestFailure("paypal", error);
    }
    if (options.allowEmpty && response.status === 204) return undefined as T;
    return readJson<T>(response, "paypal");
  }
}

function mockAccessToken(): PayPalOAuthToken {
  return { accessToken: "mock-paypal-access-token", tokenType: "Bearer", expiresIn: 3600, scope: "mock" };
}

function mockOrder(request: CreateOrderRequest): PayPalOrder {
  return { id: "mock-order-1", status: "CREATED", intent: request.intent ?? "CAPTURE", purchase_units: request.purchase_units };
}

export function createPayPalFromEnv(env: NodeJS.ProcessEnv = process.env, fetchImpl?: FetchLike): PayPalClient {
  const mode: PayPalMode = env.PAYPILOT_INTEGRATION_MODE === "mock" ? "mock" : "live";
  return new PayPalClient({
    mode,
    ...(env.PAYPAL_CLIENT_ID === undefined ? {} : { clientId: env.PAYPAL_CLIENT_ID }),
    ...(env.PAYPAL_CLIENT_SECRET === undefined ? {} : { clientSecret: env.PAYPAL_CLIENT_SECRET }),
    ...(env.PAYPAL_BASE_URL === undefined ? {} : { baseUrl: env.PAYPAL_BASE_URL }),
    ...(fetchImpl === undefined ? {} : { fetchImpl }),
  });
}
