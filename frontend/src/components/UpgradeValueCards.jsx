import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../axios_instance";
import {
  DEFAULT_PRICE_FALLBACKS,
  extractPlanFeatures,
  fetchPricingWithFallback,
  isValidPricingPayload,
} from "../services/pricingService";
import "../styles/UpgradeValueCards.css";

// PLAN_CONTENT is now fetched from backend for single-source-of-truth
// See useEffect below

// Plan tier hierarchy for upgrade filtering
const PLAN_TIER_RANK = {
  STARTER: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

const PRICE_FALLBACKS = DEFAULT_PRICE_FALLBACKS;

function UpgradeValueCards({ currentPlan }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  const [pricing, setPricing] = useState(null);
  const [planContent, setPlanContent] = useState([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const onChange = (event) => setIsMobile(event.matches);

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetchPricingWithFallback(api, "UpgradeValueCards");
        if (!isValidPricingPayload(response.data)) {
          throw new Error("Unexpected pricing payload");
        }
        const apiPricing = response.data?.pricing || {};
        const plansPricing = response.data?.plans || {};

        setPricing({
          PRO: {
            amount: String(apiPricing?.PRO?.amount || plansPricing?.PRO?.price || PRICE_FALLBACKS.USD.PRO),
          },
          ENTERPRISE: {
            amount: String(
              apiPricing?.ENTERPRISE?.amount || plansPricing?.ENTERPRISE?.price || PRICE_FALLBACKS.USD.ENTERPRISE
            ),
          },
        });

        // Features and plan content
        setPlanContent([
          {
            id: "PRO",
            title: "Professional",
            accent: "pro",
            subtitle: "Premium legal-grade engine for scaling studios",
            perks: extractPlanFeatures(plansPricing, "PRO"),
          },
          {
            id: "ENTERPRISE",
            title: "Enterprise",
            accent: "elite",
            subtitle: "Liability-first infrastructure with service-level indemnity routing",
            perks: extractPlanFeatures(plansPricing, "ENTERPRISE"),
          },
        ]);
      } catch {
        // Keep safe defaults if pricing endpoint is unavailable.
        setPricing({
          PRO: { amount: PRICE_FALLBACKS.USD.PRO },
          ENTERPRISE: { amount: PRICE_FALLBACKS.USD.ENTERPRISE },
        });
        setPlanContent([
          {
            id: "PRO",
            title: "Professional",
            accent: "pro",
            subtitle: "Premium legal-grade engine for scaling studios",
            perks: extractPlanFeatures({}, "PRO"),
          },
          {
            id: "ENTERPRISE",
            title: "Enterprise",
            accent: "elite",
            subtitle: "Liability-first infrastructure with service-level indemnity routing",
            perks: extractPlanFeatures({}, "ENTERPRISE"),
          },
        ]);
      }
    };
    fetchPricing();
  }, []);

  const visiblePlans = useMemo(() => {
    // Only show plans that are higher tier than current plan
    const currentTierRank = PLAN_TIER_RANK[currentPlan] || 0;
    const upgradeablePlans = planContent.filter(
      (plan) => PLAN_TIER_RANK[plan.id] > currentTierRank
    );

    if (!isMobile) {
      return upgradeablePlans;
    }

    // On mobile, only show the next tier up
    if (currentTierRank >= PLAN_TIER_RANK.ENTERPRISE) {
      return [];
    }

    if (currentTierRank === PLAN_TIER_RANK.PRO) {
      return upgradeablePlans.filter((plan) => plan.id === "ENTERPRISE");
    }

    // STARTER or undefined - show PRO
    return upgradeablePlans.filter((plan) => plan.id === "PRO");
  }, [currentPlan, isMobile, planContent]);

  if (!visiblePlans.length) {
    return null;
  }

  const currencySymbol = "$";

  const getPlanPrice = (planId) => {
    const amount = pricing?.[planId]?.amount;
    if (!amount) {
      return null;
    }
    const amountString = String(amount);
    const formattedAmount = amountString.endsWith(".00") ? amountString.slice(0, -3) : amountString;
    return `${currencySymbol}${formattedAmount}/mo`;
  };

  return (
    <section className="upgrade-value-wrap">
      <div className="upgrade-value-header">
        <h2>Scale Your Studio</h2>
        <p>Deploy legal-grade workflows with high-speed performance built for detailing bays.</p>
      </div>
      <div className="upgrade-value-grid">
        {visiblePlans.map((plan) => {
          const planPrice = getPlanPrice(plan.id);

          return (
          <article key={plan.id} className={`upgrade-value-card ${plan.accent}`}>
            <p className="plan-kicker">{plan.title}</p>
            <p className="plan-subtitle">{plan.subtitle}</p>
            <ul>
              {plan.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <div className="plan-footer-row">
              {!isMobile && planPrice && <span className="plan-price-inline">{planPrice}</span>}
              <Link className="plan-cta" to={`/payments?plan=${plan.id}`}>
                {isMobile
                  ? `${planPrice ? `${planPrice} ` : ""}Upgrade`
                  : `Upgrade to ${plan.title}`}
              </Link>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

export default UpgradeValueCards;
