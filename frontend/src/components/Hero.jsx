import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import '../styles/Hero.css';
import api from '../axios_instance';
import { showToast } from '../utils/uiFeedback';
import {
  DEFAULT_PRICE_FALLBACKS,
  extractPlanFeatures,
  fetchPricingWithFallback,
  isValidPricingPayload,
} from '../services/pricingService';
import { useCompany } from '../context/CompanyContext';

const PLAN_ORDER = {
  STARTER: 0,
  PRO: 1,
  ENTERPRISE: 2,
};

const HERO_PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Perfect for solo detailers just getting started.',
    features: [
      '10 Monthly Bookings',
      '1 User Account',
      '2 Before / 2 After Photos',
      'Basic Digital Waivers',
      'Up to 1,000 Customers',
    ],
    featured: false,
    cta: 'Get Started Free',
    isFree: true,
  },
  {
    id: 'PRO',
    name: 'Professional',
    description: 'Premium legal-grade operations for growth-focused studios.',
    features: [
      '60 Monthly Bookings',
      '10 Team Members',
      '10 Before / 10 After Photos',
      'Store up to 5 Templates (1 Active)',
      'Manual template selection per booking',
      'Buffer Timer Enabled',
      'Up to 5,000 Customers',
    ],
    featured: true,
    cta: 'Get Pro',
    isFree: false,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Enterprise-grade liability protection for high-volume bays.',
    features: [
      'Unlimited Bookings',
      '50 Team Members',
      '25 Before / 25 After Photos',
      '20 Smart-Linked Service Templates',
      'Automatic legal routing per booked service',
      '100GB Premium Cloud Vault Storage',
      'Lifetime Legal History',
      'Priority Support',
      'Unlimited Customers',
    ],
    featured: false,
    cta: 'Get Enterprise',
    isFree: false,
  },
];

const PRICE_FALLBACKS = DEFAULT_PRICE_FALLBACKS.USD;
const GUEST_PLAN_CTA = {
  STARTER: 'Get Started Free',
  PRO: 'Get Pro',
  ENTERPRISE: 'Get Enterprise',
};

