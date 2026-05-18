import { Link } from "react-router-dom";
import "../styles/PlanUsageBanner.css";

/**
 * PlanUsageBanner
 *
 * Displays a compact strip of plan usage metrics with progress bars
 * and an upgrade CTA when any limit is reached.
 *
 * @param {Array}   metrics     - [{ label, used, total }]  total=null → unlimited
 *                                [{ label, type: "feature", available }] → boolean feature
 * @param {string}  currentPlan - "STARTER" | "PRO" | "ENTERPRISE"
 * @param {string}  nextPlan    - next tier name or null if already on top
 * @param {boolean} light       - use light-background variant (e.g. Settings pages)
 */
function PlanUsageBanner({ metrics = [], currentPlan, nextPlan, light = false }) {
  const isAtAnyLimit = metrics.some(
    (m) => m.type !== "feature" && m.total !== null && m.total !== undefined && m.used >= m.total
  );
  const hasLockedFeature = metrics.some((m) => m.type === "feature" && !m.available);

  return (
    <div className={`plan-usage-banner${light ? " plan-usage-banner--light" : ""}`}>
      <div className="plan-usage-metrics">
        {metrics.map((m, i) => {
          // Feature availability badge
          if (m.type === "feature") {
            return (
              <div key={i} className="usage-metric usage-metric--feature">
                <div className="usage-header-row">
                  <span className="usage-label">{m.label}</span>
                  {m.available ? (
                    <span className="usage-feature-available">✓ Available</span>
                  ) : (
                    <span className="usage-feature-locked">✗ Pro+ only</span>
                  )}
                </div>
                <div className="usage-progress-track">
                  <div
                    className={`usage-progress-bar ${m.available ? "progress-bar--ok" : "progress-bar--danger"}`}
                    style={{ width: m.available ? "100%" : "0%" }}
                  />
                </div>
              </div>
            );
          }

          const isUnlimited = m.total === null || m.total === undefined;

          if (isUnlimited) {
            return (
              <div key={i} className="usage-metric">
                <div className="usage-header-row">
                  <span className="usage-label">{m.label}</span>
                  <span className="usage-fraction usage-unlimited">∞ Unlimited</span>
                </div>
                <div className="usage-progress-track">
                  <div className="usage-progress-bar progress-bar--unlimited" style={{ width: "100%" }} />
                </div>
              </div>
            );
          }

          const pct = m.total > 0 ? Math.min(100, (m.used / m.total) * 100) : 0;
          const atLimit = m.used >= m.total;
          const nearLimit = pct >= 75 && !atLimit;

          const barClass = atLimit
            ? "progress-bar--danger"
            : nearLimit
            ? "progress-bar--warn"
            : "progress-bar--ok";

          const fractionClass = atLimit
            ? "usage-at-limit"
            : nearLimit
            ? "usage-near-limit"
            : "";

          return (
            <div key={i} className={`usage-metric${atLimit ? " usage-metric--at-limit" : ""}`}>
              <div className="usage-header-row">
                <span className="usage-label">{m.label}</span>
                <span className={`usage-fraction ${fractionClass}`}>
                  {m.used} / {m.total}
                </span>
              </div>
              <div className="usage-progress-track">
                <div
                  className={`usage-progress-bar ${barClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isAtAnyLimit && nextPlan && (
        <Link to="/plans" className="plan-usage-upgrade-btn">
          Upgrade to {nextPlan.charAt(0) + nextPlan.slice(1).toLowerCase()}
        </Link>
      )}

      {!isAtAnyLimit && hasLockedFeature && nextPlan && (
        <Link to="/plans" className="plan-usage-upgrade-btn">
          Upgrade to {nextPlan.charAt(0) + nextPlan.slice(1).toLowerCase()}
        </Link>
      )}

      {!nextPlan && isAtAnyLimit && (
        <span className="plan-usage-top-tier">Top tier plan active</span>
      )}
    </div>
  );
}

export default PlanUsageBanner;
