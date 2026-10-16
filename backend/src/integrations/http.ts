import {
  IntegrationRequestError,
  IntegrationResponseError,
  type IntegrationProvider,
} from "./errors.js";

export type FetchLike = typeof fetch;

export async function readJson<T>(
  response: Response,
  provider: IntegrationProvider,
): Promise<T> {
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    throw new IntegrationRequestError(
      provider,
      `${provider} request failed with HTTP ${response.status}`,
      response.status,
      body,
    );
  }
  if (body === undefined) {
    throw new IntegrationResponseError(provider, `${provider} returned an empty response`, response.status);
  }
  return body as T;
}

export function requestFailure(provider: IntegrationProvider, error: unknown): never {
  if (error instanceof IntegrationRequestError || error instanceof IntegrationResponseError) throw error;
  const message = error instanceof Error ? error.message : "Unknown network error";
  throw new IntegrationRequestError(provider, `${provider} request could not be completed: ${message}`);
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
