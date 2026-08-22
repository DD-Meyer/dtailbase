import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Clock,
  Camera,
  Folder,
  Lock,
  Upload,
  Clipboard,
  Scale,
  Check,
  ChevronDown,
} from "lucide-react";
import PublicShell from "../../components/public/PublicShell";
import styles from "./LegalPage.module.css";

const LEGAL_SECTIONS = [
  {
    id: "geo",
    icon: MapPin,
    label: "Protection / 01",
    title: "Location Verification & Geofencing",
    body: [
      "Every indemnity waiver signed through DtailBase captures the client's GPS coordinates at the exact moment of signing. The system geofences signatures to your studio's registered physical location — meaning a waiver can only be validly completed when the client is physically present at your premises.",
      "This creates a legally meaningful record that the client was on-site and acknowledged the document in person — something a paper form can never definitively prove.",
    ],
    highlights: [
      "GPS coordinates logged at time of every signature",
      "Geofence radius configurable per studio",
      "Out-of-range signing attempts are flagged in the record",
      "Location data stored permanently — cannot be altered",
      "Adds undeniable proof of physical presence at signing",
    ],
  },
  {
    id: "signatures",
    icon: Clock,
    label: "Protection / 02",
    title: "Timestamped Digital Signatures",
    body: [
      "Every signature collected through DtailBase is assigned an immutable timestamp the moment it is submitted. The record includes the exact date, time (to the second), IP address of the device used, and the version of the legal document that was signed.",
      "Even years later you can produce a complete, court-ready record showing exactly who signed, what they signed, when they signed it, and from where. Paper files get lost. DtailBase records do not.",
    ],
    highlights: [
      "Exact timestamp (date, time, second) per signature",
      "IP address of signing device logged and stored",
      "Document version control — the signed version is preserved",
      "Signed PDFs downloadable at any time for legal use",
      "Records are permanent and cannot be retroactively edited",
    ],
  },
  {
    id: "photos",
    icon: Camera,
    label: "Protection / 03",
    title: "Photo & Visual Evidence Storage",
    body: [
      "Before a technician touches a vehicle, photos of its condition are captured and stored. After the work is done, post-service photos are added to the same booking record. Both sets of images are timestamped, cloud-stored, and permanently linked to the client, vehicle, and signed waiver.",
      "This visual evidence is your strongest protection against 'ghost claims' — situations where a client alleges damage that existed before the service.",
    ],
    highlights: [
      "Before & after photos captured per booking",
      "Timestamped and linked to client, vehicle, and waiver",
      "Cloud-stored — accessible from any device at any time",
      "Multiple photo slots per booking (plan-dependent)",
      "Provides visual proof in any dispute or insurance claim",
    ],
  },
  {
    id: "history",
    icon: Folder,
    label: "Protection / 04",
    title: "Indestructible Service History",
    body: [
      "Every booking, waiver, photo, and payment record forms part of a permanent, tamper-evident service history — linked to both the client and their vehicle.",
      "An indestructible record is your best ally in any legal or insurance dispute. It removes ambiguity, proves your process, and demonstrates professional standard of care.",
    ],
    highlights: [
      "Full booking history per client and vehicle",
      "Signed waivers permanently associated with their booking",
      "Photo evidence tied to service date and technician",
      "Records cannot be deleted by users — audit-safe",
      "History accessible on Enterprise plan for the lifetime of the account",
    ],
  },
  {
    id: "privacy",
    icon: Lock,
    label: "Legal / 05",
    title: "Data Privacy & Encryption",
    body: [
      "All data stored in DtailBase is encrypted using industry-standard AES-256 protocols — both at rest and in transit. Client information, signed documents, and media files are handled with the same level of security as financial institutions.",
      "We do not sell your data. We do not share client records with third parties. Your studio's information belongs to you — and only you.",
    ],
    highlights: [
      "AES-256 encryption for all stored data",
      "Encrypted in transit via HTTPS / TLS",
      "No third-party data sharing or selling",
      "POPIA-aware data handling practices",
      "Data stored on secure VPS infrastructure",
    ],
  },
  {
    id: "ownership",
    icon: Upload,
    label: "Legal / 06",
    title: "Data Ownership & Portability",
    body: [
      "You own your data. Should you ever choose to leave DtailBase, you can export your complete client list, vehicle records, booking history, and service data in CSV format at any time. No lock-in.",
      "DtailBase is a tool you use, not a vault that traps your information.",
    ],
    highlights: [
      "Full data export available at any time",
      "Customer lists and booking history in CSV format",
      "No cancellation penalty or data retention hold",
      "Data deletion available on request",
      "You retain ownership of all client-submitted information",
    ],
  },
  {
    id: "terms",
    icon: Clipboard,
    label: "Legal / 07",
    title: "Terms of Service",
    body: [
      "By using DtailBase, you agree to use the platform as a studio management tool for lawful business purposes. Users are responsible for the accuracy of data entered and for ensuring their own legal waiver documents comply with applicable local law.",
      "DtailBase provides the platform and infrastructure. The studio owner is responsible for the content of their indemnity templates and for how they are used with clients.",
    ],
    highlights: [
      "Platform provided as a business management tool",
      "Users responsible for accuracy of entered data",
      "Waiver template content is the studio owner's responsibility",
      "Accounts may be terminated for misuse or abuse",
      "Terms subject to update — users notified of material changes",
    ],
  },
  {
    id: "liability",
    icon: Scale,
    label: "Legal / 08",
    title: "Limitation of Liability",
    body: [
      "DtailBase is a management and documentation platform. While we provide the tools to create, collect, and store digital indemnity documents, the legal validity of signed waivers in any given jurisdiction remains the responsibility of the studio owner.",
      "We strongly recommend that studio owners consult with a legal professional in their region to ensure that their indemnity template content meets local legal requirements.",
    ],
    highlights: [
      "DtailBase provides infrastructure, not legal advice",
      "Waiver validity under local law is the studio owner's responsibility",
      "South African POPIA compliance framework observed",
      "Platform liability limited to the value of the current subscription",
      "Contact our compliance team for enterprise-grade legal documentation",
    ],
  },
];

