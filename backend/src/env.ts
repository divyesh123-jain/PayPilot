import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Load `backend/.env` once when Node supports `process.loadEnvFile`. */
export function loadEnvFile(cwd: string = process.cwd()): void {
  if (typeof process.loadEnvFile !== "function") return;
  const envPath = resolve(cwd, ".env");
  if (!existsSync(envPath)) return;
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Ignore malformed or unreadable local env files.
  }
}

loadEnvFile();
