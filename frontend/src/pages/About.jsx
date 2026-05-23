import { AlignCenter } from "lucide-react";

const About = () => {
  return (
    <div className="landing-page about-page">
      {/* HERO */}
      <section className="products-hero animate-on-scroll">
        <div className="about-intro-badge">🏢 Our Story</div>
        <h1 className="hero-title">
          Built From the <span className="highlight">Bay Up.</span>
        </h1>
        <p className="hero-subtitle" style={{ maxWidth: '680px', margin: '0 auto' }}>
          Dtailbase wasn&apos;t created in a tech lab. It was born from the frustration of running
          a real detailing business — and not having the right tools to manage it.
        </p>
      </section>

      {/* FOUNDER STORY */}
      <section className="container process-story">
        <div className="story-row animate-on-scroll">
          <div className="story-text">
            <span className="step-num">THE FOUNDER</span>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.85', marginBottom: '20px' }}>
              Before Dtailbase existed, Daryn was in the detail bay himself — hands-on, client-facing,
              and doing the actual work. Running a detailing business taught him something fast:
              the tools available to detailers were built for everyone else, not for them.
            </p>
            <blockquote className="founder-quote">
              &ldquo;I was scheduling people through WhatsApp, tracking services in my head, trying to figure
              out if I was even making a profit — all while doing a full ceramic coating in 40°C heat.
              Something had to change.&rdquo;
            </blockquote>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.85' }}>
              The pain was real: forgetting what services a client wanted, going overtime on a detail
              without realising it, having no record if a client later claimed damage. There was no
              way to quickly see if the business was actually profitable once time was accounted for.
              General CRM tools were too complex, too expensive, or simply not built for the detailing
              workflow.
            </p>
          </div>
          <div className="about-media-block">
            <h3 className="about-media-heading">Daryn Meyer</h3>
            <div className="glass-mockup">
              <div className="mock-ui-label">FOUNDER / DARYN MEYER</div>
              {/* PASTE FOUNDER IMAGE URL HERE */}
              <div style={{width:'100%',height:'100%',backgroundColor: 'var(--background-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '14px', padding: '60px 50px', textAlign: 'center'}}>
                <img src="landing/images/dm-founder-1.jpg" alt="Daryn Meyer" style={{width:'100%',height:'100%',objectFit:'cover', objectPosition:'0% 40%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 255, 0.1)'}} />
              </div>
            </div>
          </div>
        </div>

        <div className="story-row reverse animate-on-scroll">
          <div className="story-text">
            <span className="step-num">THE PAIN POINT</span>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.85', marginBottom: '20px' }}>
              Detailing is a skilled trade. But running a detailing business means wearing five hats
              at once — technician, scheduler, salesperson, accountant, and admin. Without the right
              system, it&apos;s easy to:
            </p>
            <ul className="story-list">
              <li>✓ Lose track of exactly what services a client booked</li>
              <li>✓ Go overtime on a job and only realise it at the end of the day</li>
              <li>✓ Have zero documentation if a client disputes pre-existing damage</li>
              <li>✓ Not know whether the business made a profit that week</li>
              <li>✓ Manage bookings via scattered WhatsApp messages and notes</li>
            </ul>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.85', marginTop: '20px' }}>
              Dtailbase was designed specifically to solve these problems — nothing more, nothing less.
              A focused, powerful tool built for the realities of running a modern detailing studio.
            </p>
          </div>
          <div className="about-media-block">
            <h3 className="about-media-heading">The Problem No One Was Solving</h3>
            <div className="glass-mockup">
              <div className="mock-ui-label">THE PROBLEM / BEFORE DTAILBASE</div>
              {/* PASTE IMAGE URL HERE */}
              <div style={{width:'100%',height:'100%',backgroundColor: 'var(--background-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '14px', padding: '60px 50px', textAlign: 'center'}}>
                <img src="/landing/images/pain-point-5.jpg" alt="Before Dtailbase" style={{width:'100%',height:'100%',objectFit:'cover', objectPosition:'0% 40%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 255, 0.1)'}} />
              </div>
            </div>
          </div>
        </div>

        <div className="story-row animate-on-scroll">
          <div className="story-text">
            <span className="step-num">THE SOLUTION</span>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.85', marginBottom: '20px' }}>
              Dtailbase gives detailing studios a single, unified platform to handle bookings,
              legal documentation, photo evidence, team management, and business tracking.
              No more juggling multiple apps, no more clipboards, no more guessing.
            </p>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.85' }}>
              From the moment a client books to the moment they drive away — every step is
              documented, timestamped, and stored securely. If something ever goes wrong,
              you have an indestructible record. If everything goes right, you have the data
              to prove your business is growing.
            </p>
          </div>
          <div className="about-media-block">
            <h3 className="about-media-heading">One System. Every Function.</h3>
            <div className="glass-mockup">
              <div className="mock-ui-label">THE SOLUTION / DTAILBASE DASHBOARD</div>
              {/* PASTE IMAGE URL HERE */}
              <div style={{width:'100%',height:'100%',backgroundColor: 'var(--background-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '14px', padding: '20px 0px', textAlign: 'center'}}>
                <video loop muted autoPlay playsInline src="/landing/videos/the-solution-1.mp4" style={{boxShadow: '0 4px 6px rgba(0, 0, 255, 0.1)'}}/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPANY */}
      <section className="container animate-on-scroll" style={{ paddingBottom: '80px' }}>
        <div className="section-header">
          <h2 className="section-title">The Company Behind <span className="highlight">Dtailbase.</span></h2>
          <p className="section-desc">
            A South African software company building focused, practical tools for tradespeople.
          </p>
        </div>

        <div className="about-values-grid">
          <div className="value-card animate-on-scroll">
            <div className="value-icon">🇿🇦</div>
            <h4>Netic Technologies</h4>
            <p>
              Dtailbase is designed and developed by Netic Technologies (PTY) LTD — a South African
              software development company. We build practical, focused software products for
              service-based businesses.
            </p>
          </div>
          <div className="value-card animate-on-scroll">
            <div className="value-icon">🎯</div>
            <h4>Built With Purpose</h4>
            <p>
              We don&apos;t build bloated enterprise platforms. Every feature in Dtailbase was
              added because a real detailer needed it — not because it looked good in a feature list.
              Focused tools for focused professionals.
            </p>
          </div>
          <div className="value-card animate-on-scroll">
            <div className="value-icon">🔒</div>
            <h4>Security First</h4>
            <p>
              Legal protection isn&apos;t an afterthought — it&apos;s the foundation. Every piece
              of data in Dtailbase is encrypted, timestamped, and stored with the intent of
              standing up in any dispute or legal proceeding.
            </p>
          </div>
          <div className="value-card animate-on-scroll">
            <div className="value-icon">📈</div>
            <h4>Grow With You</h4>
            <p>
              Whether you&apos;re a solo detailer or running a multi-bay franchise, Dtailbase
              scales with your business. Start free and upgrade only when your volume demands it.
            </p>
          </div>
          <div className="value-card animate-on-scroll">
            <div className="value-icon">🌍</div>
            <h4>Always Online</h4>
            <p>
              Your studio data is hosted on high-performance VPS infrastructure — always accessible
              from any device, anywhere in the world. The system never sleeps, even when you do.
            </p>
          </div>
          <div className="value-card animate-on-scroll">
            <div className="value-icon">💬</div>
            <h4>Direct Support</h4>
            <p>
              No ticket queues. No bots. If you have a problem, you can reach the team directly
              on WhatsApp — with an average response time of 15 minutes during business hours.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="products-cta container animate-on-scroll">
        <div className="products-cta-inner">
          <h2>
            Join the Studios Running <span className="highlight">Smarter.</span>
          </h2>
          <p>
            Start with a free account. No credit card required. Experience the difference a
            purpose-built system makes on day one.
          </p>
          <div className="hero-cta" style={{ justifyContent: 'center', marginTop: '32px' }}>
            <a href="/register" className="btn-main pulse">
              Get Started Free
            </a>
            <a href="/products" className="btn-outline">
              See All Features
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;