import test from "node:test";
import assert from "node:assert/strict";
import { getAuthDestination } from "./authNavigation.js";

test("ordinary and free-plan sign-in open Dashboard", () => {
  for (const state of [undefined, null, {}, { selectedPlanId: "PROFESSIONAL" },
    { fromPlanCta: true }, { fromPlanCta: true, selectedPlanId: "STARTER", redirectTo: "/plans" }]) {
    assert.equal(getAuthDestination(state), "/dashboard");
  }
});

test("paid-plan sign-in preserves its payment destination", () => {
  assert.equal(getAuthDestination({ fromPlanCta: true, selectedPlanId: "PROFESSIONAL" }),
    "/payments?plan=PROFESSIONAL");
  assert.equal(getAuthDestination({
    fromPlanCta: true, selectedPlanId: "ENTERPRISE", redirectTo: "/payments?plan=ENTERPRISE&billing=annual",
  }), "/payments?plan=ENTERPRISE&billing=annual");
});

test("PayPal return survives sign-in without allowing unrelated return URLs", () => {
  const path = "/payment-success?plan=PRO&subscription_id=I-MOCK";
  assert.equal(getAuthDestination({ returnAfterAuth: path }), path);
  for (const path of ["https://example.com", "//example.com", "/payment-success-fake", "/plans"]) {
    assert.equal(getAuthDestination({ returnAfterAuth: path }), "/dashboard");
  }
});
