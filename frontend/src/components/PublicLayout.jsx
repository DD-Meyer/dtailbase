import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from "../context/AuthContext";
import { Link, useLocation} from 'react-router-dom';
import PublicHeader from './PublicHeader';
import { MessageSquare } from 'lucide-react';

const PublicLayout = ({ children, showNav = true, showFooter = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    // 1. Handle Body Scroll Lock for Mobile Menu
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'unset';

    // 2. Mouse Tracking for Glowing Cards (Supabase-style spotlight)
    const handleMouseMove = (e) => {
      const card = e.target.closest(
        ".feature-card, .stat-card, .pricing-card, .glass-mockup, .product-card, .legal-card, .value-card, .marketing-bento-card, .marketing-feature-card, .contact-form-card"
      );

      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    // 3. Subtle parallax drift for ambient blobs (replaces old orbital rings)
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const blobs = document.querySelectorAll('.aurora-blob');
      blobs.forEach((blob, i) => {
        const speed = (i + 1) * 0.06;
        blob.style.setProperty('--scroll-y', `${scrolled * speed}px`);
      });
    };

    // 4. Reveal Animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.15 });

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      animatedElements.forEach(el => observer.unobserve(el));
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, location.pathname]);

  return (
    <div className="landing-page">
      {/* SHARED AURORA BACKGROUND (Supabase-inspired) */}
      <div className="aurora-system" aria-hidden="true">
        <div className="aurora-grid"></div>
        <div className="aurora-blob aurora-blob--primary"></div>
        <div className="aurora-blob aurora-blob--accent"></div>
        <div className="aurora-blob aurora-blob--violet"></div>
        <div className="aurora-blob aurora-blob--rose"></div>
        <div className="aurora-vignette"></div>
      </div>

      {/* SHARED NAV */}
      {showNav && (
      <PublicHeader
        isAuthenticated={isAuthenticated}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      )}

      {/* PAGE CONTENT (This is where Hero, Pricing, or Contact renders) */}
      <main className={showNav ? "public-main-wrapper" : ""}>
        {children}
      </main>

      {/* SHARED FOOTER */}
      {showFooter && (
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
      )}
      {showFooter && (
      <a 
        href={`https://wa.me/27769778522?text=Hi!%20I'm%20on%20the%20landing%20page%20and%20would%20like%20to%20see%20a%20Live%20Demo.`} 
        className="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="wa-float-icon"><MessageSquare /></span>
      </a>
      )}
    </div>
  );
};

export default PublicLayout;