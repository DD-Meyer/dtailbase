import { Calendar, Calendar1, CameraIcon, ShieldIcon, UsersIcon, CreditCardIcon, CarIcon, MapPinIcon, BarChartIcon, SmartphoneIcon } from "lucide-react";

const FEATURES = [
  {
    icon: <Calendar1 style={{ color: 'green' }} />,
    label: 'BOOKINGS / 01',
    title: 'Smart Booking & Scheduling',
    description:
      'A fully digital booking system that puts you in control. Manage your calendar, set buffer times between appointments, and accept bookings from clients through a shareable link - no back-and-forth messages required. Every booking is logged with the vehicle, services requested, pricing, and assigned team member.',
    highlights: [
      'Shareable public booking links per studio',
      'Buffer timer automation between appointments',
      'Service & pricing selection at intake',
      'Real-time booking status updates',
      'Monthly booking limits managed by plan tier',
    ],
    highlight: false,
  },
  {
    icon: <ShieldIcon style={{ color: 'red' }} />,
    label: 'LEGAL / 02',
    title: 'Digital Indemnity & Legal Waivers',
    description:
      'The cornerstone of Dtailbase. Before a technician lifts a finger, a legally-binding digital waiver is signed by the client. Templates are uploaded by the studio owner and served through a secure, geo-verified signing interface. Every signed document is timestamped, IP-logged, and stored permanently - forming an indestructible legal record.',
    highlights: [
      'Custom PDF waiver templates per studio',
      'Client-facing mobile-friendly signing flow',
      'GPS location verification at time of signature',
      'IP address + timestamp logging per signature',
      'Immutable record storage - cannot be altered',
      'Downloadable PDFs for legal proceedings',
    ],
    highlight: true,
  },
  {
    icon: <CameraIcon style={{ color: 'orange' }} />,
    label: 'PHOTOS / 03',
    title: 'Photo Documentation Vault',
    description:
      "Capture the vehicle's condition before and after every detail. Photos are attached directly to the booking and linked to the client's profile, creating a permanent visual record. This is your evidence in any dispute - showing exactly what the car looked like when it arrived and when it left.",
    highlights: [
      'Before & after photo categories per booking',
      'Cloud-stored and accessible at any time',
      'Directly linked to client and vehicle profiles',
      'Multiple photo slots per booking (plan-dependent)',
      'High-resolution uploads supported from mobile',
    ],
    highlight: false,
  },
  {
    icon: <UsersIcon style={{ color: 'blue' }} />,
    label: 'TEAM / 04',
    title: 'Team Management',
    description:
      'Add and manage your team members from a single dashboard. Assign different access levels, control who can create bookings, upload photos, or manage clients. As your studio grows, your Dtailbase team grows with it - no need for multiple apps or systems.',
    highlights: [
      'Multi-user access with role-based permissions',
      'Staff assignment per booking',
      'Up to 10 users on Pro, 50 on Enterprise',
      'Owner retains full control at all times',
      'Team view of active and upcoming bookings',
    ],
    highlight: false,
  },
  {
    icon: <CreditCardIcon style={{ color: 'yellow' }} />,
    label: 'PAYMENTS / 05',
    title: 'Payment Processing & Subscriptions',
    description:
      'Dtailbase subscriptions are managed through PayPal - one of the most trusted payment processors globally. Upgrade, downgrade, or cancel your plan directly from within the app. Automatic invoicing means no manual tracking of your software costs.',
    highlights: [
      'Secure PayPal subscription billing',
      'Upgrade or downgrade plans at any time',
      'Cancel anytime - no lock-in contracts',
      'Automatic invoice delivery via email',
      'Three plan tiers to match your studio size',
    ],
    highlight: false,
  },
  {
    icon: <CarIcon style={{ color: 'blue' }} />,
    label: 'RECORDS / 06',
    title: 'Client & Vehicle Records',
    description:
      'Build a detailed history for every client and every vehicle. Each customer profile holds their vehicles, past bookings, signed waivers, and photos - all in one place. When a repeat client books, their history is instantly accessible so you can provide a personalised experience every time.',
    highlights: [
      'Full customer history and contact records',
      'Vehicle profiles with full service history',
      'Up to 1,000 customers on Starter, unlimited on Pro+',
      'Filter and search your client database',
      'Data export for portability',
    ],
    highlight: false,
  },
  {
    icon: <MapPinIcon style={{ color: 'red' }} />,
    label: 'SECURITY / 07',
    title: 'Location Verification',
    description:
      "Indemnity signatures are geofenced to your studio's registered location. This means a waiver can only be signed when the client is physically present at your studio - adding an additional layer of legal validity that no paper form can offer.",
    highlights: [
      'GPS coordinates captured at time of signing',
      'Geofence radius configurable per studio',
      'Out-of-range signings flagged in the record',
      'Location data stored permanently with the record',
      'Adds undeniable proof of physical presence',
    ],
    highlight: false,
  },
  {
    icon: <BarChartIcon style={{ color: 'blue' }} />,
    label: 'ANALYTICS / 08',
    title: 'Business Overview & Analytics',
    description:
      'Stop guessing whether your business is profitable. Dtailbase gives you a live overview of your booking activity, service revenue, and team throughput. See how long services actually take, identify your highest-value clients, and make decisions backed by your own data.',
    highlights: [
      'Booking history and completion rates',
      'Revenue and service tracking per booking',
      'Time-per-service visibility',
      'Client retention indicators',
      'Export booking and payment data',
    ],
    highlight: false,
  },
  {
    icon: <SmartphoneIcon style={{ color: 'purple' }} />,
    label: 'ACCESS / 09',
    title: 'Mobile-First, Always Online',
    description:
      'Dtailbase is built as a Progressive Web App (PWA) - meaning it works seamlessly on any device, any browser, anywhere. Add it to your home screen for a native app-like experience. Your data is hosted on high-performance VPS servers, globally accessible and always available.',
    highlights: [
      'Works on any smartphone, tablet, or desktop',
      'Add to Home Screen - no app store required',
      'Always up to date - no manual installs',
      'Hosted on globally distributed VPS infrastructure',
      'Encrypted data transmission at all times',
    ],
    highlight: false,
  },
];

