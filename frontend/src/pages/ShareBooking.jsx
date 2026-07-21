import { useMemo, useState } from "react";
import { ArrowLeft, Copy, ExternalLink, Code2, Link2, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";
import "../styles/ShareBooking.css";

function ShareBooking() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [copyMessage, setCopyMessage] = useState("");

  const publicBookingLink = useMemo(() => {
    if (!company?.slug) return "";
    return `${window.location.origin}/book/${company.slug}`;
  }, [company?.slug]);

  const embedCode = useMemo(() => {
    if (!publicBookingLink) return "";
    return `<iframe src=\"${publicBookingLink}\" title=\"${company?.name || "Booking"} Online Booking\" width=\"100%\" height=\"800\" style=\"border:0;border-radius:12px;overflow:hidden;\" loading=\"lazy\"></iframe>`;
  }, [company?.name, publicBookingLink]);

  const copyText = async (value, successLabel) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(successLabel);
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    }
  };

  const shareLink = async () => {
    if (!publicBookingLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${company?.name || "Company"} Booking Link`,
          text: "Book your next appointment online",
          url: publicBookingLink,
        });
        return;
      } catch {
        // Fallback to clipboard below.
      }
    }
    copyText(publicBookingLink, "Booking link copied to clipboard.");
  };

  return (
    <div className="share-booking-page">
      <button type="button" className="share-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>

      <div className="share-booking-shell">
        <header className="share-booking-header">
          <h1>Share Booking</h1>
          <p>Send your public booking flow to clients or embed it directly on your website.</p>
          {copyMessage && <p className="share-feedback">{copyMessage}</p>}
        </header>

        <div className="share-booking-grid">
          <section className="share-card">
            <h2><Code2 size={18} aria-hidden="true" /> Embed</h2>
            <p>Copy this code and paste it into your company website.</p>
            <textarea className="share-code-block" value={embedCode} readOnly />
            <button type="button" className="share-btn" onClick={() => copyText(embedCode, "Embed code copied.")}>
              <Copy size={16} aria-hidden="true" />
              Copy Embed Code
            </button>
          </section>

          <section className="share-card">
            <h2><Link2 size={18} aria-hidden="true" /> Share Link</h2>
            <p>Share your direct booking URL with customers.</p>
            <div className="share-link-block">{publicBookingLink || "Loading booking link..."}</div>
            <div className="share-actions-row">
              <button type="button" className="share-btn" onClick={() => copyText(publicBookingLink, "Booking link copied.")}>
                <Copy size={16} aria-hidden="true" />
                Copy Link
              </button>
              <button type="button" className="share-btn share-btn-secondary" onClick={shareLink}>
                <Share2 size={16} aria-hidden="true" />
                Share
              </button>
            </div>
            <a href={publicBookingLink || "#"} target="_blank" rel="noreferrer" className="share-open-link">
              <ExternalLink size={14} aria-hidden="true" />
              Open Public Booking Page
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ShareBooking;
