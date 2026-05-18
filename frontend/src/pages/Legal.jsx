import React from 'react';
import PublicLayout from '../components/PublicLayout';

const LEGAL_SECTIONS = [
  {
    id: 'geo',
    icon: '📍',
    label: 'PROTECTION / 01',
    title: 'Location Verification & Geofencing',
    body: [
      "Every indemnity waiver signed through Dtailbase captures the client's GPS coordinates at the exact moment of signing. The system geofences signatures to your studio's registered physical location — meaning a waiver can only be validly completed when the client is physically present at your premises.",
      "This creates a legally meaningful record that the client was on-site and acknowledged the document in person — something a paper form can never definitively prove.",
    ],
    highlights: [
      'GPS coordinates logged at time of every signature',
      'Geofence radius configurable per studio',
      'Out-of-range signing attempts are flagged in the record',
      'Location data stored permanently — cannot be altered',
      'Adds undeniable proof of physical presence at signing',
    ],
    screenshotLabel: 'App Screenshot: Location Verification at Signing',
    screenshotNote: '← Paste your screenshot URL here',
  },
  {
    id: 'signatures',
    icon: '✍️',
    label: 'PROTECTION / 02',
    title: 'Timestamped Digital Signatures',
    body: [
      "Every signature collected through Dtailbase is assigned an immutable timestamp the moment it is submitted. The record includes the exact date, time (to the second), IP address of the device used, and the version of the legal document that was signed.",
      "This means that if a dispute arises — even years later — you can produce a complete, court-ready record showing exactly who signed, what they signed, when they signed it, and from where. Paper files get lost. Dtailbase records do not.",
    ],
    highlights: [
      'Exact timestamp (date, time, second) recorded per signature',
      'IP address of signing device logged and stored',
      'Document version control — the signed version is preserved',
      'Signed PDFs downloadable at any time for legal use',
      'Records are permanent and cannot be retroactively edited',
    ],
    screenshotLabel: 'App Screenshot: Signature Record & Timestamp',
    screenshotNote: '← Paste your screenshot URL here',
  },
  {
    id: 'photos',
    icon: '📸',
    label: 'PROTECTION / 03',
    title: 'Photo & Visual Evidence Storage',
    body: [
      "Before a technician touches a vehicle, photos of its condition are captured and stored. After the work is done, post-service photos are added to the same booking record. Both sets of images are timestamped, cloud-stored, and permanently linked to the client, vehicle, and signed waiver.",
      "This visual evidence is your strongest protection against 'ghost claims' — situations where a client alleges damage that existed before the service. With a before-and-after photo record, the facts speak for themselves.",
    ],
    highlights: [
      'Before & after photos captured per booking',
      'Timestamped and linked to client, vehicle, and waiver record',
      'Cloud-stored — accessible from any device at any time',
      'Multiple photo slots per booking (plan-dependent)',
      'Provides visual proof in any dispute or insurance claim',
    ],
    screenshotLabel: 'App Screenshot: Photo Vault & Condition Log',
    screenshotNote: '← Paste your screenshot URL here',
  },
  {
    id: 'history',
    icon: '📂',
    label: 'PROTECTION / 04',
    title: 'Indestructible Service History',
    body: [
      "Every booking, waiver, photo, and payment record in Dtailbase forms part of a permanent, tamper-evident service history. This history is linked to both the client and their vehicle — creating a complete audit trail for every interaction your studio has ever had.",
      "An indestructible record is your best ally in any legal or insurance dispute. It removes ambiguity, proves your process, and demonstrates a professional standard of care that protects your business, your team, and your reputation.",
    ],
    highlights: [
      'Full booking history linked per client and vehicle',
      'Signed waivers permanently associated with their booking',
      'Photo evidence tied to the exact service date and technician',
      'Records cannot be deleted by users — audit-safe',
      'History accessible on Enterprise plan for the lifetime of the account',
    ],
    screenshotLabel: 'App Screenshot: Full Service History View',
    screenshotNote: '← Paste your screenshot URL here',
  },
  {
    id: 'privacy',
    icon: '🔒',
    label: 'LEGAL / 05',
    title: 'Data Privacy & Encryption',
    body: [
      "All data stored in Dtailbase is encrypted using industry-standard AES-256 protocols — both at rest and in transit. Client information, signed documents, and media files are handled with the same level of security as financial institutions.",
      "We do not sell your data. We do not share client records with third parties. Your studio's information belongs to you — and only you.",
    ],
    highlights: [
      'AES-256 encryption for all stored data',
      'Encrypted in transit via HTTPS/TLS',
      'No third-party data sharing or selling',
      'POPIA-aware data handling practices',
      'Data stored on secure VPS infrastructure',
    ],
    screenshotLabel: 'App Screenshot: Security & Encryption Settings',
    screenshotNote: '← Paste your screenshot URL here',
  },
  {
    id: 'ownership',
    icon: '📤',
    label: 'LEGAL / 06',
    title: 'Data Ownership & Portability',
    body: [
      "You own your data. Should you ever choose to leave Dtailbase, you can export your complete client list, vehicle records, booking history, and service data in CSV format at any time. No lock-in.",
      "We believe that the data your studio generates belongs to your business — not to us. Dtailbase is a tool you use, not a vault that traps your information.",
    ],
    highlights: [
      'Full data export available at any time',
      'Customer lists and booking history in CSV format',
      'No cancellation penalty or data retention hold',
      'Data deletion available on request',
      'You retain ownership of all client-submitted information',
    ],
    screenshotLabel: 'App Screenshot: Data Export Panel',
    screenshotNote: '← Paste your screenshot URL here',
  },
  {
    id: 'terms',
    icon: '📋',
    label: 'LEGAL / 07',
    title: 'Terms of Service',
    body: [
      "By using Dtailbase, you agree to use the platform as a studio management tool for lawful business purposes. Users are responsible for the accuracy of data entered and for ensuring their own legal waiver documents comply with applicable local law.",
      "Dtailbase provides the platform and infrastructure. The studio owner is responsible for the content of their indemnity templates and for how they are used with clients.",
    ],
    highlights: [
      'Platform provided as a business management tool',
      'Users responsible for accuracy of entered data',
      'Waiver template content is the studio owner\'s responsibility',
      'Accounts may be terminated for misuse or abuse',
      'Terms subject to update — users notified of material changes',
    ],
    screenshotLabel: null,
    screenshotNote: null,
  },
  {
    id: 'liability',
    icon: '⚖️',
    label: 'LEGAL / 08',
    title: 'Limitation of Liability',
    body: [
      "Dtailbase is a management and documentation platform. While we provide the tools to create, collect, and store digital indemnity documents, the legal validity of signed waivers in any given jurisdiction remains the responsibility of the studio owner.",
      "We strongly recommend that studio owners consult with a legal professional in their region to ensure that their indemnity template content meets local legal requirements. Dtailbase provides the infrastructure — the legal substance of your waivers is yours to manage.",
    ],
    highlights: [
      'Dtailbase provides documentation infrastructure, not legal advice',
      'Waiver validity under local law is the studio owner\'s responsibility',
      'South African POPIA compliance framework observed',
      'Platform liability limited to the value of the current subscription',
      'Contact our compliance team for enterprise-grade legal documentation',
    ],
    screenshotLabel: null,
    screenshotNote: null,
  },
];

