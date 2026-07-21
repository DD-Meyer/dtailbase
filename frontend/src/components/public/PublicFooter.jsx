import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import styles from "./PublicFooter.module.css";

const Icon = ({ children, label }) => (
  <svg
    role="img"
    aria-label={label}
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    {children}
  </svg>
);

const XIcon = () => (
  <Icon label="X">
    <path d="M18.244 2H21l-6.53 7.46L22 22h-6.828l-4.79-6.26L4.8 22H2l7.02-8.01L2 2h6.914l4.32 5.72L18.244 2Zm-1.196 18h1.65L7.03 4H5.28l11.768 16Z" />
  </Icon>
);
const LinkedinIcon = () => (
  <Icon label="LinkedIn">
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
  </Icon>
);
const FacebookIcon = () => (
  <Icon label="Facebook">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  </Icon>
);
const InstagramIcon = () => (
  <Icon label="Instagram">
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.71 3.71 0 0 1-1.38-.9 3.71 3.71 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.34 4.14.63a5.87 5.87 0 0 0-2.13 1.38A5.87 5.87 0 0 0 .63 4.14C.34 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.27 2.15.56 2.91a5.87 5.87 0 0 0 1.38 2.13c.63.63 1.29 1.02 2.13 1.38.76.29 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.27 2.91-.56a5.87 5.87 0 0 0 2.13-1.38 5.87 5.87 0 0 0 1.38-2.13c.29-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.27-2.15-.56-2.91a5.87 5.87 0 0 0-1.38-2.13A5.87 5.87 0 0 0 19.86.63C19.1.34 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
  </Icon>
);

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { to: "/products", label: "Features" },
      { to: "/plans", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/help-center", label: "Help center" },
      { to: "/support-info", label: "Support" },
      { to: "/legal", label: "Legal" },
    ],
  },
];

const SOCIAL = [
  { icon: XIcon, label: "X (Twitter)", href: "https://twitter.com" },
  { icon: LinkedinIcon, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: FacebookIcon, label: "Facebook", href: "https://facebook.com" },
  { icon: InstagramIcon, label: "Instagram", href: "https://instagram.com" },
];

export default function PublicFooter() {
  return (
    <footer className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <Link to="/" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">D</span>
              <span className={styles.brandName}>DtailBase</span>
            </Link>
            <p className={styles.tag}>
              The all-in-one booking, payments, and job-management
              platform built for auto detailers.
            </p>

            <a href="mailto:info@netictechnologies.com" className={styles.contactLink}>
              <Mail size={16} strokeWidth={2.25} />
              info@netictechnologies.com
            </a>
          </div>

          <div className={styles.linksGrid}>
            {FOOTER_LINKS.map((col) => (
              <div key={col.title} className={styles.col}>
                <h4 className={styles.colTitle}>{col.title}</h4>
                <ul className={styles.colList}>
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className={styles.colLink}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.legal}>
            &copy; {new Date().getFullYear()} DtailBase. All rights reserved.
          </p>

          <div className={styles.legalLinks}>
            <Link to="/legal">Terms</Link>
            <Link to="/legal">Privacy</Link>
            <Link to="/legal">Refund policy</Link>
          </div>

          <ul className={styles.socials} aria-label="Social links">
            {SOCIAL.map(({ icon: Icon, label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={styles.social}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
