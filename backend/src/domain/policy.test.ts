import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicy, parsePolicyText, type PolicySet } from "./policy.js";

test("policy parser turns natural language thresholds into deterministic rules", () => {
  const parsed = parsePolicyText("Require approval for refunds above $500", "refund-threshold");
  assert.equal(parsed.rule.action, "issue_refund");
  assert.equal(parsed.rule.effect, "allow");
  assert.equal(parsed.rule.requiresApprovalAboveCents, 50_000);

  const deny = parsePolicyText("Deny refunds above $100", "refund-deny");
  assert.equal(deny.rule.minAmountCents, 10_000);

  const allow = parsePolicyText("Allow payments above $500", "payment-minimum");
  assert.equal(allow.rule.minAmountCents, 50_000);
  assert.equal(allow.rule.requiresApprovalAboveCents, undefined);
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

test("amount-scoped deny rules do not deny amounts below their threshold", () => {
  const policy: PolicySet = {
    id: "policy-2",
    businessId: "business-1",
    version: 1,
    rules: [
      { id: "deny-large", action: "issue_refund", effect: "deny", minAmountCents: 10_000 },
      { id: "allow-small", action: "issue_refund", effect: "allow", maxAmountCents: 10_000 },
    ],
  };
  assert.equal(evaluatePolicy(policy, { action: "issue_refund", subject: { userId: "u1" }, amountCents: 5_000 }).allowed, true);
  assert.equal(evaluatePolicy(policy, { action: "issue_refund", subject: { userId: "u1" }, amountCents: 20_000 }).allowed, false);
});
