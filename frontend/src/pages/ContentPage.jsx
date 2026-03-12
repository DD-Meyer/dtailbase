import React from 'react';
import PublicLayout from '../components/PublicLayout';

const ContentPage = ({ title, subtitle, sections }) => {
  return (
    <PublicLayout>
      <section className="hero-container" style={{ minHeight: '60vh' }}>
        <div className="hero-content">
          <h1 className="hero-title animate-on-scroll">
            {title} <span className="highlight">{subtitle}</span>
          </h1>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: '100px' }}>
        <div className="features-grid">
          {sections.map((section, idx) => (
            <div key={idx} className={`feature-card animate-on-scroll ${section.wide ? 'highlight-card' : ''}`}>
              <span className="step-num">0{idx + 1}</span>
              <h3>{section.header}</h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: '1.7' }}>{section.content}</p>
              {section.link && (
                <a href={section.link} className="btn-outline" style={{ marginTop: '20px', padding: '10px 20px' }}>
                  Learn More
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
};

export default ContentPage;