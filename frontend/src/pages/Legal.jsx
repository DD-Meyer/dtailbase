import React from 'react';
import PublicLayout from '../components/PublicLayout';

const Legal = () => {
  const sections = [
    {
      id: "terms",
      title: "Terms of Service",
      content: "By using Dtailbase, you agree to our cloud service terms. We provide a platform for studio management, and users are responsible for the accuracy of the data entered into the system."
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      content: "We value your studio's privacy. We do not sell your client data. All customer information and vehicle records are encrypted using industry-standard AES-256 protocols."
    },
    {
      id: "data",
      title: "Data Ownership",
      content: "You own your data. Should you choose to leave Dtailbase, you can export your customer lists and service history in CSV format at any time."
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      content: "Dtailbase is a management tool. While we provide digital indemnity forms, the legal validity of signed waivers remains the responsibility of the studio owner under local South African law."
    }
  ];

  return (
    <div className="landing-page">
      <section className="hero-container mini-hero">
        <div className="hero-content animate-on-scroll">
          <h1 className="hero-title">Legal <span className="highlight">Framework.</span></h1>
          <p className="hero-subtitle">Transparency and security for your detailing business.</p>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: '100px' }}>
        <div className="features-grid">
          {sections.map((section) => (
            <div key={section.id} className="feature-card animate-on-scroll">
              <div className="mock-ui-label">LEGAL / 0{sections.indexOf(section) + 1}</div>
              <h3 style={{ marginTop: '15px', color: 'var(--primary)' }}>{section.title}</h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: '1.8', marginTop: '10px' }}>
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="glass-mockup mt-10 animate-on-scroll" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>Need a custom Data Processing Agreement?</h3>
          <p style={{ marginBottom: '20px' }}>Contact our compliance team for enterprise-grade legal documentation.</p>
          <a href="mailto:legal@netic.co.za" className="btn-outline">Contact Compliance</a>
        </div>
      </div>
    </div>
  );
};

export default Legal;