const Products = () => {
  return (
    <div className="landing-page products-page">
      <section className="products-hero animate-on-scroll">
        <h1 className="hero-title">
          Everything Your Studio <span className="highlight">Needs.</span>
        </h1>
        <p className="hero-subtitle" style={{ maxWidth: '680px', margin: '0 auto' }}>
          Nine precision-engineered modules. One unified platform. Built by a detailer who lived
          the chaos - designed to give your studio the edge it deserves.
        </p>
      </section>

      <section className="products-grid container">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className={`product-card animate-on-scroll${feature.highlight ? ' product-card--highlight' : ''}`}
          >
            <div className="product-card-header">
              <span className="product-icon">{feature.icon}</span>
              <span className="product-label">{feature.label}</span>
            </div>
            <h3>{feature.title}</h3>
            <p className="product-desc">{feature.description}</p>
            <ul className="product-highlights">
              {feature.highlights.map((h) => (
                <li key={h}>
                  <span className="check-mark">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="products-cta container animate-on-scroll">
        <div className="products-cta-inner">
          <h2>
            Ready to Run a <span className="highlight">Tighter Studio?</span>
          </h2>
          <p>
            Start free. No credit card required. Upgrade when you&apos;re ready to scale.
          </p>
          <div className="hero-cta" style={{ justifyContent: 'center', marginTop: '32px' }}>
            <a href="/register" className="btn-main pulse">
              Start For Free
            </a>
            <a href="/plans" className="btn-outline">
              View Pricing
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;