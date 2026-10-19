import { testConnection, closePool, getDatabaseUrl } from "./client.js";

async function main() {
  console.log("=== PayPilot Supabase Connection Diagnostic ===");
  const url = getDatabaseUrl();
  console.log(`Configured DATABASE_URL: ${url ? url.replace(/:[^:@]+@/, ":****@") : "(not set)"}\n`);

  console.log("Testing connection to Supabase PostgreSQL pooler...");
  const result = await testConnection();

  if (result.ok) {
    console.log(`\n🎉 Connection Successful!`);
    console.log(`Message:   ${result.message}`);
    console.log(`Host:      ${result.host}`);
    console.log(`DB Time:   ${result.timestamp}`);
    console.log("\nNext step: Run `npm run db:migrate` to initialize all database tables.");
  } else {
    console.log(`\n⚠️ Connection Failed:`);
    console.log(result.message);
  }

  await closePool();
}

void main();
