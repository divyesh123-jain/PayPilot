import { createPayPalFromEnv, PAYPAL_LOGIN_SCOPES, type PayPalUserInfo } from "../integrations/paypal.js";
import { createOAuthState, isMockAuthorizationCode, type OAuthPurpose } from "./oauth-state.js";
import { paymentModeFromEnv } from "./payment-adapter.js";

export function frontendOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return (env.FRONTEND_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}

export function authReturnUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.PAYPAL_AUTH_RETURN_URL ?? "http://localhost:8080/api/auth/paypal/callback";
}

export function connectReturnUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.PAYPAL_CONNECT_RETURN_URL ?? "http://localhost:8080/api/connections/paypal/oauth/callback";
}

export function shouldUseMockOAuth(env: NodeJS.ProcessEnv = process.env): boolean {
  const mode = paymentModeFromEnv(env);
  if (mode === "mock" || mode === "replay") return true;
  if (env.PAYPILOT_INTEGRATION_MODE === "mock") return true;
  return !env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET;
}

export function startPayPalOAuth(purpose: OAuthPurpose, returnTo?: string, env: NodeJS.ProcessEnv = process.env): string {
  const state = createOAuthState(purpose, returnTo);
  const redirectUri = purpose === "login" ? authReturnUrl(env) : connectReturnUrl(env);
  if (shouldUseMockOAuth(env)) {
    const callbackPath = purpose === "login" ? "/api/auth/paypal/callback" : "/api/connections/paypal/oauth/callback";
    const params = new URLSearchParams({
      code: `mock-${purpose}-local`,
      state: state.state,
    });
    // Relative so the browser/test hits the same API host that issued the start redirect.
    return `${callbackPath}?${params.toString()}`;
  }
  const client = createPayPalFromEnv(env);
  return client.buildAuthorizeUrl({
    redirectUri,
    state: state.state,
    scopes: PAYPAL_LOGIN_SCOPES,
  });
}

export async function resolvePayPalIdentity(code: string, env: NodeJS.ProcessEnv = process.env): Promise<PayPalUserInfo> {
  const client = createPayPalFromEnv({
    ...env,
    ...(shouldUseMockOAuth(env) || isMockAuthorizationCode(code)
      ? { PAYPILOT_INTEGRATION_MODE: "mock" }
      : {}),
  });
  const token = await client.exchangeAuthorizationCode(code);
  return client.getUserInfo(token.accessToken);
}

export function authUserFromIdentity(identity: PayPalUserInfo) {
  const paypalPayerId = identity.payerId ?? identity.userId;
  return {
    userId: `paypal:${paypalPayerId}`,
    email: identity.email ?? `${paypalPayerId}@paypal.local`,
    name: identity.name ?? "PayPal User",
    paypalPayerId,
  };
}
