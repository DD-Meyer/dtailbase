import React from 'react';
import PublicLayout from '../components/PublicLayout';
import { Link } from 'react-router-dom';

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "499",
      desc: "Perfect for solo detailers.",
      features: ["Up to 50 Bookings/mo", "Basic CRM", "WhatsApp Notifications", "Invoice Generator"]
    },
    {
      name: "Pro",
      price: "999",
      featured: true,
      desc: "For growing high-end studios.",
      features: ["Unlimited Bookings", "Advanced Analytics", "Team Management", "Inventory Tracking", "Custom Branding"]
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For multi-location franchises.",
      features: ["Multi-branch Sync", "Dedicated Account Manager", "API Access", "Custom Integrations"]
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
                  <li>✓ 1 User / Solo Detailer</li>
                  <li>✓ 5 Digital Waivers / mo</li>
                  <li>✓ Basic Vehicle Logs</li>
                  <li>✓ Community Support</li>
                </ul>
                <Link to="/register" className="btn-outline">Get Started Free</Link>
              </div>
    
              {/* TIER 2: PRO (The Sweet Spot) */}
              <div className="pricing-card featured animate-on-scroll">
                <div className="popular-tag">Most Popular</div>
                <span className="tier">Professional</span>
                <div className="price">R499<span>/mo</span></div>
                <ul className="benefits">
                  <li>✓ 3 Technician Seats</li>
                  <li>✓ Unlimited Waivers</li>
                  <li>✓ HD Photo Vault (10GB)</li>
                  <li>✓ Custom PDF Invoicing</li>
                </ul>
                <Link to="/register" className="btn-main">Start Free Trial</Link>
              </div>
    
              {/* TIER 3: STUDIO */}
              <div className="pricing-card animate-on-scroll">
                <span className="tier">Studio Elite</span>
                <div className="price">R1250<span>/mo</span></div>
                <ul className="benefits">
                  <li>✓ Unlimited Technicians</li>
                  <li>✓ 4K Condition Monitoring</li>
                  <li>✓ Multi-Bay Management</li>
                  <li>✓ Priority Local Support</li>
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