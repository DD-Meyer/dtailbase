import { useContext, useState } from "react";
import { Send, Zap, Mail, MapPin, Phone } from "lucide-react";
import LiveChat from "../../components/LiveChat";
import { AuthContext } from "../../context/AuthContext";
import { useCompany } from "../../context/CompanyContext";
import { createSupportTicket } from "../../services/supportService";
import PublicShell from "../../components/public/PublicShell";
import styles from "./ContactPage.module.css";

const PLATFORM_COMPANIES = new Set(["Platform Admin", "DtailBase"]);

export default function ContactPage() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { currentPlan } = useCompany();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: "", text: "" });
  const isPlatformAdmin =
    !!user &&
    (user.is_superuser || user.is_staff) &&
    PLATFORM_COMPANIES.has(user?.company?.name);
  const canUseLiveChat =
    isAuthenticated && (isPlatformAdmin || currentPlan === "ENTERPRISE");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setSubmitState({
        type: "error",
        text:
          "Please log in with your company account to send a support ticket.",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setSubmitState({
        type: "error",
        text: "Please add a subject and message.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitState({ type: "", text: "" });
      await createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject("");
      setMessage("");
      setSubmitState({
        type: "success",
        text: "Support ticket submitted. The DtailBase team has received it.",
      });
    } catch (error) {
      const apiError = error?.response?.data;
      setSubmitState({
        type: "error",
        text:
          apiError?.detail ||
          apiError?.message ||
          "Unable to submit ticket right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicShell>
      <section className={styles.hero}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>Contact</span>
          <h1 className={styles.title}>
            Talk to a real person &mdash;
            <span className={styles.titleAccent}> not a bot.</span>
          </h1>
          <p className={styles.lede}>
            Questions about DtailBase, a custom rollout, or a billing issue?
            Send us a note. We reply fast.
          </p>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          <div className={styles.grid}>
            {/* Contact info */}
            <aside className={styles.info}>
              <h2 className={styles.infoTitle}>Reach us</h2>

              <ul className={styles.infoList}>
                <li>
                  <span className={styles.infoIcon}>
                    <Mail size={18} strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className={styles.infoLabel}>Email</p>
                    <a
                      href="mailto:info@netictechnologies.com"
                      className={styles.infoValue}
                    >
                      info@netictechnologies.com
                    </a>
                  </div>
                </li>
                <li>
                  <span className={styles.infoIcon}>
                    <Phone size={18} strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className={styles.infoLabel}>Support</p>
                    <p className={styles.infoValue}>Reply within 4h business hours</p>
                  </div>
                </li>
                <li>
                  <span className={styles.infoIcon}>
                    <MapPin size={18} strokeWidth={2.25} />
                  </span>
                  <div>
                    <p className={styles.infoLabel}>Based in</p>
                    <p className={styles.infoValue}>Johannesburg &middot; Cape Town</p>
                  </div>
                </li>
              </ul>

              {canUseLiveChat && (
                <button
                  type="button"
                  className={styles.liveBtn}
                  onClick={() => setIsChatOpen(true)}
                >
                  <Zap size={16} strokeWidth={2.25} />
                  Premium live chat
                </button>
              )}

              {isAuthenticated && !canUseLiveChat && (
                <p className={styles.notice}>
                  Live chat is a Premium Enterprise perk. Submit a ticket and
                  we&rsquo;ll respond in order of receipt.
                </p>
              )}

              {!isAuthenticated && (
                <p className={styles.notice}>
                  Log in with your company account to submit a support ticket
                  linked to your subscription.
                </p>
              )}
            </aside>

            {/* Form */}
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="contact-subject" className={styles.label}>
                  Ticket subject
                </label>
                <input
                  id="contact-subject"
                  className={styles.input}
                  type="text"
                  placeholder="Example: Billing issue after plan upgrade"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="contact-message" className={styles.label}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Tell us what you need and include any urgency details…"
                  rows="6"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                className={styles.submitBtn}
                type="submit"
                disabled={isSubmitting}
              >
                <Send size={16} strokeWidth={2.25} />
                {isSubmitting ? "Sending…" : "Send support ticket"}
              </button>

              {submitState.text && (
                <p
                  className={`${styles.feedback} ${
                    submitState.type === "error"
                      ? styles.feedbackError
                      : submitState.type === "success"
                      ? styles.feedbackSuccess
                      : ""
                  }`}
                >
                  {submitState.text}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {canUseLiveChat && (
        <LiveChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}
    </PublicShell>
  );
}
