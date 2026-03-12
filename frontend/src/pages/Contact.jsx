const Contact = () => {
  return (
    <div className="landing-page">
      <section className="hero-container mini-hero">
        <div className="hero-content animate-on-scroll">
          <h1 className="hero-title">Establish <span className="highlight">Comm Link.</span></h1>
          <p className="hero-subtitle">Need a custom deployment? Our technicians are online.</p>
        </div>
      </section>

      <section className="container max-w-md">
        <div className="feature-card animate-on-scroll" style={{maxWidth: '600px', margin: '0 auto'}}>
          <form className="orbital-form">
            <div className="form-group">
              <label>Studio Name</label>
              <input type="text" placeholder="Glistenworx Auto" className="nav-item" style={{width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '12px', color: 'white'}} />
            </div>
            <div className="form-group mt-4">
              <label>Message</label>
              <textarea placeholder="Tell us about your setup..." rows="4" className="nav-item" style={{width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '12px', color: 'white'}}></textarea>
            </div>
            <button className="btn-main mt-6 w-full">Send Transmission</button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Contact;