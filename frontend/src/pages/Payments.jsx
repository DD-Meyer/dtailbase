import { useEffect, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PayPalSubscribeButton from '../components/PayPalSubscribeButton';
import '../styles/Upgrade.css';

const PLAN_LABELS = {
  PRO: 'Professional',
  ENTERPRISE: 'Studio Elite',
};

function Payments() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const planId = (searchParams.get('plan') || '').toUpperCase();
  const isPaidPlan = planId === 'PRO' || planId === 'ENTERPRISE';

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

  if (!isPaidPlan) {
    return (
      <div className="payments-page">
        <div className="payment-overlay-card slide-in-right">
          <h2>Select a Paid Plan</h2>
          <p>
            Choose Professional or Studio Elite from the plans page before requesting payment.
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
        <p className="checkout-focus-kicker">Confirm Payment</p>
        <h2>{PLAN_LABELS[planId]}</h2>
        <p>
          You are about to activate this plan. Confirm and continue securely via PayPal.
        </p>
        <div className="payment-overlay-actions">
          <PayPalSubscribeButton planId={planId} />
          <Link className="btn-upgrade btn-current" to="/plans">Back to Plans</Link>
        </div>
      </div>
    </div>
  );
}

export default Payments;
