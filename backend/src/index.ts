export * from "./domain/index.js";
export * from "./integrations/index.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("PayPilot domain and integration layers ready (no server configured).");
}
