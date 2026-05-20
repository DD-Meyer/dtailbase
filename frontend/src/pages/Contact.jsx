import { useContext, useState } from "react";
import LiveChat from "../components/LiveChat";
import { AuthContext } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { createSupportTicket } from "../services/supportService";

const PLATFORM_COMPANIES = new Set(["Platform Admin", "DtailBase"]);

const Contact = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { currentPlan } = useCompany();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: "", text: "" });
  const isPlatformAdmin =
    !!user && (user.is_superuser || user.is_staff) && PLATFORM_COMPANIES.has(user?.company?.name);
  const canUseLiveChat = isAuthenticated && (isPlatformAdmin || currentPlan === "ENTERPRISE");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setSubmitState({
        type: "error",
        text: "Please log in with your company account to send a support ticket.",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setSubmitState({ type: "error", text: "Please add a subject and message." });
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
        text: apiError?.detail || apiError?.message || "Unable to submit ticket right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      <section className="hero-container mini-hero">
        <div className="hero-content animate-on-scroll">
          <h1 className="hero-title">Establish <span className="highlight">Comm Link.</span></h1>
          <p className="hero-subtitle">Need a custom deployment? Our technicians are online.</p>
        </div>
      </section>

      <section className="container max-w-md">
        <div className="feature-card animate-on-scroll" style={{ maxWidth: "680px", margin: "0 auto" }}>
          {canUseLiveChat && (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
              <button
                type="button"
                className="btn-main"
                onClick={() => setIsChatOpen(true)}
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "1px solid #fbbf24",
                  boxShadow: "0 0 18px rgba(245, 158, 11, 0.45)",
                }}
              >
                ⚡ Premium Instant Message
              </button>
              <span style={{ color: "#fbbf24", fontSize: "0.85rem" }}>
                Instant feedback and priority support direct from our technicians.
              </span>
            </div>
          )}
          {isAuthenticated && !canUseLiveChat && (
            <div style={{ marginBottom: "16px", color: "#94a3b8", fontSize: "0.9rem" }}>
              Submit a support ticket below — our team responds in order of receipt. Live chat is a Premium Enterprise perk.
            </div>
          )}
          {!isAuthenticated && (
            <div style={{ marginBottom: "16px", color: "#94a3b8", fontSize: "0.9rem" }}>
              Log in with your company account to submit a support ticket.
            </div>
          )}

          <form className="orbital-form" onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem", display: "block", marginBottom: "8px" }}>Ticket Subject</label>
              <input
                type="text"
                placeholder="Example: Billing issue after plan upgrade"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px", color: "#ffffff" }}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <label style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.95rem", display: "block", marginBottom: "8px" }}>Message</label>
              <textarea
                placeholder="Tell us what you need and include any urgency details..."
                rows="4"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px", color: "#ffffff" }}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              ></textarea>
            </div>
            <button className="btn-main mt-6 w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Support Ticket"}
            </button>
            {submitState.text && (
              <p
                style={{
                  marginTop: "12px",
                  color: submitState.type === "success" ? "#86efac" : "#fca5a5",
                }}
              >
                {submitState.text}
              </p>
            )}
          </form>
        </div>
      </section>

      {canUseLiveChat && (
        <LiveChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      )}
    </div>
  );
};

export default Contact;