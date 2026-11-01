import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { WebhookVerificationError } from "../integrations/errors.js";
import { buildHealthCheck } from "./health.js";
import type { PayPalTransmissionHeaders } from "./payment-adapter.js";
import { ApiConflictError, ApiNotFoundError, createDefaultService, PayPilotService, type AgentActor } from "./service.js";

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
    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
      const deep = url.searchParams.get("deep") === "1" || url.searchParams.get("deep") === "true";
      return sendJson(response, 200, await buildHealthCheck({
        paymentMode: service.paymentMode,
        checkDatabase: deep,
      }));
    }
    if (request.method === "GET" && url.pathname === "/api/session") return sendJson(response, 200, service.session());
    if (request.method === "GET" && url.pathname === "/api/onboarding") return sendJson(response, 200, service.onboarding());
    if (request.method === "GET" && (url.pathname === "/api/connections" || url.pathname === "/api/connections/paypal")) return sendJson(response, 200, { data: [service.connection()] });
    if (request.method === "GET" && url.pathname === "/api/lifecycle") return sendJson(response, 200, service.lifecycle());
    if (request.method === "GET" && url.pathname === "/api/notifications") return sendJson(response, 200, { data: service.notificationsList() });
    if (request.method === "GET" && (url.pathname === "/api/profile" || url.pathname === "/api/business/profile")) return sendJson(response, 200, service.profile());
    if (request.method === "GET" && (url.pathname === "/api/clients" || url.pathname === "/api/business/clients")) return sendJson(response, 200, { data: service.clients() });
    const clientMatch = url.pathname.match(/^\/api\/clients\/([^/]+)$/);
    if (request.method === "GET" && clientMatch?.[1]) return sendJson(response, 200, service.client(decodeURIComponent(clientMatch[1])));
    const clientProfileMatch = url.pathname.match(/^\/api\/clients\/([^/]+)\/profile$/);
    if (request.method === "GET" && clientProfileMatch?.[1]) return sendJson(response, 200, service.client(decodeURIComponent(clientProfileMatch[1])));
    if (request.method === "GET" && url.pathname === "/api/business") return sendJson(response, 200, service.profile());
    if (request.method === "GET" && url.pathname === "/api/scenarios") return sendJson(response, 200, { data: [{ scenarioId: service.session().scenarioId, business: service.businessContext.profile }] });
    if (request.method === "GET" && (url.pathname === "/api/seed" || url.pathname === `/api/scenarios/${service.session().scenarioId}`)) {
      return sendJson(response, 200, { scenarioId: service.session().scenarioId, business: service.businessContext.profile, transactions: service.transactions(), policy: service.currentPolicy });
    }
    if (request.method === "GET" && url.pathname === "/api/transactions") return sendJson(response, 200, { ...service.transactionPage(transactionQuery(url)), mode: service.paymentMode });
    const transactionMatch = url.pathname.match(/^\/api\/transactions\/([^/]+)$/);
    if (request.method === "GET" && transactionMatch?.[1]) {
      const transactionId = transactionMatch[1];
      const transaction = service.transactions().find((candidate) => candidate.id === decodeURIComponent(transactionId));
      if (!transaction) throw new ApiNotFoundError(`Transaction ${decodeURIComponent(transactionId)} was not found`);
      return sendJson(response, 200, transaction);
    }
    if (request.method === "POST" && url.pathname === "/api/transactions/refresh") return sendJson(response, 200, { data: await service.refreshTransactions(), mode: service.paymentMode });
    if (request.method === "GET" && url.pathname === "/api/findings") {
      const severity = url.searchParams.get("severity");
      if (severity !== null && !["info", "warning", "critical"].includes(severity)) throw new Error("severity must be info, warning, or critical");
      const findings = severity === null ? service.findings() : service.findings().filter((finding) => finding.severity === severity);
      return sendJson(response, 200, { data: findings });
    }
    if (request.method === "GET" && (url.pathname === "/api/policy/violations" || url.pathname === "/api/violations")) return sendJson(response, 200, { data: service.policyViolations() });
    if (request.method === "GET" && url.pathname === "/api/forecast") {
      const openingBalanceCents = optionalInteger(url.searchParams.get("openingBalanceCents"), "openingBalanceCents");
      const horizonDays = optionalInteger(url.searchParams.get("horizonDays") ?? url.searchParams.get("days"), "horizonDays");
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
    if (request.method === "GET" && (url.pathname === "/api/policy" || url.pathname === "/api/policies")) return sendJson(response, 200, service.currentPolicy);
    if (request.method === "GET" && url.pathname === "/api/workflows") return sendJson(response, 200, { data: service.listWorkflows() });
    const workflowReadMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
    if (request.method === "GET" && workflowReadMatch?.[1]) return sendJson(response, 200, service.getWorkflow(decodeURIComponent(workflowReadMatch[1])));
    if (request.method === "GET" && (url.pathname === "/api/dev/replay" || url.pathname === "/api/dev/replay/state")) return sendJson(response, 200, { session: service.session(), transactions: service.transactions(), mode: service.paymentMode });
    if (request.method === "GET" && (url.pathname === "/api/stream" || url.pathname === "/api/events")) return stream(response, service);

    if (request.method !== "POST") return sendJson(response, 404, { error: "Route not found" });
    if (url.pathname === "/api/webhooks/paypal" || url.pathname === "/api/webhook/paypal") {
      const raw = await readRawBody(request);
      const event = parseJsonObject(raw);
      const headers = paypalTransmissionHeaders(request);
      return sendJson(response, 200, await service.ingestPayPalWebhook(event, headers, header(request, "idempotency-key") ?? String(event.id ?? "")));
    }
    const body = await readJsonBody(request);
    if (url.pathname === "/api/agent/chat") {
      const prompt = requiredString(body.prompt ?? body.text ?? body.message, "prompt");
      return sendJson(response, 200, await service.agentChat(prompt, actorFrom(request, body)));
    }
    if (url.pathname === "/api/simulate") {
      const simulationInput = parseSimulationBody(body);
      if (simulationInput.discountPct !== undefined) {
        return sendJson(response, 200, service.simulateWhatIf({
          amountCents: simulationInput.amountCents ?? 220_000,
          discountPct: simulationInput.discountPct,
          waitProbability: simulationInput.waitProbability ?? 0.6,
          waitDays: simulationInput.waitDays ?? 7,
        }));
      }
      return sendJson(response, 200, service.simulate(simulationInput));
    }
    if (url.pathname === "/api/policy/parse" || url.pathname === "/api/policies/parse") return sendJson(response, 200, service.parsePolicy(requiredString(body.text, "text")));
    if (url.pathname === "/api/policy" || url.pathname === "/api/policy/save" || url.pathname === "/api/policies") return sendJson(response, 200, service.savePolicy(parsePolicyBody(body)));
    if (url.pathname === "/api/workflows/parse") return sendJson(response, 200, service.parseWorkflow(requiredString(body.text, "text")));
    if (url.pathname === "/api/workflows") {
      const workflow = body.workflow && typeof body.workflow === "object" && !Array.isArray(body.workflow)
        ? body.workflow as Parameters<PayPilotService["createWorkflow"]>[0]
        : service.parseWorkflow(requiredString(body.text, "text"));
      return sendJson(response, 201, service.createWorkflow(workflow));
    }
    if (url.pathname === "/api/workflows/run") {
      const workflow = typeof body.workflowId === "string" ? body.workflowId : body.workflow && typeof body.workflow === "object" ? body.workflow as Parameters<PayPilotService["runWorkflow"]>[0] : service.parseWorkflow(requiredString(body.text, "text"));
      return sendJson(response, 200, service.runWorkflow(workflow));
    }
    if (url.pathname === "/api/dev/replay" || url.pathname === "/api/dev/replay/state") return sendJson(response, 200, service.replayState());
    if (url.pathname === "/api/dev/reset" || url.pathname === "/api/dev/replay/reset") return sendJson(response, 200, service.resetState());
    if (url.pathname === "/api/onboarding/reset") {
      const asNewbie = body.asNewbie !== false;
      return sendJson(response, 200, service.resetOnboarding(asNewbie));
    }
    if (url.pathname === "/api/onboarding" || url.pathname === "/api/onboarding/advance") {
      const stepId = requiredString(body.stepId, "stepId");
      const status = body.status === undefined ? "complete" : requiredString(body.status, "status");
      if (status !== "in_progress" && status !== "complete" && status !== "skipped") throw new Error("status must be in_progress, complete, or skipped");
      return sendJson(response, 200, service.advanceOnboarding(stepId, status, body.metadata as Record<string, unknown> | undefined));
    }
    if (url.pathname === "/api/connections/paypal/connect" || url.pathname === "/api/connections/connect") {
      return sendJson(response, 200, await service.connectPayPal());
    }
    if (url.pathname === "/api/connections/paypal/disconnect" || url.pathname === "/api/lifecycle/disconnect") return sendJson(response, 200, service.disconnectPayPal());
    if (url.pathname === "/api/lifecycle/pause") return sendJson(response, 200, service.pauseAgent());
    if (url.pathname === "/api/lifecycle/resume") return sendJson(response, 200, service.resumeAgent());
    if (url.pathname === "/api/lifecycle/export") return sendJson(response, 200, service.createExport());
    if (url.pathname === "/api/lifecycle/delete") return sendJson(response, 200, service.scheduleDeletion());
    const notificationMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (notificationMatch?.[1]) return sendJson(response, 200, service.markNotificationRead(decodeURIComponent(notificationMatch[1])));
    if (url.pathname === "/api/webhooks/ingest" || url.pathname === "/api/webhooks/replay" || url.pathname === "/api/webhooks") {
      const event = url.pathname === "/api/webhooks/replay" && body.id === undefined
        ? { id: "replay-event-001", type: "PAYMENT.CAPTURE.COMPLETED", resource: { captureId: "capture-replay-001", amountCents: 12900 } }
        : body;
      return sendJson(response, 200, service.ingestWebhook(event, header(request, "idempotency-key")));
    }
    if (url.pathname === "/api/session" || url.pathname === "/api/business/switch" || url.pathname === "/api/business/context") {
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
    const workflowRunMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)\/run$/);
    if (workflowRunMatch?.[1]) return sendJson(response, 200, service.runWorkflow(decodeURIComponent(workflowRunMatch[1])));
    return sendJson(response, 404, { error: "Route not found" });
  } catch (error) {
    const status = error instanceof ApiNotFoundError
      ? 404
      : error instanceof ApiConflictError
        ? 409
        : error instanceof WebhookVerificationError
          ? 400
          : error instanceof Error && error.name === "PolicyViolationError"
            ? 403
            : 400;
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

async function readRawBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseJsonObject(raw: string): Record<string, unknown> {
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON body must be an object");
  return parsed as Record<string, unknown>;
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return parseJsonObject(await readRawBody(request));
}

function paypalTransmissionHeaders(request: IncomingMessage): PayPalTransmissionHeaders {
  const required = (name: string): string => {
    const value = header(request, name);
    if (!value) throw new Error(`Missing PayPal webhook header: ${name}`);
    return value;
  };
  return {
    transmissionId: required("paypal-transmission-id"),
    transmissionTime: required("paypal-transmission-time"),
    certUrl: required("paypal-cert-url"),
    authAlgo: required("paypal-auth-algo"),
    transmissionSig: required("paypal-transmission-sig"),
  };
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

function parseSimulationBody(body: Record<string, unknown>): import("./service.js").SimulationInput {
  const actionValue = body.action === undefined ? undefined : requiredString(body.action, "action");
  const supported = ["execute_payment", "send_reminder", "create_workflow", "issue_refund", "schedule_payment", "export_data"] as const;
  const action = actionValue === undefined ? undefined : supported.find((candidate) => candidate === actionValue);
  if (actionValue !== undefined && action === undefined) throw new Error("action is not supported");
  const amountCents = body.amountCents === undefined ? undefined : integer(body.amountCents, "amountCents");
  const discountPct = body.discountPct === undefined ? undefined : number(body.discountPct, "discountPct");
  const waitProbability = body.waitProbability === undefined ? undefined : number(body.waitProbability, "waitProbability");
  const waitDays = body.waitDays === undefined ? undefined : integer(body.waitDays, "waitDays");
  return {
    ...(action === undefined ? {} : { action }),
    ...(amountCents === undefined ? {} : { amountCents }),
    ...(body.resourceId === undefined && body.invoiceId === undefined && body.clientId === undefined ? {} : { resourceId: requiredString(body.resourceId ?? body.invoiceId ?? body.clientId, "resourceId") }),
    ...(body.rationale === undefined ? {} : { rationale: requiredString(body.rationale, "rationale") }),
    ...(body.clientId === undefined ? {} : { clientId: requiredString(body.clientId, "clientId") }),
    ...(body.invoiceId === undefined ? {} : { invoiceId: requiredString(body.invoiceId, "invoiceId") }),
    ...(discountPct === undefined ? {} : { discountPct }),
    ...(waitProbability === undefined ? {} : { waitProbability }),
    ...(waitDays === undefined ? {} : { waitDays }),
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

function number(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
  return value;
}

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function transactionQuery(url: URL): import("./service.js").TransactionListQuery {
  const integerQuery = (name: string): number | undefined => {
    const value = url.searchParams.get(name);
    if (value === null) return undefined;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be an integer`);
    return parsed;
  };
  const value = (name: string): string | undefined => url.searchParams.get(name) ?? undefined;
  const query: { -readonly [K in keyof import("./service.js").TransactionListQuery]?: import("./service.js").TransactionListQuery[K] } = {};
  const status = value("status");
  const direction = value("direction");
  const counterparty = value("counterparty");
  const category = value("category");
  const search = value("search") ?? value("q");
  const from = value("from");
  const to = value("to");
  const page = integerQuery("page");
  const pageSize = integerQuery("pageSize") ?? integerQuery("limit");
  const offset = integerQuery("offset");
  if (status !== undefined) query.status = status;
  if (direction !== undefined) query.direction = direction;
  if (counterparty !== undefined) query.counterparty = counterparty;
  if (category !== undefined) query.category = category;
  if (search !== undefined) query.search = search;
  if (from !== undefined) query.from = from;
  if (to !== undefined) query.to = to;
  if (page !== undefined) query.page = page;
  if (pageSize !== undefined) query.pageSize = pageSize;
  if (offset !== undefined) query.offset = offset;
  return query;
}

function actorFrom(request: IncomingMessage, body: Record<string, unknown>): AgentActor {
  const rolesValue = body.roles ?? header(request, "x-roles") ?? header(request, "x-role");
  const roles = Array.isArray(rolesValue)
    ? rolesValue.filter((role): role is string => typeof role === "string")
    : typeof rolesValue === "string" ? rolesValue.split(",").map((role) => role.trim()).filter(Boolean) : ["operator"];
  return { userId: typeof body.userId === "string" ? body.userId : header(request, "x-user-id") ?? "workspace-user", roles: roles.length > 0 ? roles : ["operator"] };
}
