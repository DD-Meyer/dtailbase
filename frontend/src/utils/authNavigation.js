export function getAuthDestination(state) {
  if (typeof state?.returnAfterAuth === "string" &&
      (state.returnAfterAuth === "/payment-success" || state.returnAfterAuth.startsWith("/payment-success?"))) {
    return state.returnAfterAuth;
  }
  if (state?.fromPlanCta && state.selectedPlanId && state.selectedPlanId !== "STARTER") {
    return state.redirectTo || `/payments?plan=${state.selectedPlanId}`;
  }
  return "/dashboard";
}
