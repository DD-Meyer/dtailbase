import React, { useState, useEffect } from 'react';
import '../styles/Upgrade.css';
import api from '../axios_instance';
import { useCompany } from '../context/CompanyContext';
import PayPalSubscribeButton from '../components/PayPalSubscribeButton';

const Upgrade = () => {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState(null);
  const { currentPlan, planLimits } = useCompany();

  // Fetch pricing and detect user's currency
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const response = await api.get('/payments/pricing/');
        const { currency: detectedCurrency, pricing: priceData } = response.data;
        
        setCurrency(detectedCurrency);
        setPricing(priceData);
        setError(null);
      } catch (err) {
        console.error('Error fetching pricing:', err);
        setError('Failed to load pricing information');
        // Fallback to USD pricing
        setCurrency('USD');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

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
        'Up to 1,000 Customers'
      ],
      featured: false,
      cta: 'Current Plan'
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
        'Unlimited Customers'
      ],
      featured: true,
      cta: 'Upgrade to Pro'
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
      cta: 'Go Elite'
    }
  ];

  const getPrice = (planId) => {
    if (!pricing || planId === 'STARTER') return '0';
    return pricing[planId]?.amount || '0';
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
      <div className="upgrade-header">
        <span className="badge">Studio Status: {currentPlan}</span>
        <h1>Engineered for <span className="highlight">Growth</span></h1>
        <p>You are currently utilizing the {currentPlan} configuration.</p>
        <p className="currency-note">
          💱 Pricing displayed in: <strong>{currency === 'ZAR' ? 'South African Rand (ZAR)' : 'US Dollars (USD)'}</strong>
        </p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
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
              ) : (
                <PayPalSubscribeButton 
                  planId={plan.id}
                  disabled={isCurrent || loading}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="limit-overview">
        <h3>Technical Specifications</h3>
        <p>Your current plan allows for <strong>{planLimits.max_images_before}</strong> inspection photos per vehicle. Upgrading increases this to provide better legal protection.</p>
      </div>

      <div className="payment-info">
        <h3>💳 Payment Information</h3>
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

export default Upgrade;