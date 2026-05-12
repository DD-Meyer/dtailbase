import React from 'react';
import PublicLayout from '../components/PublicLayout';
import { Link } from 'react-router-dom';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

/*PLAN_CONFIG = {
    'STARTER': {
        'monthly_bookings': 10,
        'max_users': 1,
        'max_images_before': 2,
        'max_images_after': 2,
        'max_customers': 1000,
        'indemnity_history_limit': 0, # No history saved
        'buffer_timer': False,
    },
    'PRO': {
        'monthly_bookings': 60,
        'max_users': 10,
        'max_images_before': 10,
        'max_images_after': 10,
        'max_customers': float('inf'), # Unlimited
        'indemnity_history_limit': 5,
        'buffer_timer': True,
    },
    'ENTERPRISE': {
        'monthly_bookings': float('inf'),
        'max_users': 50,
        'max_images_before': 25,
        'max_images_after': 25,
        'max_customers': float('inf'), # Unlimited
        'indemnity_history_limit': float('inf'),
        'buffer_timer': True,
    }
}*/
const Pricing = () => {
  //list of plans with their features and pricing
  /*'monthly_bookings': 10,
        'max_users': 1,
        'max_images_before': 2,
        'max_images_after': 2,
        'max_customers': 1000,
        'indemnity_history_limit': 0, # No history saved
        'buffer_timer': False,*/
  const plans = [
    {
      name: 'Starter',
      price: 'R0/mo',
      features: [
        '10 Monthly Bookings',
        '1 User',
        '2 Before & After Images',
        '1000 Customers',
        'No Indemnity History',
        'No Buffer Timer',
      ],
      link: '/register',
      buttonText: 'Get Started Free',
      featured: false,
    },
    {
      name: 'Professional',
      price: 'R499/mo',
      features: [
        '60 Monthly Bookings',
        '10 Users',
        '10 Before & After Images',
        'Unlimited Customers',
        '5 Indemnity History',
        'Buffer Timer',
      ],
      link: '/register',
      buttonText: 'Start Free Trial',
      featured: true,
    },
    {
      name: 'Studio Elite',
      price: 'R1250/mo',
      features: [
        'Unlimited Monthly Bookings',
        '50 Users',
        '25 Before & After Images',
        'Unlimited Customers',
        'Unlimited Indemnity History',
        'Buffer Timer',
      ],
      link: '/register',
      buttonText: 'Go Elite',
      featured: false,
    }
  ];

  return (
      <section className="hero-container">
        <div className="hero-content">
          <div className="new-badge animate-on-scroll">Simple, Transparent Pricing</div>
          <h1 className="hero-title animate-on-scroll">
            Invest in your <span className="highlight">Precision.</span>
          </h1>
          
          <section className="pricing-section container animate-on-scroll">
            <div className="section-header">
              <h2 className="section-title">Scale Your Studio</h2>
              <p>Transparent pricing for growing operations.</p>
            </div>
            <div className="pricing-grid">
              {/* TIER 1: FREE */}
              <div className="pricing-card animate-on-scroll">
                <span className="tier">Starter</span>
                <div className="price">R0<span>/mo</span></div>
                <ul className="benefits">
                  <li><CheckIcon className="icon" size={2} /> 10 Monthly Bookings</li>
                  <li><CheckIcon className="icon" size={20} /> 1 User</li>
                  <li><CheckIcon className="icon" size={20} /> 2 Before & After Images</li>
                  <li><CheckIcon className="icon" size={20} /> 1000 Customers</li>
                  <li><XMarkIcon className="icon" size={20} /> No Indemnity History</li>
                  <li><XMarkIcon className="icon" size={20} /> No Buffer Timer</li>
                </ul>
                <Link to="/register" className="btn-outline">Get Started Free</Link>
              </div>
    
              {/* TIER 2: PRO (The Sweet Spot) */}
              <div className="pricing-card featured animate-on-scroll">
                <div className="popular-tag">Most Popular</div>
                <span className="tier">Professional</span>
                <div className="price">R499<span>/mo</span></div>
                <ul className="benefits">
                  <li><CheckIcon className="icon" /> 60 Monthly Bookings</li>
                  <li><CheckIcon className="icon" /> 10 Users</li>
                  <li><CheckIcon className="icon" /> 10 Before & After Images</li>
                  <li><CheckIcon className="icon" /> Unlimited Customers</li>
                  <li><CheckIcon className="icon" /> 5 Indemnity History</li>
                  <li><CheckIcon className="icon" /> Buffer Timer</li>
                </ul>
                <Link to="/register" className="btn-main">Start Free Trial</Link>
              </div>
    
              {/* TIER 3: STUDIO */}
              <div className="pricing-card animate-on-scroll">
                <span className="tier">Studio Elite</span>
                <div className="price">R1250<span>/mo</span></div>
                <ul className="benefits">
                  <li><CheckIcon className="icon" /> Unlimited Monthly Bookings</li>
                  <li><CheckIcon className="icon" /> 50 Users</li>
                  <li><CheckIcon className="icon" /> 25 Before & After Images</li>
                  <li><CheckIcon className="icon" /> Unlimited Customers</li>
                  <li><CheckIcon className="icon" /> Unlimited Indemnity History</li>
                  <li><CheckIcon className="icon" /> Buffer Timer</li>
                </ul>
                <Link to="/register" className="btn-outline">Go Elite</Link>
              </div>
            </div>
          </section>
        </div>
      </section>
  );
};

export default Pricing;