const Hero = ({ isAuthenticated }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [heroPricing, setHeroPricing] = useState(null);
  const [heroPlanFeatures, setHeroPlanFeatures] = useState({});
  const [downgradingPlanId, setDowngradingPlanId] = useState('');
  const { currentPlan, refreshCompany } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {

    if (isMenuOpen) {
    document.body.style.overflow = 'hidden'; // Prevents background scroll
  }
  else {
    document.body.style.overflow = 'unset';
  } 
  
    // 1. Mouse Tracking for Glowing Cards
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll(".feature-card, .stat-card, .pricing-card");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    // 2. Parallax Scroll Logic for Background Rings
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const rings = document.querySelectorAll('.ring');
      const core = document.querySelector('.orbital-core');

      rings.forEach((ring, i) => {
        const speed = (i + 1) * 0.15;
        // Optimization: Use translate3d for hardware acceleration
        ring.style.transform = `translate3d(-50%, calc(-50% + ${scrolled * speed}px), 0) rotate(${scrolled * 0.05}deg)`;
      });

      if (core) {
        core.style.transform = `translate3d(-50%, calc(-50% + ${scrolled * 0.1}px), 0)`;
      }
    };

    // 3. Intersection Observer for Reveal Animations
    const observerOptions = { threshold: 0.15 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    // 4. Global Event Listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await fetchPricingWithFallback(api, 'Hero');
        if (!isValidPricingPayload(response.data)) throw new Error('Invalid pricing');
        const apiPricing = response.data?.pricing || {};
        const plansPricing = response.data?.plans || {};

        setHeroPlanFeatures({
          STARTER: extractPlanFeatures(plansPricing, 'STARTER'),
          PRO: extractPlanFeatures(plansPricing, 'PRO'),
          ENTERPRISE: extractPlanFeatures(plansPricing, 'ENTERPRISE'),
        });

        setHeroPricing({
          PRO: { amount: String(apiPricing?.PRO?.amount || plansPricing?.PRO?.price || PRICE_FALLBACKS.PRO) },
          ENTERPRISE: { amount: String(apiPricing?.ENTERPRISE?.amount || plansPricing?.ENTERPRISE?.price || PRICE_FALLBACKS.ENTERPRISE) },
        });
      } catch {
        setHeroPlanFeatures({
          STARTER: extractPlanFeatures({}, 'STARTER'),
          PRO: extractPlanFeatures({}, 'PRO'),
          ENTERPRISE: extractPlanFeatures({}, 'ENTERPRISE'),
        });
        setHeroPricing({ PRO: { amount: PRICE_FALLBACKS.PRO }, ENTERPRISE: { amount: PRICE_FALLBACKS.ENTERPRISE } });
      }
    };
    loadPricing();
  }, []);

  const getPlanPrice = (plan) => {
    if (plan.isFree) return '0';
    const amount = heroPricing?.[plan.id]?.amount;
    if (!amount) return '—';
    return amount.endsWith('.00') ? amount.slice(0, -3) : amount;
  };

  const getPlanFeatures = (plan) => {
    const fromPricing = heroPlanFeatures?.[plan.id];
    return Array.isArray(fromPricing) && fromPricing.length ? fromPricing : plan.features;
  };

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
      showToast(successMsg, 'success');
    } catch (err) {
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
      showToast(errorMsg, 'error');
    } finally {
      setDowngradingPlanId('');
    }
  };

  return (
    <div className="landing-page">
      <div className="orbital-system">
        <div className="orbital-core"></div>
        <div className="ring ring-1"></div>
        <div className="ring ring-2"></div>
        <div className="ring ring-3"></div>
        <div className="ring ring-4"></div>
      </div>

      <PublicHeader
        isAuthenticated={isAuthenticated}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <section className="hero-container">
        <div className="hero-content">
          <div className="hero-inner animate-on-scroll">
            <div className="new-badge">🛡️ Legal-Grade Protection Now Active</div>
            <h1 className="hero-title">
              Your Studio. <span className="highlight">Automated.</span>
            </h1>
            <p className="hero-subtitle">
              The intelligent operating system for elite detailers. 
              From digital intake to legally-binding signatures, manage every orbit of your business in one high-performance dashboard.
            </p>
            <div className="hero-cta">
              <Link to="/register" className="btn-main pulse">Deploy Your Studio</Link>
              <button className="btn-outline hero-watch-cta">
                <span className="play-icon">▶</span> Watch The System
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-bar container animate-on-scroll animate-slide-right-fade">
        <div className="stat-card">
          <span className="stat-num">~14hrs</span>
          <br />
          <span className="stat-label">Admin Reclaimed Monthly</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-card">
          <span className="stat-num">1&nbsp;Hub</span>
          <br />
          <span className="stat-label">Bookings, Photos &amp; Legal</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-card">
          <span className="stat-num">Always&nbsp;On</span>
          <br />
          <span className="stat-label">Globally Hosted &amp; Secure</span>
        </div>
      </section>

      <section className="features-section container animate-on-scroll slide-right-fade">
        <div className="section-header animate-on-scroll">
          <h2 className="section-title">Engineered for Perfection</h2>
          <p className="section-desc">Traditional shop management is fragmented. Dtailbase is a unified ecosystem.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card animate-on-scroll animate-slide-right-fade">
            <div className="feature-icon">📅</div>
            <h3>Smart Intake</h3>
            <p>Intelligent scheduling that accounts for vehicle size and service complexity automatically.</p>
          </div>
          <div className="feature-card highlight-card animate-on-scroll animate-slide-left-fade">
            <div className="feature-icon">🛡️</div>
            <h3>Bulletproof Indemnity</h3>
            <p>Legally-binding digital waivers paired with 4K condition logs. We protect your insurance premiums.</p>
            <div className="card-tag">Core Security</div>
          </div>
          <div className="feature-card animate-on-scroll animate-slide-right-fade">
            <div className="feature-icon">📸</div>
            <h3>Photo Vault</h3>
            <p>Cloud-synced before/after galleries linked directly to customer profiles for instant recall.</p>
          </div>
          <div className="feature-card animate-on-scroll animate-slide-left-fade">
            <div className="feature-icon">👥</div>
            <h3>Staff Command</h3>
            <p>Assign bays, track technician efficiency, and manage payroll through a single interface.</p>
          </div>
        </div>
      </section>

      <section className="gallery-section container">
        <div className="section-header animate-on-scroll">
          <h2 className="section-title">See It In <span className="highlight">Action.</span></h2>
          <p className="section-desc">A glimpse inside the Dtailbase ecosystem — from intake to invoice.</p>
        </div>
        {/* auto scroll and remove bottom scroll bar */}
        <div className="gallery-grid">
          {[
            { label: 'Dashboard Overview', image: '/landing/images/Dashboard-1.png' },
            { label: 'Booking Intake Form', image: '/landing/images/Booking-Intake-Form-1.png' },
            { label: 'Digital Waiver Signing', image: '/landing/images/Digital-Waiver-Signing-1.png' },
            { label: 'Before & After Photo Vault', image: '/landing/images/Before-&-After-Photo-Vault-1.png' },
            { label: 'Team Management Panel', image: '/landing/images/Team-Management-Panel-1.png' },
            { label: 'Payment & Subscription Hub', image: '/landing/images/Payment-&-Subscription-Hub-1.png' },
          ].map((item) => (
            <div className="gallery-card animate-on-scroll" key={item.label}>
              <div className="gallery-img-placeholder">
                <img src={item.image} alt={item.label} />
              </div>
              <p className="gallery-card-label">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="process-story container">
        <div className="story-row animate-on-scroll">
          <div className="story-text">
            <span className="step-num">01</span>
            <h3>Digitize Your Front Desk</h3>
            <p>Replace paper forms with a clean digital workflow for bookings, intake details, signatures, and photo evidence.</p>
            <ul className="story-list">
              <li>✓ Digital booking and intake records</li>
              <li>✓ Before and after photo capture</li>
              <li>✓ Signed indemnity forms stored per booking</li>
            </ul>
          </div>
          <div className="glass-mockup">
            <div className="mock-ui-label">Live Intake Dashboard</div>
            <div className="mock-ui-content h-250 w-250">
              <video loop muted autoPlay playsInline src="/landing/videos/live-intake-form-video.mp4" />
            </div>
          </div>
        </div>

        <div className="story-row reverse animate-on-scroll">
          <div className="story-text">
            <span className="step-num">02</span>
            <h3>Signature-First Workflow</h3>
            <p>Stop "Ghost Claims" before they start. Our system requires a digital signature before a technician can start.</p>
            <ul className="story-list">
              <li>✓ Geofenced Signatures</li>
              <li>✓ Version-Controlled Legal Text</li>
              <li>✓ Court-Ready Documentation</li>
            </ul>
          </div>
          <div className="glass-mockup">
            <div className="mock-ui-label">Legal Vault</div>
            <div className="mock-ui-content origin-center h-250 w-250">
              <video loop muted autoPlay playsInline src="/landing/videos/legal-vault-video.mp4" />
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-section container animate-on-scroll">
        <div className="section-header">
          <h2 className="section-title">Scale Your <span className="highlight">Studio.</span></h2>
          <p className="section-desc">Lightweight, high-speed architecture built exclusively for detailing bays. No lag on high-res condition logs.</p>
        </div>
        <div className="pricing-grid">
          {HERO_PLANS.map((plan) => {
            const isCurrent = Boolean(isAuthenticated && plan.id === currentPlan);
            const isDowngradeOption =
              isAuthenticated &&
              typeof PLAN_ORDER[currentPlan] === 'number' &&
              typeof PLAN_ORDER[plan.id] === 'number' &&
              PLAN_ORDER[currentPlan] > 0 &&
              PLAN_ORDER[plan.id] < PLAN_ORDER[currentPlan];

            return (
              <div
                key={plan.id}
                className={`pricing-card animate-on-scroll${plan.featured ? ' featured' : ''}`}
              >
                {plan.featured && <div className="popular-tag">Most Popular</div>}
                <span className="tier">{plan.name}</span>
                <div className="price">
                  <span className="price-currency">$</span>
                  {getPlanPrice(plan)}
                  <span>/mo</span>
                </div>
                <p className="plan-tagline">{plan.description}</p>
                <ul className="benefits">
                  {getPlanFeatures(plan).map((feat) => (
                    <li key={feat}>✓ {feat}</li>
                  ))}
                </ul>
                <button
                  className={plan.featured ? 'btn-main' : 'btn-outline'}
                  onClick={() => {
                    if (isCurrent) return;
                    if (isDowngradeOption) {
                      executeDowngrade(plan);
                      return;
                    }
                    if (!isAuthenticated) {
                      handleAuthRequired(plan);
                      return;
                    }
                    openPaymentPage(plan.id);
                  }}
                  disabled={isCurrent || downgradingPlanId === plan.id}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : isDowngradeOption
                      ? (downgradingPlanId === plan.id ? 'Processing...' : 'Downgrade')
                      : !isAuthenticated
                        ? (GUEST_PLAN_CTA[plan.id] || plan.cta)
                        : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
        <p className="pricing-note">Legally-Binding Asset Vault included &nbsp;·&nbsp; Secure PayPal billing &nbsp;·&nbsp; Cancel anytime</p>
      </section>

      <footer className="main-footer">
        <div className="container footer-content animate-on-scroll">
          <div className="footer-brand">
            <div className="nav-logo"><span className="text-white">Dtail</span><span className="bg-linear-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span><span className="text-blue-500 font-black">.</span></div>
            <p>The operating system for the world's most meticulous studios.</p>
            
            <div className="whatsapp-cta-box">
              <div className="online-indicator">
                <span className="dot"></span>
                <span className="status-text">Studio Support Online</span>
              </div>
              <a 
                href={`https://wa.me/27769778522?text=Hi%20Dtailbase,%20I'm%20looking%20at%20the%20${window.location.pathname}%20page%20and%20have%20a%20question.`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-whatsapp"
              >
                <span className="wa-icon">WhatsApp</span>Direct Message
              </a>
            </div>
            <span className="newsletter-note">Average response time: 15 mins</span>
          </div>
          
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Platform</h4>
              <Link to="/features">Features</Link>
              <Link to="/plans">Plans</Link>
              <Link to="/security">Security</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="/about">Our Story</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/legal">Legal</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <Link to="/help-center">Help Center</Link>
              <Link to="/tutorials">Tutorials</Link>
              <Link to="/community">Community</Link>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom container">
          <p>© 2026 Dtailbase. A software product of - Netic Technologies (PTY) LTD</p>
          <div className="social-links">
            <span>IG</span>
            <span>FB</span>
            <span>LI</span>
          </div>
        </div>
      </footer>
      
      {/* WhatsApp Button */}
      <a 
        href={`https://wa.me/27769778522?text=Hi!%20I'm%20on%20the%20landing%20page%20and%20would%20like%20to%20see%20a%20Live%20Demo.`} 
        className="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        title="Message us on WhatsApp"
      >
        <span className="wa-float-icon">📱</span>
      </a>
    </div>
  );
};

export default Hero;