const Legal = () => {
  return (
    <div className="landing-page">
      <section className="products-hero animate-on-scroll">
        <div className="about-intro-badge">⚖️ Legal Framework</div>
        <h1 className="hero-title">
          Your Legal <span className="highlight">Fortress.</span>
        </h1>
        <p className="hero-subtitle" style={{ maxWidth: '680px', margin: '0 auto' }}>
          Every feature in Dtailbase was built with one goal: to protect your business with
          indestructible, court-ready records. Here&apos;s exactly how it works.
        </p>
      </section>

      <section className="legal-section container">
        {LEGAL_SECTIONS.map((section) => (
          <div key={section.id} className="legal-card animate-on-scroll">
            <div className="legal-card-header">
              <span className="legal-card-icon">{section.icon}</span>
              <div>
                <span className="legal-card-label">{section.label}</span>
                <h3>{section.title}</h3>
              </div>
            </div>

            {section.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}

            <ul className="legal-highlights">
              {section.highlights.map((h) => (
                <li key={h}>
                  <span className="check-mark">✓</span>
                  {h}
                </li>
              ))}
            </ul>

            {section.screenshotLabel && (
              <div className="screenshot-slot">
                {/* PASTE YOUR APP SCREENSHOT URL BELOW — uncomment the img tag */}
                {/* <img src="YOUR_SCREENSHOT_URL_HERE" alt={section.screenshotLabel} /> */}
                <span className="screenshot-slot-label">{section.screenshotLabel}</span>
                <span className="screenshot-slot-note">{section.screenshotNote}</span>
              </div>
            )}
          </div>
        ))}

        <div className="legal-cta-box animate-on-scroll">
          <h3>Need a Custom Data Processing Agreement?</h3>
          <p>
            For enterprise clients or businesses operating under specific compliance requirements,
            our team can provide tailored Data Processing Agreements and legal documentation support.
          </p>
          <a href="mailto:legal@netic.co.za" className="btn-outline">
            Contact Compliance Team
          </a>
        </div>
      </section>
    </div>
  );
};

export default Legal;