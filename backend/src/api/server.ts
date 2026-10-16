import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ApiConflictError, ApiNotFoundError, createDefaultService, PayPilotService } from "./service.js";

const MAX_BODY_BYTES = 1_000_000;

export interface ApiServerOptions {
  readonly service?: PayPilotService;
}

export function createApiServer(options: ApiServerOptions = {}): Server {
  const service = options.service ?? createDefaultService();
  return createServer((request, response) => {
    void handleRequest(request, response, service);
  });
}

export async function handleRequest(request: IncomingMessage, response: ServerResponse, service: PayPilotService): Promise<void> {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  const url = new URL(request.url ?? "/", "http://localhost");
  try {
    if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { ok: true, paymentMode: service.paymentMode });
    if (request.method === "GET" && url.pathname === "/api/session") return sendJson(response, 200, service.session());
    if (request.method === "GET" && url.pathname === "/api/scenarios") return sendJson(response, 200, { data: [{ scenarioId: service.session().scenarioId, business: service.businessContext.profile }] });
    if (request.method === "GET" && (url.pathname === "/api/seed" || url.pathname === `/api/scenarios/${service.session().scenarioId}`)) {
      return sendJson(response, 200, { scenarioId: service.session().scenarioId, business: service.businessContext.profile, transactions: service.transactions(), policy: service.currentPolicy });
    }
    if (request.method === "GET" && url.pathname === "/api/transactions") return sendJson(response, 200, { data: service.transactions(), mode: service.paymentMode });
    if (request.method === "POST" && url.pathname === "/api/transactions/refresh") return sendJson(response, 200, { data: await service.refreshTransactions(), mode: service.paymentMode });
    if (request.method === "GET" && url.pathname === "/api/findings") return sendJson(response, 200, { data: service.findings() });
    if (request.method === "GET" && url.pathname === "/api/forecast") {
      const openingBalanceCents = optionalInteger(url.searchParams.get("openingBalanceCents"), "openingBalanceCents");
      const horizonDays = optionalInteger(url.searchParams.get("horizonDays"), "horizonDays");
      return sendJson(response, 200, service.forecast({
        ...(openingBalanceCents === undefined ? {} : { openingBalanceCents }),
        ...(horizonDays === undefined ? {} : { horizonDays }),
      }));
    }
    if (request.method === "GET" && url.pathname === "/api/proposals") return sendJson(response, 200, { data: service.listProposals() });
    const proposalReadMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)$/);
    if (request.method === "GET" && proposalReadMatch?.[1]) return sendJson(response, 200, service.getProposal(decodeURIComponent(proposalReadMatch[1])));
    if (request.method === "GET" && url.pathname === "/api/audit") return sendJson(response, 200, { data: service.auditEvents() });
    if (request.method === "GET" && url.pathname === "/api/audit/verify") return sendJson(response, 200, service.verifyAudit());
    if (request.method === "GET" && url.pathname === "/api/policy") return sendJson(response, 200, service.currentPolicy);
    if (request.method === "GET" && url.pathname === "/api/workflows") return sendJson(response, 200, { data: [] });
    if (request.method === "GET" && (url.pathname === "/api/stream" || url.pathname === "/api/events")) return stream(response, service);

    if (request.method !== "POST") return sendJson(response, 404, { error: "Route not found" });
    const body = await readJsonBody(request);
    if (url.pathname === "/api/simulate") return sendJson(response, 200, service.simulate(parseSimulationBody(body)));
    if (url.pathname === "/api/policy/parse") return sendJson(response, 200, service.parsePolicy(requiredString(body.text, "text")));
    if (url.pathname === "/api/policy" || url.pathname === "/api/policy/save") return sendJson(response, 200, service.savePolicy(parsePolicyBody(body)));
    if (url.pathname === "/api/workflows/parse") return sendJson(response, 200, service.parseWorkflow(requiredString(body.text, "text")));
    if (url.pathname === "/api/workflows/run") {
      const workflow = body.workflow && typeof body.workflow === "object" ? body.workflow as Parameters<PayPilotService["runWorkflow"]>[0] : service.parseWorkflow(requiredString(body.text, "text"));
      return sendJson(response, 200, service.runWorkflow(workflow));
    }
    if (url.pathname === "/api/webhooks/ingest" || url.pathname === "/api/webhooks/replay" || url.pathname === "/api/webhooks") {
      const event = url.pathname === "/api/webhooks/replay" && body.id === undefined
        ? { id: "replay-event-001", type: "PAYMENT.CAPTURE.COMPLETED", resource: { captureId: "capture-replay-001", amountCents: 12900 } }
        : body;
      return sendJson(response, 200, service.ingestWebhook(event, header(request, "idempotency-key")));
    }
    if (url.pathname === "/api/session") {
      if (body.businessType !== undefined) {
        const supported = ["freelancer", "ecommerce", "saas", "agency", "service", "creator"] as const;
        if (typeof body.businessType !== "string" || !supported.includes(body.businessType as (typeof supported)[number])) {
          throw new Error("businessType must be one of freelancer, ecommerce, saas, agency, service, or creator");
        }
        return sendJson(response, 200, service.setBusinessType(body.businessType as (typeof supported)[number]));
      }
      return sendJson(response, 200, service.session());
    }
    const proposalMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)\/(approve|reject|execute)$/);
    if (proposalMatch?.[1] && proposalMatch[2]) {
      const proposalId = decodeURIComponent(proposalMatch[1]);
      if (proposalMatch[2] === "approve") return sendJson(response, 200, service.approveProposal(proposalId));
      if (proposalMatch[2] === "reject") return sendJson(response, 200, service.rejectProposal(proposalId));
      return sendJson(response, 200, await service.executeProposal(proposalId));
    }
    return sendJson(response, 404, { error: "Route not found" });
  } catch (error) {
    const status = error instanceof ApiNotFoundError ? 404 : error instanceof ApiConflictError ? 409 : error instanceof Error && error.name === "PolicyViolationError" ? 403 : 400;
    sendJson(response, status, { error: error instanceof Error ? error.message : "Request failed", ...(error instanceof Error && "decision" in error ? { decision: (error as { decision: unknown }).decision } : {}) });
  }
}

