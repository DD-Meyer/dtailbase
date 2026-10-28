const PLAN_ORDER = { STARTER: 0, PRO: 1, ENTERPRISE: 2 };
export const PAYMENT_PLAN_LABELS = { STARTER: "Starter", PRO: "Professional", ENTERPRISE: "Enterprise" };
const inFlight = new Map();

export function confirmSubscription(api, subscriptionId) {
  if (!inFlight.has(subscriptionId)) {
    const request = api.post("payments/confirm/", { subscription_id: subscriptionId })
      .finally(() => inFlight.delete(subscriptionId));
    inFlight.set(subscriptionId, request);
  }
  return inFlight.get(subscriptionId);
}

export function getVerificationResult(data) {
  if (!data || typeof data.success !== "boolean") {
    return { kind: "error", message: "PayFast returned an unexpected response. Check again or contact support. Do not pay again." };
  }
  if (data?.success && data.deferred_downgrade) {
    return { kind: "scheduled", plan: data.plan, targetPlan: data.target_plan || data.pending_plan };
  }
  if (data?.success && data.subscription_status === "ACTIVE" &&
      !data.pending_plan && Object.hasOwn(PLAN_ORDER, data.plan)) {
    return { kind: "active", plan: data.plan };
  }
  if (["CANCELLED", "EXPIRED", "SUSPENDED"].includes(data.subscription_status) ||
      (data.subscription_status === "ACTIVE" && !Object.hasOwn(PLAN_ORDER, data.plan))) {
    return { kind: "error", message: "We could not confirm an active plan for this subscription. Contact support before starting another payment." };
  }
  if (data?.success || ["APPROVAL_PENDING", "APPROVED", "UNKNOWN"].includes(data?.subscription_status)) {
    return { kind: "pending", plan: data.pending_plan || null };
  }
  return { kind: "pending", message: data?.error || "PayFast has not confirmed activation yet." };
}

export function isUpgrade(previous, next) {
  return Object.hasOwn(PLAN_ORDER, previous) && Object.hasOwn(PLAN_ORDER, next) &&
    PLAN_ORDER[next] > PLAN_ORDER[previous];
}
