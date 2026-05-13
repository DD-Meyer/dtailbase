import { Link } from "react-router-dom";
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
  const visiblePlans = PLAN_CONTENT.filter((plan) => plan.id !== currentPlan);

  if (!visiblePlans.length) {
    return null;
  }

  return (
    <section className="upgrade-value-wrap">
      <div className="upgrade-value-header">
        <h2>Scale Your Studio</h2>
        <p>Unlock higher throughput, richer records, and team expansion.</p>
      </div>
      <div className="upgrade-value-grid">
        {visiblePlans.map((plan) => (
          <article key={plan.id} className={`upgrade-value-card ${plan.accent}`}>
            <p className="plan-kicker">{plan.title}</p>
            <p className="plan-subtitle">{plan.subtitle}</p>
            <ul>
              {plan.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <Link className="plan-cta" to={`/payments?plan=${plan.id}`}>
              Upgrade to {plan.title}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default UpgradeValueCards;
