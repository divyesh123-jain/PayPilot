export type IntegrationProvider = "paypal" | "nvidia-nemo" | "gemini";

export type IntegrationErrorCode =
  | "MISSING_CREDENTIALS"
  | "INVALID_CONFIGURATION"
  | "REQUEST_FAILED"
  | "INVALID_RESPONSE"
  | "WEBHOOK_VERIFICATION_FAILED";

export class IntegrationError extends Error {
  public readonly name: string = "IntegrationError";

  public constructor(
    message: string,
    public readonly code: IntegrationErrorCode,
    public readonly provider: IntegrationProvider,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class IntegrationConfigurationError extends IntegrationError {
  public readonly name = "IntegrationConfigurationError";

  public constructor(provider: IntegrationProvider, message: string) {
    super(message, "MISSING_CREDENTIALS", provider);
  }
}

export class IntegrationRequestError extends IntegrationError {
  public readonly name = "IntegrationRequestError";

  public constructor(provider: IntegrationProvider, message: string, status?: number, details?: unknown) {
    super(message, "REQUEST_FAILED", provider, status, details);
  }
}

export class IntegrationResponseError extends IntegrationError {
  public readonly name = "IntegrationResponseError";

  public constructor(provider: IntegrationProvider, message: string, status?: number, details?: unknown) {
    super(message, "INVALID_RESPONSE", provider, status, details);
  }
}

export class WebhookVerificationError extends IntegrationError {
  public readonly name = "WebhookVerificationError";

  public constructor(message: string, details?: unknown) {
    super(message, "WEBHOOK_VERIFICATION_FAILED", "paypal", undefined, details);
  }
}
