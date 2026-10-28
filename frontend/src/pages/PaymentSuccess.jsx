import { useContext, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Info } from "lucide-react";
import api from "../axios_instance";
import { AuthContext } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { DEFAULT_PRICE_FALLBACKS } from "../services/pricingService";
import { trackSubscriptionConfirmed } from "../utils/gtm";
import { confirmSubscription, getVerificationResult, isUpgrade, PAYMENT_PLAN_LABELS } from "../utils/paymentVerification";
import PaymentFlowCard from "../components/PaymentFlowCard";
import styles from "../components/PaymentFlowCard.module.css";

const trackedSubscriptions = new Set();

function trackUpgrade(subscriptionId, previousPlan, result) {
  if (result.kind !== "active" || !isUpgrade(previousPlan, result.plan)) return;
  const key = `dtailbase:subscription-confirmed:${subscriptionId}`;
  if (trackedSubscriptions.has(key)) return;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch (error) {
    console.warn("Unable to persist subscription analytics deduplication:", error);
  }
  trackedSubscriptions.add(key);
  trackSubscriptionConfirmed({
    subscriptionId, planId: result.plan,
    value: Number(DEFAULT_PRICE_FALLBACKS.USD[result.plan] || 0), currency: "USD",
  });
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);
  const { refreshCompany, company, loading: companyLoading } = useCompany();
  const subscriptionId = searchParams.get("subscription_id") || searchParams.get("token") || "";
  return isAuthenticated
    ? <Verification key={subscriptionId} subscriptionId={subscriptionId} refreshCompany={refreshCompany}
        currentPlan={company?.plan} companyLoading={companyLoading} />
    : <Navigate to="/login" replace state={{ returnAfterAuth: location.pathname + location.search }} />;
}

function Verification({ subscriptionId, refreshCompany, currentPlan, companyLoading }) {
  const [state, setState] = useState({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const previousPlan = useRef(null);
  const retrying = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!companyLoading && previousPlan.current === null) previousPlan.current = currentPlan;
  }, [companyLoading, currentPlan]);

  useEffect(() => {
    if (companyLoading) return;
    let cancelled = false;
    const verify = async () => {
      if (!subscriptionId.trim()) {
        setState({ kind: "missing" });
        return;
      }
      setState({ kind: "checking" });
      try {
        const response = await confirmSubscription(api, subscriptionId);
        if (cancelled) return;
        const result = getVerificationResult(response.data);
        if (result.kind === "active" || result.kind === "scheduled") {
          const refreshed = await refreshCompany();
          if (cancelled) return;
          result.refreshFailed = !refreshed?.ok || refreshed.company?.plan !== result.plan;
          trackUpgrade(subscriptionId, previousPlan.current, result);
        }
        setState(result);
      } catch (error) {
        if (cancelled) return;
        console.error("Payment verification failed:", error.response?.status || error.message);
        setState({
          kind: "error",
          permission: [401, 403].includes(error.response?.status),
          message: [401, 403].includes(error.response?.status)
            ? "Only the account owner can verify this subscription. Sign in as the owner or contact them for help."
            : "We could not verify your subscription. Check your connection and try again. Do not pay again.",
        });
      } finally {
        if (!cancelled) retrying.current = false;
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [subscriptionId, attempt, companyLoading, refreshCompany]);

  const retry = () => {
    if (retrying.current || state.kind === "checking") return;
    retrying.current = true;
    setState({ kind: "checking" });
    setAttempt((value) => value + 1);
  };

  const retryRefresh = async () => {
    if (retrying.current) return;
    retrying.current = true;
    setRefreshBusy(true);
    try {
      const refreshed = await refreshCompany();
      if (mounted.current) setState((previous) => ({
        ...previous, refreshFailed: !refreshed?.ok || refreshed.company?.plan !== previous.plan,
      }));
    } finally {
      retrying.current = false;
      if (mounted.current) setRefreshBusy(false);
    }
  };

  const active = state.kind === "active";
  const scheduled = state.kind === "scheduled";
  const title = {
    checking: "Verifying your subscription",
    pending: "Activation pending",
    active: "Subscription active",
    scheduled: "Plan change scheduled",
    missing: "Subscription details missing",
    error: "Verification unavailable",
  }[state.kind];
  const description = {
    checking: "Checking securely with PayFast. This may take a moment.",
    pending: "Your subscription is not active yet. Check again shortly, there is no need to pay again.",
    active: "Your subscription is confirmed. You can continue working.",
    scheduled: "Your current plan remains available until the scheduled change takes effect.",
    missing: "Return using the PayFast payment link. If you were charged, contact support before starting another subscription.",
    error: state.message,
  }[state.kind];
  const Icon = active ? CheckCircle2 : ["pending", "checking"].includes(state.kind) ? Clock3 : Info;

  return (
    <PaymentFlowCard step={2} complete={active} title={title} description="Step 2 of 2 · Confirm your subscription">
      <div role={state.kind === "error" || state.kind === "missing" ? "alert" : "status"}
        aria-live="polite" className={`${styles.status} ${state.kind === "error" ? styles.error : ""}`}>
        <Icon size={22} aria-hidden="true" /><p>{description}</p>
      </div>
      {(active || scheduled) && <div className={styles.summary} aria-label="Confirmed plan summary">
        <dl>
          <div className={styles.row}><dt>Current plan</dt><dd>{PAYMENT_PLAN_LABELS[state.plan] || "Check your plan in Settings"}</dd></div>
          <div className={styles.row}><dt>Subscription</dt><dd>{scheduled ? "Change scheduled" : "Active"}</dd></div>
          {scheduled && <div className={styles.row}><dt>Scheduled plan</dt><dd>{PAYMENT_PLAN_LABELS[state.targetPlan] || "Check your plan in Settings"}</dd></div>}
        </dl>
      </div>}
      {state.refreshFailed && <p role="status" className={styles.note}>PayFast confirmation succeeded, but we could not refresh your workspace access. Refresh access below. Do not pay again.</p>}
      <div className={styles.actions}>
        {["checking", "pending", "error"].includes(state.kind) && !state.permission &&
          <button className={styles.primary} disabled={state.kind === "checking"} onClick={retry}>
            {state.kind === "checking" ? "Checking with PayFast…" : "Check again"}
          </button>}
        {state.refreshFailed && <button className={styles.primary} disabled={refreshBusy} onClick={retryRefresh}>
          {refreshBusy ? "Refreshing access…" : "Refresh workspace access"}
        </button>}
        <Link className={active || scheduled ? styles.primary : styles.secondary} to="/dashboard">Go to Dashboard</Link>
        <Link className={styles.secondary} to="/plans">View Plans</Link>
      </div>
      <p className={styles.note}>Need help with a payment? <Link to="/support">Contact support</Link>.</p>
    </PaymentFlowCard>
  );
}
