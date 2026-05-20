import { useContext, useState } from "react";
import LiveChat from "../components/LiveChat";
import { AuthContext } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import { createSupportTicket } from "../services/supportService";

const Contact = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const { currentPlan } = useCompany();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: "", text: "" });
  const canUseLiveChat = isAuthenticated && currentPlan === "ENTERPRISE";

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
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button
              type="button"
              className="btn-main"
              onClick={() => canUseLiveChat && setIsChatOpen(true)}
              disabled={!canUseLiveChat}
            >
              Open Live Chat
            </button>
            {!isAuthenticated && (
              <span style={{ color: "#94a3b8", fontSize: "0.9rem", alignSelf: "center" }}>
                Live support tickets require a logged in company account.
              </span>
            )}
            {isAuthenticated && currentPlan !== "ENTERPRISE" && (
              <span style={{ color: "#94a3b8", fontSize: "0.9rem", alignSelf: "center" }}>
                Live chat is reserved for Enterprise plans as priority support.
              </span>
            )}
          </div>

          <form className="orbital-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Ticket Subject</label>
              <input
                type="text"
                placeholder="Example: Billing issue after plan upgrade"
                className="nav-item"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", padding: "12px", color: "white" }}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="form-group mt-4">
              <label>Message</label>
              <textarea
                placeholder="Tell us what you need and include any urgency details..."
                rows="4"
                className="nav-item"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", padding: "12px", color: "white" }}
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

      <LiveChat companySlug="dtailbase" isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default Contact;