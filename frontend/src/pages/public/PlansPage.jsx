import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Star, ArrowRight, ShieldCheck } from "lucide-react";
import api from "../../axios_instance";
import { useCompany } from "../../context/CompanyContext";
import { AuthContext } from "../../context/AuthContext";
import { showToast } from "../../utils/uiFeedback";
import {
  DEFAULT_PRICE_FALLBACKS,
  extractPlanFeatures,
  fetchPricingWithFallback,
  isValidPricingPayload,
} from "../../services/pricingService";
import PublicShell from "../../components/public/PublicShell";
import styles from "./PlansPage.module.css";

const PLAN_ORDER = { STARTER: 0, PRO: 1, ENTERPRISE: 2 };
const PRICE_FALLBACKS = DEFAULT_PRICE_FALLBACKS;
const detectBrowserCurrency = () => "USD";

export default function PlansPage({ showBackToDashboard = false }) {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(detectBrowserCurrency());
  const [pricing, setPricing] = useState(null);
  const [plansData, setPlansData] = useState({});
  const [error] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [downgradingPlanId, setDowngradingPlanId] = useState("");
  const { company, currentPlan, planLimits, refreshCompany } = useCompany();
  const pendingDowngradePlan = (company?.pending_downgrade_plan || "").toUpperCase();
  const hasPendingDowngrade = !!pendingDowngradePlan && !!company?.subscription_ends_at;
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const openPaymentPage = (planId) => navigate(`/payments?plan=${planId}`);

  const handleAuthRequired = (plan) => {
    navigate("/login", {
      state: {
        fromPlanCta: true,
        selectedPlan: plan.name,
        selectedPlanId: plan.id,
        ctaType: plan.id === "STARTER" ? "try-now" : "upgrade",
        redirectTo: plan.id === "STARTER" ? "/plans" : `/payments?plan=${plan.id}`,
      },
    });
  };

  const executeDowngrade = async (plan) => {
    setActionMessage("");
    setActionError("");

    if (plan.id !== "STARTER") {
      openPaymentPage(plan.id);
      return;
    }

    setDowngradingPlanId(plan.id);
    try {
      const response = await api.post("/payments/cancel-subscription/", {
        target_plan: plan.id,
      });
      await refreshCompany();
      const successMsg =
        response.data?.message ||
        "Subscription cancelled. Your account is now on Starter.";
      setActionMessage(successMsg);
      showToast(successMsg, "success");
    } catch (err) {
      let errorMsg = "Unable to process downgrade right now.";
      if (err.response?.status === 403) {
        errorMsg =
          "Only account owners can cancel subscriptions. Please contact your account owner.";
      } else if (err.response?.data?.detail) errorMsg = err.response.data.detail;
      else if (err.response?.data?.error) errorMsg = err.response.data.error;
      else if (err.response?.data?.message) errorMsg = err.response.data.message;
      setActionError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setDowngradingPlanId("");
    }
  };

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const response = await fetchPricingWithFallback(api, "Plans");
        if (!isValidPricingPayload(response.data)) {
          throw new Error("Unexpected pricing payload");
        }

        const detectedCurrency = (response.data?.currency || "USD").toUpperCase();
        const priceData = response.data?.pricing;
        const fetchedPlansData = response.data?.plans || {};
        const fallbackCurrencyPricing =
          PRICE_FALLBACKS[detectedCurrency] || PRICE_FALLBACKS.USD;

        const normalizedPricing = {
          PRO: {
            amount:
              priceData?.PRO?.amount ||
              fetchedPlansData?.PRO?.price ||
              fallbackCurrencyPricing.PRO,
            currency: fetchedPlansData?.PRO?.currency || detectedCurrency,
          },
          ENTERPRISE: {
            amount:
              priceData?.ENTERPRISE?.amount ||
              fetchedPlansData?.ENTERPRISE?.price ||
              fallbackCurrencyPricing.ENTERPRISE,
            currency: fetchedPlansData?.ENTERPRISE?.currency || detectedCurrency,
          },
        };

        setCurrency(detectedCurrency);
        setPricing(normalizedPricing);
        setPlansData(fetchedPlansData);
      } catch (err) {
        console.error("Error fetching pricing:", err);
        const fallbackCurrency = detectBrowserCurrency();
        const fallbackCurrencyPricing =
          PRICE_FALLBACKS[fallbackCurrency] || PRICE_FALLBACKS.USD;
        setCurrency(fallbackCurrency);
        setPricing({
          PRO: { amount: fallbackCurrencyPricing.PRO, currency: fallbackCurrency },
          ENTERPRISE: {
            amount: fallbackCurrencyPricing.ENTERPRISE,
            currency: fallbackCurrency,
          },
        });
        setPlansData({});
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, [isAuthenticated]);

  const getCurrencySymbol = (c) => (c === "ZAR" ? "R" : "$");

  const plans = [
    {
      id: "STARTER",
      name: "Starter",
      description: "Essential tools for solo detailers.",
      features: extractPlanFeatures(plansData, "STARTER"),
      featured: false,
    },
    {
      id: "PRO",
      name: "Professional",
      description:
        "Premium legal-grade operations for growth-focused studios.",
      features: extractPlanFeatures(plansData, "PRO"),
      featured: true,
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      description:
        "Enterprise-grade liability protection with service-specific indemnity routing.",
      features: extractPlanFeatures(plansData, "ENTERPRISE"),
      featured: false,
    },
  ];

  const getPrice = (planId) => {
    if (!pricing || planId === "STARTER") return "0";
    return String(pricing[planId]?.amount);
  };

  if (loading) {
    return (
      <PublicShell>
        <div className={styles.stateWrap}>
          <p>Loading pricing information&hellip;</p>
        </div>
      </PublicShell>
    );
  }

  if (error) {
    return (
      <PublicShell>
        <div className={styles.stateWrap}>
          <p className={styles.stateError}>{error}</p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className={styles.header}>
        <div className={styles.container}>
          {showBackToDashboard && (
            <button
              className={styles.backBtn}
              onClick={() => navigate("/bookings")}
            >
              &larr; Back to dashboard
            </button>
          )}

          <span className={styles.eyebrow}>
            {isAuthenticated ? `Current plan: ${currentPlan}` : "Pricing"}
          </span>

          <h1 className={styles.title}>
            Simple pricing.{" "}
            <span className={styles.titleAccent}>Real value.</span>
          </h1>

          <p className={styles.lede}>
            Start free. Grow into more powerful features when you&rsquo;re ready.
            All plans come with a 14-day free trial &mdash; no card required.
          </p>

          <p className={styles.currencyNote}>
            Prices in{" "}
            <strong>
              {currency === "ZAR" ? "South African Rand (ZAR)" : "US Dollars (USD)"}
            </strong>
          </p>

          {actionMessage && (
            <p className={styles.msgSuccess}>{actionMessage}</p>
          )}
          {actionError && <p className={styles.msgError}>{actionError}</p>}
        </div>
      </section>

      <section className={styles.plansSection}>
        <div className={styles.container}>
          <ul className={styles.grid}>
            {plans.map((plan) => {
              const isCurrent = isAuthenticated && plan.id === currentPlan;
              const isPendingTarget =
                isAuthenticated &&
                hasPendingDowngrade &&
                plan.id === pendingDowngradePlan;
              const isDowngradeOption =
                isAuthenticated &&
                !isPendingTarget &&
                typeof PLAN_ORDER[currentPlan] === "number" &&
                typeof PLAN_ORDER[plan.id] === "number" &&
                PLAN_ORDER[currentPlan] > 0 &&
                PLAN_ORDER[plan.id] < PLAN_ORDER[currentPlan];

              const price = getPrice(plan.id);
              const currencySymbol = getCurrencySymbol(currency);

              return (
                <li
                  key={plan.id}
                  className={`${styles.card} ${plan.featured ? styles.cardFeatured : ""} ${
                    isCurrent ? styles.cardActive : ""
                  }`}
                >
                  {plan.featured && (
                    <span className={styles.popular}>
                      <Star size={12} strokeWidth={0} fill="currentColor" />
                      Most popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className={styles.currentTag}>Your plan</span>
                  )}

                  <h2 className={styles.planName}>{plan.name}</h2>
                  <p className={styles.planDesc}>{plan.description}</p>

                  <div className={styles.priceBox}>
                    <span className={styles.currencySym}>{currencySymbol}</span>
                    <span className={styles.priceAmt}>{price}</span>
                    <span className={styles.pricePer}>/month</span>
                  </div>

                  <ul className={styles.features}>
                    {plan.features.map((feat, i) => (
                      <li key={i} className={styles.feature}>
                        <span className={styles.featureIcon}>
                          <Check size={14} strokeWidth={3} />
                        </span>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {renderCta({
                    plan,
                    isCurrent,
                    isPendingTarget,
                    isDowngradeOption,
                    isAuthenticated,
                    hasPendingDowngrade,
                    downgradingPlanId,
                    openPaymentPage,
                    executeDowngrade,
                    handleAuthRequired,
                  })}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={styles.info}>
        <div className={styles.container}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoIcon}>
                <ShieldCheck size={20} strokeWidth={2.25} />
              </span>
              <h3 className={styles.infoTitle}>Photo capacity</h3>
              <p className={styles.infoBody}>
                Your current plan allows{" "}
                <strong>{planLimits.max_images_before}</strong> inspection photos
                per vehicle. Upgrading increases this for better legal
                protection.
              </p>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoIcon}>
                <Check size={20} strokeWidth={2.25} />
              </span>
              <h3 className={styles.infoTitle}>Billing details</h3>
              <ul className={styles.infoList}>
                <li>Secure PayPal payments</li>
                <li>Monthly recurring billing</li>
                <li>Cancel anytime from your settings</li>
                <li>Automatic invoice delivery</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function renderCta({
  plan,
  isCurrent,
  isPendingTarget,
  isDowngradeOption,
  isAuthenticated,
  hasPendingDowngrade,
  downgradingPlanId,
  openPaymentPage,
  executeDowngrade,
  handleAuthRequired,
}) {
  if (isCurrent && hasPendingDowngrade) {
    return (
      <button
        className={styles.btnPrimary}
        onClick={() => openPaymentPage(plan.id)}
      >
        Keep {plan.name}
        <ArrowRight size={16} strokeWidth={2.5} />
      </button>
    );
  }
  if (isCurrent) {
    return (
      <button className={styles.btnCurrent} disabled>
        Current plan
      </button>
    );
  }
  if (isPendingTarget) {
    return (
      <button className={styles.btnCurrent} disabled>
        Downgrade scheduled
      </button>
    );
  }
  if (isDowngradeOption) {
    return (
      <button
        className={styles.btnGhost}
        onClick={() => executeDowngrade(plan)}
        disabled={downgradingPlanId === plan.id}
      >
        {downgradingPlanId === plan.id ? "Processing…" : "Downgrade"}
      </button>
    );
  }
  if (!isAuthenticated) {
    return (
      <button
        className={styles.btnPrimary}
        onClick={() => handleAuthRequired(plan)}
      >
        {plan.id === "STARTER"
          ? "Get started free"
          : plan.id === "PRO"
          ? "Get Pro"
          : "Get Enterprise"}
        <ArrowRight size={16} strokeWidth={2.5} />
      </button>
    );
  }
  return (
    <button
      className={styles.btnPrimary}
      onClick={() => openPaymentPage(plan.id)}
    >
      Upgrade
      <ArrowRight size={16} strokeWidth={2.5} />
    </button>
  );
}
