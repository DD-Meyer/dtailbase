import React, { useState } from 'react';
import '../styles/Upgrade.css';
import api from '../axios_instance';
import { useCompany } from '../context/CompanyContext';

const Upgrade = () => {
  const [loading, setLoading] = useState(false);
  const { currentPlan, planLimits } = useCompany();

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter',
      price: '0',
      description: 'Essential tools for solo detailers.',
      features: [
        '10 Monthly Bookings',
        '1 User Account',
        '2 Before / 2 After Photos',
        'Basic Digital Waivers',
        'Up to 1,000 Customers'
      ],
      cta: 'Current Plan',
      featured: false
    },
    {
      id: 'PRO',
      name: 'Professional',
      price: '499',
      description: 'Built for growing studios and small teams.',
      features: [
        '60 Monthly Bookings',
        '10 Team Members',
        '10 Before / 10 After Photos',
        '5-Record Indemnity History',
        'Buffer Timer Enabled',
        'Unlimited Customers'
      ],
      cta: 'Upgrade to Pro',
      featured: true
    },
    {
      id: 'ENTERPRISE',
      name: 'Studio Elite',
      price: '1250',
      description: 'Maximum performance for high-volume franchises.',
      features: [
        'Unlimited Bookings',
        '50 Team Members',
        '25 Before / 25 After Photos',
        'Lifetime Legal History',
        'Priority Bay Support',
        'Unlimited Customers',
      ],
      cta: 'Go Elite',
      featured: false
    }
  ];

  const handleUpgrade = async (planId) => {
    setLoading(true);
    try {
        // 1. Ask Django for the signed parameters
        const response = await api.post('/payments/payfast-initiate/', { plan_id: planId });
        const { url, params } = response.data;

        // 2. Create the hidden "Ghost Form"
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url; // This is the PayFast Sandbox/Live URL

        // 3. Map the Django params to hidden inputs
        Object.keys(params).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
        });

        // 4. Send the user to PayFast
        document.body.appendChild(form);
        form.submit();
        
    } catch (err) {
        console.error("Redirection failed", err);
        setLoading(false);
    }
    };

  return (
    <div className="upgrade-container">
      <div className="upgrade-header">
        <span className="badge">Studio Status: {currentPlan}</span>
        <h1>Engineered for <span className="highlight">Growth</span></h1>
        <p>You are currently utilizing the {currentPlan} configuration.</p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          
          return (
            <div 
              key={plan.id} 
              className={`pricing-card ${plan.featured ? 'featured' : ''} ${isCurrent ? 'active-plan' : ''}`}
            >
              {plan.featured && <div className="popular-tag">Most Popular</div>}
              {isCurrent && <div className="current-tag">Active Engine</div>}
              
              <span className="tier-name">{plan.name}</span>
              <div className="price-box">
                <span className="currency">R</span>
                <span className="amount">{plan.price}</span>
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

              <button 
                className={`btn-upgrade ${isCurrent ? 'btn-current' : (plan.featured ? 'btn-main' : 'btn-outline')}`}
                disabled={isCurrent || loading}
                onClick={() => handleUpgrade(plan.id)}
              >
                {loading ? 'Connecting...' : (isCurrent ? 'Current Plan' : plan.cta)}
              </button>
            </div>
          );
        })}
      </div>

      <div className="limit-overview">
        <h3>Technical Specifications</h3>
        <p>Your current plan allows for <strong>{planLimits.max_images_before}</strong> inspection photos per vehicle. Upgrading increases this to provide better legal protection.</p>
      </div>
    </div>
  );
};

export default Upgrade;