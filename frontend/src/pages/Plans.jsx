import React, { useState, useEffect, useContext } from 'react';
import '../styles/Upgrade.css';
import api from '../axios_instance';
import { useCompany } from '../context/CompanyContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchPricingWithFallback, isValidPricingPayload } from '../services/pricingService';

const PLAN_ORDER = {
  STARTER: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

const PRICE_FALLBACKS = {
  USD: { PRO: '29.00', ENTERPRISE: '149.00' },
  ZAR: { PRO: '499.00', ENTERPRISE: '1299.00' },
};

const Plans = () => {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [downgradingPlanId, setDowngradingPlanId] = useState('');
  const [downgradeModalPlan, setDowngradeModalPlan] = useState(null);
  const { company, currentPlan, planLimits, refreshCompany } = useCompany();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const openPaymentPage = (planId) => {
    navigate(`/payments?plan=${planId}`);
  };

  const handleAuthRequired = (plan) => {
    navigate('/login', {
      state: {
        fromPlanCta: true,
        selectedPlan: plan.name,
        selectedPlanId: plan.id,
        ctaType: plan.id === 'STARTER' ? 'try-now' : 'upgrade',
        redirectTo: plan.id === 'STARTER' ? '/plans' : `/payments?plan=${plan.id}`,
      },
    });
  };

  const executeDowngrade = async (plan) => {
    setActionMessage('');
    setActionError('');
    setDowngradingPlanId(plan.id);

    try {
      const response = await api.post('/payments/cancel-subscription/', {
        target_plan: plan.id,
      });

      await refreshCompany();

      if (plan.id !== 'STARTER') {
        openPaymentPage(plan.id);
      }

      setActionMessage(
        response.data?.message ||
          'Subscription cancelled. You can now activate a lower paid tier if needed.'
      );
    } catch (err) {
      setActionError(err.response?.data?.error || 'Unable to process downgrade right now.');
    } finally {
      setDowngradingPlanId('');
    }
  };

  const handleDowngrade = (plan) => {
    setDowngradeModalPlan(plan);
  };

  const confirmDowngrade = async () => {
    if (!downgradeModalPlan) return;
    const selectedPlan = downgradeModalPlan;
    setDowngradeModalPlan(null);
    await executeDowngrade(selectedPlan);
  };

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const response = await fetchPricingWithFallback(api, 'Plans');
        if (!isValidPricingPayload(response.data)) {
          throw new Error('Unexpected pricing payload');
        }

        const detectedCurrency = (response.data?.currency || 'USD').toUpperCase();
        const priceData = response.data?.pricing;
        const plansData = response.data?.plans;
        const fallbackCurrencyPricing = PRICE_FALLBACKS[detectedCurrency] || PRICE_FALLBACKS.USD;

        const normalizedPricing = {
          PRO: {
            amount:
              priceData?.PRO?.amount ||
              plansData?.PRO?.price ||
              fallbackCurrencyPricing.PRO,
            currency: plansData?.PRO?.currency || detectedCurrency,
          },
          ENTERPRISE: {
            amount:
              priceData?.ENTERPRISE?.amount ||
              plansData?.ENTERPRISE?.price ||
              fallbackCurrencyPricing.ENTERPRISE,
            currency: plansData?.ENTERPRISE?.currency || detectedCurrency,
          },
        };

        setCurrency(detectedCurrency);
        setPricing(normalizedPricing);
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing:', err);
        setError('Failed to load pricing information');
        setCurrency('USD');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [isAuthenticated]);

  const getCurrencySymbol = (curr) => {
    return curr === 'ZAR' ? 'R' : '$';
  };

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter',
      description: 'Essential tools for solo detailers.',
      features: [
        '10 Monthly Bookings',
        '1 User Account',
        '2 Before / 2 After Photos',
        'Basic Digital Waivers',
        'Up to 1,000 Customers',
      ],
      featured: false,
      cta: 'Current Plan',
    },
    {
      id: 'PRO',
      name: 'Professional',
      description: 'Built for growing studios and small teams.',
      features: [
        '60 Monthly Bookings',
        '10 Team Members',
        '10 Before / 10 After Photos',
        '5-Record Indemnity History',
        'Buffer Timer Enabled',
        'Unlimited Customers',
      ],
      featured: true,
      cta: 'Upgrade to Pro',
    },
    {
      id: 'ENTERPRISE',
      name: 'Studio Elite',
      description: 'Maximum performance for high-volume franchises.',
      features: [
        'Unlimited Bookings',
        '50 Team Members',
        '25 Before / 25 After Photos',
        'Lifetime Legal History',
        'Priority Bay Support',
        'Unlimited Customers',
      ],
      featured: false,
      cta: 'Go Elite',
    },
  ];

  const getPrice = (planId) => {
    if (!pricing || planId === 'STARTER') return '0';
    const amount = pricing[planId]?.amount;
    return String(amount);
  };

  if (loading) {
    return (
      <div className="upgrade-container">
        <div className="loading-state">
          <p>Loading pricing information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upgrade-container">
        <div className="error-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-container">
      {downgradeModalPlan && (
        <div className="plan-modal-overlay" onClick={() => setDowngradeModalPlan(null)}>
          <div className="plan-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Downgrade</h3>
            <p>
              Downgrading to <strong>{downgradeModalPlan.name}</strong> will cancel your current
              PayPal subscription.
            </p>
            <p>
              Any penalties due will be charged by PayPal based on your billing terms.
            </p>
            <div className="plan-modal-actions">
              <button className="btn-upgrade btn-current" onClick={() => setDowngradeModalPlan(null)}>
                Cancel
              </button>
              <button className="btn-upgrade btn-downgrade" onClick={confirmDowngrade}>
                Confirm Downgrade
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="upgrade-header">
        <span className="badge">Studio Status: {currentPlan}</span>
        <h1>
          Engineered for <span className="highlight">Growth</span>
        </h1>
        <p>You are currently utilizing the {currentPlan} configuration.</p>
        <p className="currency-note">
          Pricing displayed in:{' '}
          <strong>
            {currency === 'ZAR'
              ? 'South African Rand (ZAR)'
              : 'US Dollars (USD)'}
          </strong>
        </p>

        {actionMessage && <p className="plan-action-message">{actionMessage}</p>}
        {actionError && <p className="plan-action-error">{actionError}</p>}
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = isAuthenticated && plan.id === currentPlan;
          const isDowngradeOption =
            isAuthenticated &&
            typeof PLAN_ORDER[currentPlan] === 'number' &&
            typeof PLAN_ORDER[plan.id] === 'number' &&
            PLAN_ORDER[currentPlan] > 0 &&
            PLAN_ORDER[plan.id] < PLAN_ORDER[currentPlan];
          const price = getPrice(plan.id);
          const currencySymbol = getCurrencySymbol(currency);

          return (
            <div
              key={plan.id}
              className={`pricing-card ${plan.featured ? 'featured' : ''} ${isCurrent ? 'active-plan' : ''}`}
            >
              {plan.featured && <div className="popular-tag">Most Popular</div>}
              {isCurrent && <div className="current-tag">Active Engine</div>}

              <span className="tier-name">{plan.name}</span>
              <div className="price-box">
                <span className="currency">{currencySymbol}</span>
                <span className="amount">{price}</span>
                <span className="period">/mo</span>
              </div>

              <p className="plan-desc">{plan.description}</p>

              <ul className="plan-features">
                {plan.features.map((feat, i) => (
                  <li key={i}>
                    <span className="check">✓</span> {feat}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button className="btn-upgrade btn-current" disabled>
                  {plan.cta}
                </button>
              ) : isDowngradeOption ? (
                <button
                  className="btn-upgrade btn-downgrade"
                  onClick={() => handleDowngrade(plan)}
                  disabled={downgradingPlanId === plan.id}
                >
                  {downgradingPlanId === plan.id
                    ? 'Processing downgrade...'
                    : 'Downgrade'}
                </button>
              ) : !isAuthenticated ? (
                <button className="btn-upgrade" onClick={() => handleAuthRequired(plan)}>
                  {plan.id === 'STARTER' ? 'Try Now' : 'Get Now'}
                </button>
              ) : (
                <button className="btn-upgrade" onClick={() => openPaymentPage(plan.id)}>
                  Upgrade
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="limit-overview">
        <h3>Technical Specifications</h3>
        <p>
          Your current plan allows for <strong>{planLimits.max_images_before}</strong> inspection photos per
          vehicle. Upgrading increases this to provide better legal protection.
        </p>
      </div>

      <div className="payment-info">
        <h3>Payment Information</h3>
        <ul>
          <li>✓ Secure PayPal payments</li>
          <li>✓ Monthly recurring billing</li>
          <li>✓ Cancel anytime from your settings</li>
          <li>✓ Automatic invoice delivery</li>
        </ul>
      </div>
    </div>
  );
};

export default Plans;
