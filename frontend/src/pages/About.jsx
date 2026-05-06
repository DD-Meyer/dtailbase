const About = () => {
  return (
    <div className="landing-page">
      <section className="hero-container mini-hero">
        <div className="hero-content animate-on-scroll">
          <h1 className="hero-title">The Dtailbase <span className="highlight">Story.</span></h1>
        </div>
      </section>

      <section className="container process-story">
        <div className="story-row animate-on-scroll">
          <div className="story-text">
            <h3>Born in the Bay</h3>
            <p>We didn't build this in a boardroom. We built this because we were tired of "Ghost Claims" and messy clipboards. Dtailbase is built by detailers, for detailers.</p>
          </div>
          <div className="glass-mockup">
             {/* Use an image of a high-end detail shop or clean car */}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;