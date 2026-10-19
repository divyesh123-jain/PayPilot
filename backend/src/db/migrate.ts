import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, isDbConfigured, closePool, getDatabaseUrl } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  console.log("=== PayPilot Database Migration ===");

  if (!isDbConfigured()) {
    const rawUrl = getDatabaseUrl();
    if (rawUrl && (rawUrl.includes("[YOUR-PASSWORD]") || rawUrl.includes("YOUR-PASSWORD"))) {
      console.error(
        "\n❌ Error: [YOUR-PASSWORD] detected in DATABASE_URL.\n" +
          "Please open `backend/.env` and replace `[YOUR-PASSWORD]` with your actual Supabase database password before running migrations.\n"
      );
    } else {
      console.error(
        "\n❌ Error: DATABASE_URL is not configured.\n" +
          "Please set DATABASE_URL in your `backend/.env` file.\n"
      );
    }
    process.exit(1);
  }

  const pool = getPool();
  if (!pool) {
    console.error("❌ Failed to initialize connection pool.");
    process.exit(1);
  }

  // Look for schema.sql in src/db or relative dist location
  const potentialPaths = [
    resolve(__dirname, "schema.sql"),
    resolve(__dirname, "../../src/db/schema.sql"),
    resolve(process.cwd(), "src/db/schema.sql"),
    resolve(process.cwd(), "dist/db/schema.sql"),
  ];

  const schemaPath = potentialPaths.find((p) => existsSync(p));
  if (!schemaPath) {
    console.error("❌ Could not find schema.sql in expected paths:", potentialPaths);
    process.exit(1);
  }

  console.log(`Reading schema from: ${schemaPath}`);
  const sql = readFileSync(schemaPath, "utf-8");

  try {
    console.log("Connecting to Supabase PostgreSQL and applying schema...");
    const startTime = Date.now();
    await pool.query(sql);
    const duration = Date.now() - startTime;

    console.log(`✅ Schema applied successfully in ${duration}ms!`);

    // Verify created tables
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("\nCreated / Active tables in database:");
    for (const row of tableResult.rows) {
      console.log(`  - public.${row.table_name}`);
    }

    console.log("\nDatabase is ready for PayPilot!\n");
  } catch (err: any) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

void runMigration();