export default function LegalPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      const expanded = LEGAL_SECTIONS.reduce((acc, s) => {
        acc[s.id] = true;
        return acc;
      }, {});
      setOpenSections(expanded);
      return;
    }
    setOpenSections((prev) =>
      Object.keys(prev).length ? prev : { [LEGAL_SECTIONS[0].id]: true }
    );
  }, [isMobile]);

  const toggle = (id) => {
    if (!isMobile) return;
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toc = useMemo(
    () => LEGAL_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
    []
  );

  return (
    <PublicShell>
      <section className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>
            <Scale size={12} strokeWidth={2.5} />
            Legal framework
          </span>
          <h1 className={styles.title}>
            Your legal
            <span className={styles.titleAccent}> fortress.</span>
          </h1>
          <p className={styles.lede}>
            Every feature in DtailBase was built with one goal: to protect your
            business with indestructible, court-ready records. Here&rsquo;s
            exactly how it works.
          </p>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.layout}>
            <aside className={styles.toc} aria-label="Sections">
              <p className={styles.tocLabel}>On this page</p>
              <ol className={styles.tocList}>
                {toc.map(({ id, label }, i) => (
                  <li key={id}>
                    <a href={`#${id}`} className={styles.tocLink}>
                      <span className={styles.tocNum}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </aside>

            <div className={styles.content}>
              {LEGAL_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isOpen = !!openSections[section.id];
                return (
                  <article
                    key={section.id}
                    id={section.id}
                    className={`${styles.card} ${isOpen ? styles.cardOpen : ""}`}
                  >
                    <header className={styles.cardHead}>
                      <span className={styles.cardIcon}>
                        <Icon size={20} strokeWidth={2.25} />
                      </span>
                      <div className={styles.cardHeadText}>
                        <span className={styles.cardLabel}>{section.label}</span>
                        <h2 className={styles.cardTitle}>{section.title}</h2>
                      </div>
                      {isMobile && (
                        <button
                          type="button"
                          className={styles.toggleBtn}
                          aria-expanded={isOpen}
                          aria-controls={`${section.id}-body`}
                          onClick={() => toggle(section.id)}
                        >
                          <ChevronDown
                            size={20}
                            strokeWidth={2.25}
                            style={{
                              transform: isOpen ? "rotate(180deg)" : "none",
                              transition: "transform 200ms ease",
                            }}
                          />
                        </button>
                      )}
                    </header>

                    <div
                      id={`${section.id}-body`}
                      className={`${styles.cardBody} ${isOpen ? styles.cardBodyOpen : ""}`}
                    >
                      {section.body.map((p, i) => (
                        <p key={i} className={styles.para}>
                          {p}
                        </p>
                      ))}

                      <ul className={styles.highlights}>
                        {section.highlights.map((h) => (
                          <li key={h}>
                            <span className={styles.checkMark}>
                              <Check size={12} strokeWidth={3} />
                            </span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}

              <div className={styles.ctaBox}>
                <h3 className={styles.ctaTitle}>
                  Need a custom Data Processing Agreement?
                </h3>
                <p className={styles.ctaBody}>
                  For enterprise clients or businesses operating under specific
                  compliance requirements, our team can provide tailored DPAs
                  and legal documentation support.
                </p>
                <a
                  href="mailto:legal@netic.co.za"
                  className={styles.ctaLink}
                >
                  Contact compliance team &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
