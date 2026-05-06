import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Hero.css';

const Hero = ({ isAuthenticated }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  return (
    <div className="landing-page">
      <div className="orbital-system">
        <div className="orbital-core"></div>
        <div className="ring ring-1"></div>
        <div className="ring ring-2"></div>
        <div className="ring ring-3"></div>
        <div className="ring ring-4"></div>
      </div>

      <nav className="public-nav">
        <div className="nav-logo"><span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Dtail</span><span className="bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span><span className="text-blue-500 font-black">.</span></div>

        {isMenuOpen && (
          <div 
            className="menu-overlay" 
            onClick={() => setIsMenuOpen(false)}
          ></div>
        )}
        
        {/* The Menu Links - Slides in from side on mobile */}
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/about" className="nav-item" onClick={() => setIsMenuOpen(false)}>About</Link>
          <Link to="/products" className="nav-item" onClick={() => setIsMenuOpen(false)}>Products</Link>
          <Link to="/pricing" className="nav-item" onClick={() => setIsMenuOpen(false)}>Pricing</Link>
          <Link to="/legal" className="nav-item" onClick={() => setIsMenuOpen(false)}>Legal</Link>
          <Link to="/contact" className="nav-item" onClick={() => setIsMenuOpen(false)}>Contact</Link>
          <Link to="/upgrade" className="nav-item" onClick={() => setIsMenuOpen(false)}>Upgrade</Link>
        </div>

        {/* Persistent Auth Section - Always Top Right */}
        <div className="nav-auth-persistent">
          {isAuthenticated ? (
            <Link to="/bookings" className="btn-main-sm">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-login-text hide-mobile">Login</Link>
              <Link to="/register" className="btn-join-now">Join Now</Link>
            </>
          )}
          
          {/* Hamburger stays inside the auth area for alignment */}
          <div className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>
        </div>
      </nav>

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
              <button className="btn-outline">
                <span className="play-icon">▶</span> Watch The System
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-bar container animate-on-scroll">
        <div className="stat-card">
          <span className="stat-num">50k+</span>
          <span className="stat-label">Vehicles Logged</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-card">
          <span className="stat-num">0%</span>
          <span className="stat-label">Ghost Claims Lost</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-card">
          <span className="stat-num">14hr</span>
          <span className="stat-label">Admin Time Saved /Mo</span>
        </div>
      </section>

      <section className="features-section container">
        <div className="section-header animate-on-scroll">
          <h2 className="section-title">Engineered for Perfection</h2>
          <p className="section-desc">Traditional shop management is fragmented. Dtailbase is a unified ecosystem.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon">📅</div>
            <h3>Smart Intake</h3>
            <p>Intelligent scheduling that accounts for vehicle size and service complexity automatically.</p>
          </div>
          <div className="feature-card highlight-card animate-on-scroll">
            <div className="feature-icon">🛡️</div>
            <h3>Bulletproof Indemnity</h3>
            <p>Legally-binding digital waivers paired with 4K condition logs. We protect your insurance premiums.</p>
            <div className="card-tag">Core Security</div>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon">📸</div>
            <h3>Photo Vault</h3>
            <p>Cloud-synced before/after galleries linked directly to customer profiles for instant recall.</p>
          </div>
          <div className="feature-card animate-on-scroll">
            <div className="feature-icon">👥</div>
            <h3>Staff Command</h3>
            <p>Assign bays, track technician efficiency, and manage payroll through a single interface.</p>
          </div>
        </div>
      </section>

      <section className="process-story container">
        <div className="story-row animate-on-scroll">
          <div className="story-text">
            <span className="step-num">01</span>
            <h3>Eliminate The Clipboard</h3>
            <p>Paper trails are where businesses go to die. Our mobile-first intake captures VINs and high-res photos in seconds.</p>
            <ul className="story-list">
              <li>✓ Automated VIN Decoding</li>
              <li>✓ Live Status Updates for Clients</li>
              <li>✓ Instant Cloud Sync</li>
            </ul>
          </div>
          <div className="glass-mockup">
            <div className="mock-ui-label">Live Intake Dashboard</div>
            <div className="mock-ui-content"></div>
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
            <div className="mock-ui-content"></div>
          </div>
        </div>
      </section>

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

      <footer className="main-footer">
        <div className="container footer-content animate-on-scroll">
          <div className="footer-brand">
            <div className="nav-logo"><span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Dtail</span><span className="bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">base</span><span className="text-blue-500 font-black">.</span></div>
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
              <Link to="/pricing">Pricing</Link>
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
      <a 
        href={`https://wa.me/27769778522?text=Hi!%20I'm%20on%20the%20landing%20page%20and%20would%20like%20to%20see%20a%20Live%20Demo.`} 
        className="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="wa-float-icon">💬</span>
      </a>
    </div>
  );
};

export default Hero;