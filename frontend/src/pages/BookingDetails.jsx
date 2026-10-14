import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Car, Copy, Download, Eye, MapPin } from "lucide-react";
import api from "../axios_instance";
import JobActions, { JobTimer } from "../components/JobActions";
import RecordDialog from "../components/RecordDialog";
import { useCompany } from "../context/CompanyContext";
import { formatShortRef } from "../utils/formatters";
import { dateLabel, moneyLabel } from "../utils/calendar";
import { JOB_LABELS, jobError } from "../utils/jobStatus";
import { showToast } from "../utils/uiFeedback";
import "../styles/BookingDetails.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const STEPS = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"];

function imageUrl(url) {
  if (!url) return "";
  const absolute = /^(https?:|data:)/.test(url) ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  return window.location.protocol === "https:" ? absolute.replace(/^http:/, "https:") : absolute;
}

function PhotoSection({ title, photos, empty }) {
  return <section className="report-gallery-section">
    <h3>{title}<span>{photos.length} photos</span></h3>
    {photos.length ? <div className="report-photo-grid">{photos.map((photo, index) =>
      <a href={imageUrl(photo.image)} target="_blank" rel="noreferrer" key={photo.id || photo.image}>
        <img src={imageUrl(photo.image)} alt={`${title} photo ${index + 1}`} loading="lazy" />
      </a>)}</div> : <p className="report-empty">{empty}</p>}
  </section>;
}

