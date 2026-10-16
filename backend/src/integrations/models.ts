import { IntegrationConfigurationError, IntegrationResponseError } from "./errors.js";
import { joinUrl, readJson, requestFailure, type FetchLike } from "./http.js";

export type ModelProvider = "nvidia-nemo" | "gemini" | "mock";
export type ModelMode = "live" | "mock";

export interface TextGenerationRequest {
  readonly prompt: string;
  readonly systemInstruction?: string;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
}

export interface TextGenerationResponse {
  readonly provider: ModelProvider;
  readonly model: string;
  readonly text: string;
  readonly raw?: unknown;
}

export interface ModelClient {
  readonly provider: ModelProvider;
  readonly model: string;
  generateText(request: TextGenerationRequest): Promise<TextGenerationResponse>;
}

export interface ModelClientOptions {
  readonly apiKey?: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly mode?: ModelMode;
  readonly fetchImpl?: FetchLike;
}

type OpenAIChatResponse = { choices?: readonly { message?: { content?: string } }[] };

export class NvidiaNemoClient implements ModelClient {
  public readonly provider = "nvidia-nemo" as const;
  public readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly mode: ModelMode;
  private readonly fetchImpl: FetchLike;

  public constructor(options: ModelClientOptions) {
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.mode = options.mode ?? "live";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (this.mode === "mock") return mockText(this.provider, this.model, request);
    if (!this.apiKey) throw new IntegrationConfigurationError(this.provider, "NVIDIA NeMo API key is required; set NVIDIA_NEMO_API_KEY or use mock mode");
    const messages = [
      ...(request.systemInstruction ? [{ role: "system", content: request.systemInstruction }] : []),
      { role: "user", content: request.prompt },
    ];
    const body = {
      model: this.model,
      messages,
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      ...(request.maxOutputTokens === undefined ? {} : { max_tokens: request.maxOutputTokens }),
    };
    let response: Response;
    try {
      response = await this.fetchImpl(joinUrl(this.baseUrl, "/chat/completions"), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      return requestFailure(this.provider, error);
    }
    const raw = await readJson<OpenAIChatResponse>(response, this.provider);
    const text = raw.choices?.[0]?.message?.content;
    if (!text) throw new IntegrationResponseError(this.provider, "NVIDIA NeMo response did not include choices[0].message.content", response.status, raw);
    return { provider: this.provider, model: this.model, text, raw };
  }
}

type GeminiResponse = { candidates?: readonly { content?: { parts?: readonly { text?: string }[] } }[] };

export class GeminiClient implements ModelClient {
  public readonly provider = "gemini" as const;
  public readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly mode: ModelMode;
  private readonly fetchImpl: FetchLike;

  public constructor(options: ModelClientOptions) {
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.mode = options.mode ?? "live";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    if (this.mode === "mock") return mockText(this.provider, this.model, request);
    if (!this.apiKey) throw new IntegrationConfigurationError(this.provider, "Gemini API key is required; set GEMINI_API_KEY or use mock mode");
    const url = `${joinUrl(this.baseUrl, `/models/${encodeURIComponent(this.model)}:generateContent`)}?key=${encodeURIComponent(this.apiKey)}`;
    const body = {
      ...(request.systemInstruction ? { systemInstruction: { parts: [{ text: request.systemInstruction }] } } : {}),
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      ...(request.temperature === undefined && request.maxOutputTokens === undefined
        ? {}
        : { generationConfig: { ...(request.temperature === undefined ? {} : { temperature: request.temperature }), ...(request.maxOutputTokens === undefined ? {} : { maxOutputTokens: request.maxOutputTokens }) } }),
    };
    let response: Response;
    try {
      response = await this.fetchImpl(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    } catch (error) {
      return requestFailure(this.provider, error);
    }
    const raw = await readJson<GeminiResponse>(response, this.provider);
    const text = raw.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new IntegrationResponseError(this.provider, "Gemini response did not include candidates[0].content.parts text", response.status, raw);
    return { provider: this.provider, model: this.model, text, raw };
  }
}

export class MockModelClient implements ModelClient {
  public readonly provider = "mock" as const;
  public readonly model = "paypilot-deterministic";

  public async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    return mockText(this.provider, this.model, request);
  }
}

export interface ModelClientFactoryOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: FetchLike;
}

export function createModelClientFromEnv(options: ModelClientFactoryOptions = {}): ModelClient {
  const env = options.env ?? process.env;
  if (env.PAYPILOT_INTEGRATION_MODE === "mock") return new MockModelClient();
  const provider = env.PAYPILOT_AI_PROVIDER?.toLowerCase();
  if (provider === "nvidia" || provider === "nvidia-nemo") {
    return new NvidiaNemoClient({
      model: env.NVIDIA_NEMO_MODEL ?? "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      baseUrl: env.NVIDIA_NEMO_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
      ...(env.NVIDIA_NEMO_API_KEY === undefined ? {} : { apiKey: env.NVIDIA_NEMO_API_KEY }),
      ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    });
  }
  if (provider === "gemini") {
    return new GeminiClient({
      model: env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
      baseUrl: env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta",
      ...(env.GEMINI_API_KEY === undefined ? {} : { apiKey: env.GEMINI_API_KEY }),
      ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    });
  }
  return new MockModelClient();
}

function mockText(provider: ModelProvider, model: string, request: TextGenerationRequest): TextGenerationResponse {
  return { provider, model, text: `PayPilot mock response: ${request.prompt.trim()}`, raw: { deterministic: true } };
}
