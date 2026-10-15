export * from "./domain/index.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("PayPilot domain layer ready (no server or integrations configured).");
}