export default function BookingDetail() {
  const { id } = useParams();
  const { company } = useCompany();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showIndemnityText, setShowIndemnityText] = useState(false);
  const fetchDetail = useCallback(async (rethrow = false) => {
    setError("");
    try {
      const { data } = await api.get(`bookings/${id}/`);
      setBooking(data);
    } catch (failure) {
      setError(jobError(failure));
      if (rethrow) throw failure;
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => {
    setBooking(null);
    setLoading(true);
    fetchDetail();
  }, [fetchDetail]);
  const retry = () => { fetchDetail(); };

  const handleDownloadPDF = async () => {
    if (isDownloading || !booking.indemnity_data?.pdf_file) return;
    setIsDownloading(true);
    try {
      const response = await api.get(`indemnity/agreements/${booking.indemnity_data.id}/download/`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Agreement_${booking.vehicle?.registration || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { showToast(`Could not download PDF: ${jobError(failure)}`, "error"); }
    finally { setIsDownloading(false); }
  };
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(booking.indemnity_data.signing_address);
      showToast("Address copied.", "success");
    } catch (failure) { showToast(`Could not copy address: ${jobError(failure)}`, "error"); }
  };
  if (!booking) return <div className="booking-report">
    <Link to="/bookings" className="report-back"><ArrowLeft size={18} />Back to bookings</Link>
    {error ? <div role="alert" className="record-fetch-error"><p>{error}</p><button className="btn btn-secondary" onClick={retry}>Try again</button></div> :
      <p role="status">{loading ? "Loading job report..." : "Job report unavailable."}</p>}
  </div>;

  const indemnity = booking.indemnity_data;
  const photos = indemnity?.photos || [];
  const signedText = indemnity?.signed_body_html || indemnity?.template_body_html;
  const name = `${booking.customer?.firstname || ""} ${booking.customer?.lastname || ""}`.trim();
  const step = STEPS.indexOf(booking.status);
  const Location = booking.location_type === "MOBILE" ? Car : Building2;
  return <div className="booking-report">
    <Link to="/bookings" className="report-back"><ArrowLeft size={18} aria-hidden="true" />Back to bookings</Link>
    {error && <div role="alert" className="record-fetch-error"><p>{error}</p><button className="btn btn-secondary" onClick={retry}>Refresh report</button></div>}
    <header className="report-heading">
      <div><p className="report-eyebrow">Job report · Ref {formatShortRef(booking.id)}</p>
        <h1>{booking.vehicle?.registration || "Booking"}</h1>
        <p>{booking.service_name} · {name}</p></div>
      <div className="report-estimate"><span>Estimated value</span><strong>{moneyLabel(booking.total_price, company?.currency || "USD")}</strong></div>
    </header>
    <section className="report-workflow" aria-label="Job progress and actions">
      {booking.status === "CANCELLED" ? <p>This booking was cancelled.</p> :
        <ol className="report-progress">{STEPS.map((status, index) =>
          <li key={status} className={index <= step ? "is-reached" : ""} aria-current={index === step ? "step" : undefined}>
            <span aria-hidden="true">{index + 1}</span>{JOB_LABELS[status]}
          </li>)}</ol>}
      <JobActions key={id} booking={booking} name={name} onUpdated={() => fetchDetail(true)} />
      {booking.status === "CONFIRMED" && !booking.can_start && <p className="report-hint">A customer signature and BEFORE photos are required to start this job.</p>}
      {booking.status === "IN_PROGRESS" && booking.started_at && <p className="report-hint">Time on job: <JobTimer startedAt={booking.started_at} /></p>}
    </section>
    <div className="report-info-grid">
      <section className="report-section">
        <h2>Customer & vehicle</h2>
        <dl className="report-fields">
          <div><dt>Customer</dt><dd>{name}</dd></div>
          <div><dt>Phone</dt><dd>{booking.customer?.phone || "Not provided"}</dd></div>
          <div><dt>Vehicle</dt><dd>{booking.vehicle?.make} {booking.vehicle?.model}</dd></div>
          <div><dt>Registration</dt><dd>{booking.vehicle?.registration}</dd></div>
          <div><dt>Service</dt><dd>{booking.service_name}</dd></div>
        </dl>
      </section>
      <section className="report-section">
        <h2>Appointment & work log</h2>
        <dl className="report-fields">
          <div><dt>Appointment</dt><dd>{dateLabel(booking.booking_date)}<br />{booking.booking_time?.slice(0, 5)}–{booking.booking_end_time?.slice(0, 5)}</dd></div>
          <div><dt>Location</dt><dd className="report-location"><Location size={16} aria-hidden="true" />{booking.location_type === "MOBILE" ? "Mobile, at the customer" : "On-site at the workshop"}</dd></div>
          {booking.location_type === "MOBILE" && <div><dt>Address</dt><dd>{booking.customer_address || "Not provided"}</dd></div>}
          <div><dt>Started</dt><dd>{booking.started_at ? new Date(booking.started_at).toLocaleString() : "Not started"}</dd></div>
          <div><dt>Completed</dt><dd>{booking.completed_at ? new Date(booking.completed_at).toLocaleString() : "Not completed"}</dd></div>
          <div><dt>Staff check-in</dt><dd>{booking.admin_signature ? <img className="report-signature" src={imageUrl(booking.admin_signature)} alt="Staff authorization signature" /> : "No staff signature"}</dd></div>
        </dl>
      </section>
    </div>
    {booking.notes && <section className="report-section"><h2>Job notes</h2><p className="report-notes">{booking.notes}</p></section>}
    <section className="report-section"><h2>Inspection gallery</h2>
      <div className="report-gallery">
        <PhotoSection title="Before service" photos={photos.filter(photo => photo.photo_type === "BEFORE")} empty="No arrival photos recorded." />
        <PhotoSection title="After service" photos={photos.filter(photo => photo.photo_type === "AFTER")} empty="No completion photos uploaded yet." />
      </div>
    </section>
    <section className="report-section">
      <div className="report-section-heading"><div><h2>Indemnity & documents</h2><p>{indemnity?.signature_image ? "Customer agreement signed" : "Awaiting customer signature"}</p></div>
        {indemnity && <div className="report-document-actions">
          <button className="btn btn-secondary" disabled={!signedText} onClick={() => setShowIndemnityText(true)}><Eye size={16} aria-hidden="true" />View agreement</button>
          <button className="btn btn-secondary" disabled={isDownloading || !indemnity.pdf_file} onClick={handleDownloadPDF}><Download size={16} aria-hidden="true" />{isDownloading ? "Downloading..." : indemnity.pdf_file ? "Download signed PDF" : "PDF not available yet"}</button>
        </div>}
      </div>
      {indemnity?.signature_image && <div className="report-agreement">
        <img className="report-signature" src={imageUrl(indemnity.signature_image)} alt="Customer indemnity signature" />
        <dl className="report-fields">
          <div><dt>Signed</dt><dd>{indemnity.signed_at ? new Date(indemnity.signed_at).toLocaleString() : "Not recorded"}</dd></div>
          <div><dt>IP address</dt><dd>{indemnity.signer_ip || "Not recorded"}</dd></div>
          {indemnity.signing_address && <div><dt>Signing address</dt><dd>{indemnity.signing_address}</dd></div>}
        </dl>
      </div>}
      {indemnity?.latitude != null && indemnity?.longitude != null && <div className="report-document-actions">
        <a className="btn btn-secondary" href={`https://www.google.com/maps/search/?api=1&query=${indemnity.latitude},${indemnity.longitude}`} target="_blank" rel="noreferrer"><MapPin size={16} aria-hidden="true" />View signing location</a>
        {indemnity.signing_address && <button className="btn btn-secondary" onClick={copyAddress}><Copy size={16} aria-hidden="true" />Copy address</button>}
      </div>}
    </section>
    {showIndemnityText && <RecordDialog title="Signed indemnity text" onClose={() => setShowIndemnityText(false)}>
      {indemnity.signed_template_title && <p>Template: {indemnity.signed_template_title}{indemnity.signed_template_version ? ` (v${indemnity.signed_template_version})` : ""}</p>}
      {!indemnity.signed_body_html && <p className="report-hint">Legacy agreement: showing current template text because snapshot text was not stored at signing time.</p>}
      <div className="report-signed-text" dangerouslySetInnerHTML={{ __html: signedText }} />
    </RecordDialog>}
  </div>;
}
