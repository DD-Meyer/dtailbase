import test from "node:test";
import assert from "node:assert/strict";
import { confirmSubscription, getVerificationResult, isUpgrade } from "./paymentVerification.js";

test("activation needs authoritative ACTIVE status and a known plan", () => {
  assert.deepEqual(getVerificationResult({ success: true, plan: "PRO", subscription_status: "ACTIVE" }), { kind: "active", plan: "PRO" });
  assert.equal(getVerificationResult({ success: true, plan: "PRO", subscription_status: "APPROVED" }).kind, "pending");
  assert.equal(getVerificationResult({ success: true, plan: "PRO", pending_plan: "ENTERPRISE", subscription_status: "ACTIVE" }).kind, "pending");
  assert.equal(getVerificationResult({ success: true, plan: "ALIEN", subscription_status: "ACTIVE" }).kind, "error");
  assert.equal(getVerificationResult({}).kind, "error");
  assert.equal(getVerificationResult({ success: false, subscription_status: "SUSPENDED" }).kind, "error");
});

test("scheduled downgrade is never reported as newly active", () => {
  assert.deepEqual(getVerificationResult({
    success: true, deferred_downgrade: true, plan: "ENTERPRISE", target_plan: "PRO", subscription_status: "ACTIVE",
  }), { kind: "scheduled", plan: "ENTERPRISE", targetPlan: "PRO" });
});

test("only known upward plan changes count as upgrades", () => {
  assert.equal(isUpgrade("STARTER", "PRO"), true);
  assert.equal(isUpgrade("PRO", "ENTERPRISE"), true);
  for (const pair of [["PRO", "PRO"], ["ENTERPRISE", "PRO"], ["ALIEN", "PRO"]]) {
    assert.equal(isUpgrade(...pair), false);
  }
});

test("concurrent confirmation is shared; completed requests can be retried", async () => {
  let resolve;
  let calls = 0;
  const api = { post: () => { calls++; return new Promise((done) => { resolve = done; }); } };
  const first = confirmSubscription(api, "I-MOCK");
  const second = confirmSubscription(api, "I-MOCK");
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolve({ data: { success: false } });
  await first;
  const retry = confirmSubscription(api, "I-MOCK");
  assert.equal(calls, 2);
  resolve({ data: { success: true } });
  await retry;
});

test("failed confirmation releases the in-flight guard", async () => {
  let calls = 0;
  const api = { post: async () => { calls++; throw new Error("Mock offline"); } };
  await assert.rejects(confirmSubscription(api, "I-FAIL"), /Mock offline/);
  await assert.rejects(confirmSubscription(api, "I-FAIL"), /Mock offline/);
  assert.equal(calls, 2);
});
