import React, { useState, useEffect, useContext } from 'react';
import '../styles/Upgrade.css';
import api from '../axios_instance';
import { useCompany } from '../context/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { showToast } from '../utils/uiFeedback';
import {
  DEFAULT_PRICE_FALLBACKS,
  extractPlanFeatures,
  fetchPricingWithFallback,
  isValidPricingPayload,
} from '../services/pricingService';

const PLAN_ORDER = {
  STARTER: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

const PRICE_FALLBACKS = DEFAULT_PRICE_FALLBACKS;

const detectBrowserCurrency = () => {
  return 'USD';
};

const Plans = ({ showBackToDashboard = false }) => {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(detectBrowserCurrency());
  const [pricing, setPricing] = useState(null);
  const [plansData, setPlansData] = useState({});
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [downgradingPlanId, setDowngradingPlanId] = useState('');
  const [downgradeModalPlan, setDowngradeModalPlan] = useState(null);
  const { company, currentPlan, planLimits, refreshCompany } = useCompany();
  const pendingDowngradePlan = (company?.pending_downgrade_plan || '').toUpperCase();
  const hasPendingDowngrade = !!pendingDowngradePlan && !!company?.subscription_ends_at;
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

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

    // Paid downgrades should not cancel immediately; user must explicitly continue in checkout.
    if (plan.id !== 'STARTER') {
      openPaymentPage(plan.id);
      return;
    }

    setDowngradingPlanId(plan.id);
    try {
      const response = await api.post('/payments/cancel-subscription/', {
        target_plan: plan.id,
      });

      await refreshCompany();
      const successMsg = response.data?.message || 'Subscription cancelled. Your account is now on Starter.';
      setActionMessage(successMsg);
      showToast(successMsg, 'success');
    } catch (err) {
      // Handle different error types
      let errorMsg = 'Unable to process downgrade right now.';
      
      if (err.response?.status === 403) {
        errorMsg = 'Only account owners can cancel subscriptions. Please contact your account owner.';
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      setActionError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setDowngradingPlanId('');
    }
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
        const fetchedPlansData = response.data?.plans || {};
        const fallbackCurrencyPricing = PRICE_FALLBACKS[detectedCurrency] || PRICE_FALLBACKS.USD;

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
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing:', err);
        // Keep plans page usable even if pricing endpoint is temporarily unavailable.
        const fallbackCurrency = detectBrowserCurrency();
        const fallbackCurrencyPricing = PRICE_FALLBACKS[fallbackCurrency] || PRICE_FALLBACKS.USD;

        setCurrency(fallbackCurrency);
        setPricing({
          PRO: {
            amount: fallbackCurrencyPricing.PRO,
            currency: fallbackCurrency,
          },
          ENTERPRISE: {
            amount: fallbackCurrencyPricing.ENTERPRISE,
            currency: fallbackCurrency,
          },
        });
        setPlansData({});
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [isAuthenticated]);

  const getCurrencySymbol = (curr) => {
    return curr === 'ZAR' ? 'R' : '$';
  };

  // Features are now fetched from backend for single-source-of-truth
  const plans = [
    {
      id: 'STARTER',
      name: 'Starter',
      description: 'Essential tools for solo detailers.',
      features: extractPlanFeatures(plansData, 'STARTER'),
      featured: false,
      cta: 'Current Plan',
    },
    {
      id: 'PRO',
      name: 'Professional',
      description: 'Premium legal-grade operations for growth-focused studios.',
      features: extractPlanFeatures(plansData, 'PRO'),
      featured: true,
      cta: 'Upgrade to Pro',
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Enterprise-grade liability protection with service-specific indemnity routing for high-volume bays.',
      features: extractPlanFeatures(plansData, 'ENTERPRISE'),
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
            {downgradeModalPlan.id === 'STARTER' ? (
              <p>
                Downgrading to <strong>{downgradeModalPlan.name}</strong> will cancel your current
                PayPal subscription.
              </p>
            ) : (
              <p>
                You are switching to <strong>{downgradeModalPlan.name}</strong>. Your current plan stays active
                until you continue and confirm from the payment step.
              </p>
            )}
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
        {showBackToDashboard && (
          <div style={{ marginBottom: '12px' }}>
            <button className="btn-upgrade btn-current" onClick={() => navigate('/bookings')}>
              Back to Dashboard
            </button>
          </div>
        )}
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
          // True when a paid downgrade to this plan is already queued.
          const isPendingTarget = isAuthenticated && hasPendingDowngrade && plan.id === pendingDowngradePlan;
          const isDowngradeOption =
            isAuthenticated &&
            !isPendingTarget &&
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
                    {feat}
                  </li>
                ))}
              </ul>

              {isCurrent && hasPendingDowngrade ? (
                <button className="btn-upgrade" onClick={() => openPaymentPage(plan.id)}>
                  Keep {plan.name}
                </button>
              ) : isCurrent ? (
                <button className="btn-upgrade btn-current" disabled>
                  Current Plan
                </button>
              ) : isPendingTarget ? (
                <button className="btn-upgrade btn-current" disabled>
                  Downgrade Scheduled
                </button>
              ) : isDowngradeOption ? (
                <button
                  className="btn-upgrade btn-downgrade"
                  onClick={() => executeDowngrade(plan)}
                  disabled={downgradingPlanId === plan.id}
                >
                  {downgradingPlanId === plan.id ? 'Processing...' : 'Downgrade'}
                </button>
              ) : !isAuthenticated ? (
                <button className="btn-upgrade" onClick={() => handleAuthRequired(plan)}>
                  {plan.id === 'STARTER' ? 'Get Started Free' : plan.id === 'PRO' ? 'Get Pro' : 'Get Enterprise'}
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
          <li>Secure PayPal payments</li>
          <li>Monthly recurring billing</li>
          <li>Cancel anytime from your settings</li>
          <li>Automatic invoice delivery</li>
        </ul>
      </div>
    </div>
  );
};

export default Plans;
