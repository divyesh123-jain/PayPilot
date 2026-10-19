import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const { Pool } = pg;

// Automatically load .env if available
try {
  if (typeof process.loadEnvFile === "function") {
    const envPath = resolve(process.cwd(), ".env");
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
} catch {
  // Ignore env loading errors
}

let pool: pg.Pool | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function isDbConfigured(): boolean {
  const url = getDatabaseUrl();
  if (!url) return false;
  // Check if placeholder password is still present
  if (url.includes("[YOUR-PASSWORD]") || url.includes("YOUR-PASSWORD")) {
    return false;
  }
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function getPool(): pg.Pool | null {
  if (!isDbConfigured()) {
    return null;
  }

  if (!pool) {
    const connectionString = getDatabaseUrl()!;
    const isSupabaseOrCloud =
      connectionString.includes("supabase.com") ||
      connectionString.includes("pooler.supabase.com") ||
      connectionString.includes("neon.tech") ||
      connectionString.includes("render.com");

    pool = new Pool({
      connectionString,
      ssl: isSupabaseOrCloud
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.error("[Database] Unexpected error on idle database client:", err.message);
    });
  }

  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error(
      "Database is not configured. Please set a valid DATABASE_URL in your .env file with your password."
    );
  }
  return currentPool.query<T>(text, params);
}

export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
  timestamp?: string;
  host?: string;
}> {
  const rawUrl = getDatabaseUrl();
  if (!rawUrl) {
    return {
      ok: false,
      message: "DATABASE_URL is not set in environment or .env file.",
    };
  }

  if (rawUrl.includes("[YOUR-PASSWORD]") || rawUrl.includes("YOUR-PASSWORD")) {
    return {
      ok: false,
      message:
        "DATABASE_URL contains the placeholder [YOUR-PASSWORD]. Please replace it with your actual Supabase database password in backend/.env.",
    };
  }

  try {
    const pool = getPool();
    if (!pool) {
      return { ok: false, message: "Could not initialize database connection pool." };
    }

    const result = await pool.query("SELECT NOW() as current_time, current_database() as db_name");
    const parsed = new URL(rawUrl);

    return {
      ok: true,
      message: `Successfully connected to database "${result.rows[0].db_name}" on Supabase!`,
      timestamp: result.rows[0].current_time.toISOString(),
      host: parsed.hostname,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Connection failed: ${err.message}`,
    };
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
