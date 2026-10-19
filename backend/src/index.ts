export * from "./domain/index.js";
export * from "./integrations/index.js";
export * from "./api/index.js";
export * from "./db/index.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080);
  const { createApiServer } = await import("./api/server.js");
  const { isDbConfigured, getDatabaseUrl, testConnection } = await import("./db/client.js");

  const server = createApiServer();
  server.listen(port, async () => {
    console.log(`PayPilot API listening on http://localhost:${port}`);

    const dbUrl = getDatabaseUrl();
    if (dbUrl) {
      if (dbUrl.includes("[YOUR-PASSWORD]") || dbUrl.includes("YOUR-PASSWORD")) {
        console.log(
          `[Database] Supabase URL detected in .env. Replace [YOUR-PASSWORD] with your actual Supabase password to connect.`
        );
      } else {
        const check = await testConnection();
        if (check.ok) {
          console.log(`[Database] Connected to Supabase PostgreSQL (${check.host})`);
        } else {
          console.log(`[Database] Connection check: ${check.message}`);
        }
      }
    } else {
      console.log(`[Database] In-memory mode active (DATABASE_URL not set).`);
    }
  });
}
