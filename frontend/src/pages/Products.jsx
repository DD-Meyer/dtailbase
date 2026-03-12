const Products = () => {
  return (
    <div className="landing-page">
      <section className="hero-container mini-hero">
        <div className="hero-content animate-on-scroll">
          <h1 className="hero-title">High-Performance <span className="highlight">Modules.</span></h1>
          <p className="hero-subtitle">Every tool is precision-engineered to eliminate liability and increase throughput.</p>
        </div>
      </section>

      <section className="container features-grid mt-6">
        <div className="feature-card animate-on-scroll">
          <div className="feature-icon">🛡️</div>
          <h3>Indemnity Engine</h3>
          <p>Legally-binding digital signatures with timestamped IP logging. Geofenced to your studio location.</p>
        </div>
        <div className="feature-card animate-on-scroll">
          <div className="feature-icon">📸</div>
          <h3>Visual Audit</h3>
          <p>Multi-angle photo capture with high-fidelity storage. Auto-linked to work orders.</p>
        </div>
        <div className="feature-card animate-on-scroll">
          <div className="feature-icon">📊</div>
          <h3>Studio Analytics</h3>
          <p>Real-time tracking of bay occupancy, technician efficiency, and revenue per orbit.</p>
        </div>
      </section>
    </div>
  );
};

export default Products;