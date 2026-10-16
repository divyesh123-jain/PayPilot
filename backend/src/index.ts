export * from "./domain/index.js";
export * from "./integrations/index.js";
export * from "./api/index.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080);
  const { createApiServer } = await import("./api/server.js");
  createApiServer().listen(port, () => console.log(`PayPilot API listening on http://localhost:${port}`));
}
