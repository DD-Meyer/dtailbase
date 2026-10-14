import { useEffect, useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import PayPalSubscribeButton from '../components/PayPalSubscribeButton';
import api from '../axios_instance';
import PaymentFlowCard from '../components/PaymentFlowCard';
import styles from '../components/PaymentFlowCard.module.css';
import {
  DEFAULT_PRICE_FALLBACKS,
  extractPlanFeatures,
  fetchPricingWithFallback,
  isValidPricingPayload,
} from '../services/pricingService';

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

  const formattedPlanPrice = useMemo(() => {
    if (!planPrice) return null;
    return `$${String(planPrice).replace(/\.00$/, '')} / month`;
  }, [planPrice]);

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
      <PaymentFlowCard step={1} title="Choose your plan" description="Select Professional or Enterprise to continue securely through PayPal.">
        <Link className={styles.primary} to="/plans">Go to Plans</Link>
      </PaymentFlowCard>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PaymentFlowCard step={1} title={PLAN_LABELS[planId]} description="Review your plan, then continue securely through PayPal.">
      <div className={styles.summary} aria-label="Selected plan summary">
        <dl>
          <div className={styles.row}>
            <dt>Plan</dt>
            <dd>{PLAN_LABELS[planId]}</dd>
          </div>
          <div className={styles.row}>
            <dt>Price</dt>
            <dd>{formattedPlanPrice || 'Loading price...'}</dd>
          </div>
        </dl>
        <div className={styles.features}>
          <h2>Included in your plan</h2>
          <ul>
            {selectedPlanFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.actions}>
        <PayPalSubscribeButton planId={planId} buttonLabel={paypalButtonLabel} />
        <Link className={styles.secondary} to="/plans">Back to Plans</Link>
      </div>
    </PaymentFlowCard>
  );
}

export default Payments;
