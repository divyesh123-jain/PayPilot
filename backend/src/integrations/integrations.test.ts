import assert from "node:assert/strict";
import test from "node:test";
import {
  IntegrationConfigurationError,
  PayPalClient,
  WebhookVerificationError,
  createModelClientFromEnv,
  type FetchLike,
} from "./index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("PayPal constructs sandbox OAuth and order requests with typed payloads", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: FetchLike = async (input, init = {}) => {
    requests.push({ url: String(input), init });
    if (String(input).endsWith("/v1/oauth2/token")) {
      return jsonResponse({ access_token: "access-token", token_type: "Bearer", expires_in: 3600 });
    }
    return jsonResponse({ id: "order-123", status: "CREATED" });
  };
  const paypal = new PayPalClient({ clientId: "client-id", clientSecret: "client-secret", fetchImpl });

  await paypal.createOrder({
    purchase_units: [{ amount: { currency_code: "USD", value: "12.50" }, reference_id: "invoice-1" }],
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.url, "https://api-m.sandbox.paypal.com/v1/oauth2/token");
  assert.equal(requests[0]?.init.method, "POST");
  assert.equal(requests[0]?.init.headers && (requests[0].init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);
  assert.equal(requests[0]?.init.body, "grant_type=client_credentials");
  assert.equal(requests[1]?.url, "https://api-m.sandbox.paypal.com/v2/checkout/orders");
  assert.deepEqual(JSON.parse(String(requests[1]?.init.body)), {
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: "USD", value: "12.50" }, reference_id: "invoice-1" }],
  });
});

test("PayPal webhook verification rejects a failed verification response", async () => {
  let call = 0;
  const fetchImpl: FetchLike = async () => {
    call += 1;
    if (call === 1) return jsonResponse({ access_token: "access-token", token_type: "Bearer", expires_in: 3600 });
    return jsonResponse({ verificationStatus: "FAILURE" });
  };
  const paypal = new PayPalClient({ clientId: "client-id", clientSecret: "client-secret", fetchImpl });

  await assert.rejects(
    paypal.verifyWebhookSignature({
      transmissionId: "transmission-1",
      transmissionTime: "2026-10-15T12:00:00Z",
      certUrl: "https://api-m.paypal.com/cert",
      authAlgo: "SHA256withRSA",
      transmissionSig: "signature",
      webhookId: "webhook-1",
      webhookEvent: { event_type: "PAYMENT.CAPTURE.COMPLETED" },
    }),
    (error: unknown) => error instanceof WebhookVerificationError && error.code === "WEBHOOK_VERIFICATION_FAILED",
  );
});

test("missing PayPal credentials fail before fetch is called", async () => {
  let fetchCalled = false;
  const fetchImpl: FetchLike = async () => {
    fetchCalled = true;
    return jsonResponse({});
  };
  const paypal = new PayPalClient({ fetchImpl });

  await assert.rejects(paypal.getAccessToken(), (error: unknown) => error instanceof IntegrationConfigurationError && error.provider === "paypal");
  assert.equal(fetchCalled, false);
});

test("PayPal sandbox factory defaults to the sandbox API host", async () => {
  const requests: string[] = [];
  const fetchImpl: FetchLike = async (input) => {
    requests.push(String(input));
    return jsonResponse({ access_token: "access-token", token_type: "Bearer", expires_in: 3600 });
  };
  const { createPayPalFromEnv } = await import("./paypal.js");
  const paypal = createPayPalFromEnv({
    PAYPILOT_INTEGRATION_MODE: "live",
    PAYPAL_CLIENT_ID: "sandbox-client",
    PAYPAL_CLIENT_SECRET: "sandbox-secret",
  }, fetchImpl);

  await paypal.getAccessToken();
  assert.equal(requests[0], "https://api-m.sandbox.paypal.com/v1/oauth2/token");
});

test("model provider factory falls back to deterministic local output without credentials", async () => {
  let fetchCalled = false;
  const fetchImpl: FetchLike = async () => {
    fetchCalled = true;
    return jsonResponse({});
  };
  const client = createModelClientFromEnv({ env: {}, fetchImpl });
  const result = await client.generateText({ prompt: "forecast cash flow" });

  assert.equal(result.provider, "mock");
  assert.equal(result.text, "PayPilot mock response: forecast cash flow");
  assert.equal(fetchCalled, false);
});

test("selected Gemini provider constructs the documented generateContent request", async () => {
  let request: { url: string; init: RequestInit } | undefined;
  const fetchImpl: FetchLike = async (input, init = {}) => {
    request = { url: String(input), init };
    return jsonResponse({ candidates: [{ content: { parts: [{ text: "ready" }] } }] });
  };
  const client = createModelClientFromEnv({
    env: { PAYPILOT_AI_PROVIDER: "gemini", GEMINI_API_KEY: "secret", GEMINI_MODEL: "gemini-3.5-flash-lite" },
    fetchImpl,
  });
  const result = await client.generateText({ prompt: "Say ready", maxOutputTokens: 8 });

  assert.equal(result.text, "ready");
  assert.equal(request?.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=secret");
  assert.deepEqual(JSON.parse(String(request?.init.body)), {
    contents: [{ role: "user", parts: [{ text: "Say ready" }] }],
    generationConfig: { maxOutputTokens: 8 },
  });
});