function stream(response: ServerResponse, service: PayPilotService): void {
  response.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive" });
  response.write(`event: session\ndata: ${JSON.stringify(service.session())}\n\n`);
  const unsubscribe = service.subscribe((event, data) => response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  response.on("close", unsubscribe);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const payload = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
  response.end(payload);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON body must be an object");
  return parsed as Record<string, unknown>;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
  return value;
}

function optionalInteger(value: string | null, name: string): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}

function parseSimulationBody(body: Record<string, unknown>): { action?: "execute_payment" | "send_reminder" | "create_workflow" | "issue_refund" | "schedule_payment" | "export_data"; amountCents?: number; resourceId?: string; rationale?: string } {
  const actionValue = body.action === undefined ? undefined : requiredString(body.action, "action");
  const supported = ["execute_payment", "send_reminder", "create_workflow", "issue_refund", "schedule_payment", "export_data"] as const;
  const action = actionValue === undefined ? undefined : supported.find((candidate) => candidate === actionValue);
  if (actionValue !== undefined && action === undefined) throw new Error("action is not supported");
  const amountCents = body.amountCents === undefined ? undefined : integer(body.amountCents, "amountCents");
  return {
    ...(action === undefined ? {} : { action }),
    ...(amountCents === undefined ? {} : { amountCents }),
    ...(body.resourceId === undefined ? {} : { resourceId: requiredString(body.resourceId, "resourceId") }),
    ...(body.rationale === undefined ? {} : { rationale: requiredString(body.rationale, "rationale") }),
  };
}

function parsePolicyBody(body: Record<string, unknown>): { text?: string; policy?: import("../domain/policy.js").PolicySet } {
  if (body.text !== undefined) return { text: requiredString(body.text, "text") };
  if (!body.policy || typeof body.policy !== "object" || Array.isArray(body.policy)) throw new Error("policy or text is required");
  return { policy: body.policy as import("../domain/policy.js").PolicySet };
}

function integer(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer in cents`);
  return value;
}

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
