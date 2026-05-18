import { useEffect, useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import PayPalSubscribeButton from '../components/PayPalSubscribeButton';
import api from '../axios_instance';
import {
  DEFAULT_PRICE_FALLBACKS,
  extractPlanFeatures,
  fetchPricingWithFallback,
  isValidPricingPayload,
} from '../services/pricingService';
import '../styles/Upgrade.css';

const PLAN_LABELS = {
  PRO: 'Professional',
  ENTERPRISE: 'Enterprise',
};

const PRICE_FALLBACKS = DEFAULT_PRICE_FALLBACKS;

function Payments() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useContext(AuthContext);
  const { currentPlan } = useCompany();
  const navigate = useNavigate();
  const [planPrice, setPlanPrice] = useState(null);
  const [planFeatures, setPlanFeatures] = useState([]);

  const planId = (searchParams.get('plan') || '').toUpperCase();
  const isPaidPlan = planId === 'PRO' || planId === 'ENTERPRISE';
  const PLAN_ORDER = { STARTER: 0, PRO: 1, ENTERPRISE: 2 };
  const isDowngradeFlow =
    typeof PLAN_ORDER[currentPlan] === 'number' &&
    typeof PLAN_ORDER[planId] === 'number' &&
    PLAN_ORDER[currentPlan] > PLAN_ORDER[planId];
  const paypalButtonLabel = isDowngradeFlow ? 'Downgrade via PayPal' : 'Upgrade via PayPal';
  const selectedPlanFeatures = planFeatures;
  const currency = 'USD';

  const formattedPlanPrice = useMemo(() => {
    if (!planPrice) return null;
    return `$${String(planPrice).replace(/\.00$/, '')} / month`;
  }, [planPrice]);

  useEffect(() => {
    document.body.classList.add('payments-no-scroll');

    return () => {
      document.body.classList.remove('payments-no-scroll');
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated && isPaidPlan) {
      navigate('/login', {
        replace: true,
        state: {
          fromPlanCta: true,
          selectedPlan: PLAN_LABELS[planId] || planId,
          selectedPlanId: planId,
          ctaType: 'upgrade',
          redirectTo: `/payments?plan=${planId}`,
        },
      });
    }
  }, [isAuthenticated, isPaidPlan, navigate, planId]);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!isPaidPlan || !isAuthenticated) return;

      try {
        const response = await fetchPricingWithFallback(api, 'Payments');
        if (!isValidPricingPayload(response.data)) {
          throw new Error('Unexpected pricing payload');
        }

        const pricingData = response.data?.pricing || {};
        const plansData = response.data?.plans || {};

        setPlanFeatures(extractPlanFeatures(plansData, planId));

        setPlanPrice(
          String(
            pricingData?.[planId]?.amount ||
            plansData?.[planId]?.price ||
            PRICE_FALLBACKS.USD[planId] ||
            '0.00'
          )
        );
      } catch {
        setPlanPrice(PRICE_FALLBACKS.USD[planId] || '0.00');
        setPlanFeatures(extractPlanFeatures({}, planId));
      }
    };

    fetchPrice();
  }, [isAuthenticated, isPaidPlan, planId]);

  if (!isPaidPlan) {
    return (
      <div className="payments-page">
        <div className="payment-overlay-card slide-in-right">
          <h2>Select Your Studio Engine</h2>
          <p>
            Choose Professional or Enterprise on the plans page to continue with secure activation.
          </p>
          <Link className="btn-upgrade" to="/plans">Go to Plans</Link>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="payments-page">
      <div className="payment-overlay-card slide-in-right">
        <p className="checkout-focus-kicker">Activate Premium Engine</p>
        <h2>{PLAN_LABELS[planId]}</h2>
        <p>
          Activate your legal-grade workflow stack and continue securely through PayPal.
        </p>

        <div className="payment-plan-summary" aria-label="Selected plan summary">
          <div className="payment-plan-row">
            <span>Plan</span>
            <strong>{PLAN_LABELS[planId]}</strong>
          </div>
          <div className="payment-plan-row">
            <span>Price</span>
            <strong>{formattedPlanPrice || 'Loading price...'}</strong>
          </div>
          <div className="payment-plan-features">
            <p>Included in your liability engine</p>
            <ul>
              {selectedPlanFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="payment-overlay-actions">
          <PayPalSubscribeButton planId={planId} buttonLabel={paypalButtonLabel} />
          <Link className="btn-upgrade btn-current" to="/plans">Back to Plans</Link>
        </div>
      </div>
    </div>
  );
}

export default Payments;
