import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../axios_instance";
import { fetchPricingWithFallback, isValidPricingPayload } from "../services/pricingService";
import "../styles/UpgradeValueCards.css";

const PLAN_CONTENT = [
  {
    id: "PRO",
    title: "Professional",
    accent: "pro",
    subtitle: "For growing detailing studios",
    perks: [
      "60 monthly bookings",
      "10 users",
      "10 before / 10 after images",
      "Buffer timer automation",
    ],
  },
  {
    id: "ENTERPRISE",
    title: "Studio Elite",
    accent: "elite",
    subtitle: "For high-volume premium operations",
    perks: [
      "Unlimited bookings",
      "50 users",
      "25 before / 25 after images",
      "Priority support + full history",
    ],
  },
];

function UpgradeValueCards({ currentPlan }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  const [currency, setCurrency] = useState("USD");
  const [pricing, setPricing] = useState(null);

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
        setCurrency(response.data?.currency || "USD");
        setPricing(response.data?.pricing || null);
      } catch {
        // Keep safe defaults if pricing endpoint is unavailable.
        setCurrency("USD");
        setPricing(null);
      }
    };

    fetchPricing();
  }, []);

  const visiblePlans = useMemo(() => {
    const allUpgradeablePlans = PLAN_CONTENT.filter((plan) => plan.id !== currentPlan);

    if (!isMobile) {
      return allUpgradeablePlans;
    }

    if (currentPlan === "PRO") {
      return PLAN_CONTENT.filter((plan) => plan.id === "ENTERPRISE");
    }

    if (currentPlan === "ENTERPRISE") {
      return [];
    }

    return PLAN_CONTENT.filter((plan) => plan.id === "PRO");
  }, [currentPlan, isMobile]);

  if (!visiblePlans.length) {
    return null;
  }

  const currencySymbol = currency === "ZAR" ? "R" : "$";

  const getPlanPrice = (planId) => {
    const amount = pricing?.[planId]?.amount;
    if (!amount) {
      return null;
    }
    const formattedAmount = amount.endsWith(".00") ? amount.slice(0, -3) : amount;
    return `${currencySymbol}${formattedAmount}/mo`;
  };

  return (
    <section className="upgrade-value-wrap">
      <div className="upgrade-value-header">
        <h2>Scale Your Studio</h2>
        <p>Unlock higher throughput, richer records, and team expansion.</p>
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
