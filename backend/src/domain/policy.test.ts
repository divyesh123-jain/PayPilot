import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicy, parsePolicyText, type PolicySet } from "./policy.js";

test("policy parser turns natural language thresholds into deterministic rules", () => {
  const parsed = parsePolicyText("Require approval for refunds above $500", "refund-threshold");
  assert.equal(parsed.rule.action, "issue_refund");
  assert.equal(parsed.rule.effect, "allow");
  assert.equal(parsed.rule.requiresApprovalAboveCents, 50_000);
});

test("policy evaluation gives deny precedence and applies approval thresholds", () => {
  const policy: PolicySet = {
    id: "policy-1",
    businessId: "business-1",
    version: 1,
    rules: [
      { id: "refund-limit", action: "issue_refund", effect: "allow", requiresApprovalAboveCents: 50_000 },
      { id: "blocked", action: "issue_refund", effect: "deny", maxAmountCents: 1_000 },
    ],
  };
  const small = evaluatePolicy(policy, { action: "issue_refund", subject: { userId: "u1" }, amountCents: 500 });
  const large = evaluatePolicy(policy, { action: "issue_refund", subject: { userId: "u1" }, amountCents: 60_000 });
  assert.equal(small.allowed, false);
  assert.equal(large.allowed, true);
  assert.equal(large.requiresApproval, true);
});
