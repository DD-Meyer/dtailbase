// BookingDetails.jsx - Detailed view for a single booking, including indemnity and photos
// This page fetches the booking details, displays customer and vehicle info,
// shows the indemnity signature and photos, and allows downloading the signed PDF agreement if available.
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const normalizeSecureUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (window.location.protocol === "https:" && rawUrl.startsWith("http://")) {
    return rawUrl.replace("http://", "https://");
  }
  return rawUrl;
};

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axios_instance";
import "../styles/BookingDetails.css";
import { formatShortRef } from "../utils/formatters";
import { showToast } from "../utils/uiFeedback";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false); // Track download state
  const [showIndemnityText, setShowIndemnityText] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`bookings/${id}/`);
        setBooking(res.data);
      } catch (err) {
        console.error("Error fetching details", err);
      }
    };
    fetchDetail();
  }, [id]);

  // --- LOGIC: Handle PDF Download ---
  const handleDownloadPDF = async () => {
    if (!booking.indemnity_data?.pdf_file) return;
    
    setIsDownloading(true);
    try {
      const response = await api.get(`indemnity/agreements/${booking.indemnity_data.id}/download/`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Agreement_${booking.vehicle_details?.registration || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
      showToast("Could not download PDF. Check if it's generated.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewSignedForm = () => {
    const signedHtml = booking?.indemnity_data?.signed_body_html;
    const fallbackTemplateHtml = booking?.indemnity_data?.template_body_html;
    if (!signedHtml && !fallbackTemplateHtml) {
      showToast("Signed indemnity text is not available on this record yet.", "error");
      return;
    }
    setShowIndemnityText(true);
  };

  if (!booking) return <div className="page-container">Loading details...</div>;

  // --- LOGIC: Handle nested Indemnity & Photos ---
  const indemnity = booking.indemnity_data;
  const signedIndemnityHtml = indemnity?.signed_body_html || indemnity?.template_body_html || '';
  const photos = indemnity?.photos || [];
  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return normalizeSecureUrl(url);
    }
    const safeBaseUrl = normalizeSecureUrl(API_BASE_URL);
    if (url.startsWith("/")) return `${safeBaseUrl}${url}`;
    return `${safeBaseUrl}/${url}`;
  };
  
  // Filter photos by type from the combined list
  const beforePhotos = photos.filter(p => p.photo_type === 'BEFORE');
  const afterPhotos = photos.filter(p => p.photo_type === 'AFTER');

  return (
    <div className="page-container">
      <div className="booking-header-action-btns flex-between mb-4">
        <button className="btn-secondary mb-4" onClick={() => navigate(-1)}><ArrowLeftIcon className="h-6 w-5"/></button>

        {/* DOWNLOAD BUTTON - More resilient logic */}
        {indemnity ? (
          <div className="action-buttons-grid flex-between" style={{ gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={handleViewSignedForm}
              disabled={!indemnity.pdf_file}
            >
              {!indemnity.pdf_file ? "📄 Form Processing..." : "👁 View Signed Form"}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleDownloadPDF}
              disabled={isDownloading || !indemnity.pdf_file}
            >
              {isDownloading ? "Downloading..." : 
              !indemnity.pdf_file ? "📄 PDF Generating..." : "📄 Download Signed PDF"}
            </button>
          </div>
        ) : (
          <span className="text-muted small">Indemnity not yet signed</span>
        )}
      </div>

      {/* Inside BookingDetails.jsx */}
      {indemnity && indemnity.latitude && (
        <div className="action-buttons-grid flex-between gap-2 mt-4">
          <button 
            className="btn-map"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${indemnity.latitude},${indemnity.longitude}`, '_blank')}
          >
            📍 View Signing Location
          </button>
          
          {indemnity.signing_address && (
            <button 
              className="btn-secondary small"
              onClick={() => {
                navigator.clipboard.writeText(indemnity.signing_address);
                showToast("Address copied to clipboard!", "success");
              }}
            >
              📋 Copy Address
            </button>
          )}
        </div>
      )}

      <div className="flex-between mb-4">
        <h1>Job Card: {booking.vehicle?.registration}</h1>
        <span className={`status-badge ${booking.status.toLowerCase()}`}>{booking.status}</span>
        <span className="text-muted small">Ref: {formatShortRef(booking.id)}</span>
      </div>

      <div className="grid-2-col mb-6">
        {/* Customer & Vehicle Info */}
        <div className="card">
          <h3>Customer Information</h3>
          {/* Note: Serializer now provides customer_details object */}
          <p><strong>Name:</strong> {booking.customer?.firstname} {booking.customer?.lastname}</p>
          <p><strong>Phone:</strong> {booking.customer?.phone}</p>
          <p><strong>Vehicle:</strong> {booking.vehicle?.make} {booking.vehicle?.model}</p>
          <p><strong>Service:</strong> {booking.service_name}</p>
        </div>

        {/* Timestamps & Authorization */}
        <div className="card">
          <h3>Work Logs</h3>
          <p><strong>Started:</strong> {booking.started_at ? new Date(booking.started_at).toLocaleString() : 'Not started'}</p>
          {booking.completed_at && (
            <p><strong>Completed:</strong> {new Date(booking.completed_at).toLocaleString()}</p>
          )}
          <div className="mt-3">
            <strong>Staff Authorization (Check-in):</strong><br/>
            {booking.admin_signature ? (
                <img src={toAbsoluteUrl(booking.admin_signature)} alt="Admin Auth" style={{ width: '150px', borderBottom: '1px solid #eee', background: 'white' }} />
            ) : <p className="text-muted">No staff signature</p>}
          </div>
        </div>
      </div>

      {/* PHOTO GALLERY SECTION */}
      <div className="card">
        <h3>Inspection Gallery</h3>
        <hr />
        
          <div className="gallery-section mt-4">
            <h4>Before Service (Arrival)</h4>
            <div className="photo-grid">
              {beforePhotos.map((img, index) => (
                <a href={toAbsoluteUrl(img.image)} target="_blank" key={index} rel="noreferrer">
                  <img src={toAbsoluteUrl(img.image)} alt="Before" className="gallery-img" />
                </a>
              ))}
              {beforePhotos.length === 0 && <p className="text-muted">No arrival photos recorded.</p>}
            </div>
          </div>

        <div className="gallery-section mt-6">
          <h4>After Service (Completion)</h4>
          <div className="photo-grid">
            {afterPhotos.map((img, index) => (
              <a href={toAbsoluteUrl(img.image)} target="_blank" key={index} rel="noreferrer">
                <img src={toAbsoluteUrl(img.image)} alt="After" className="gallery-img" />
              </a>
            ))}
            {afterPhotos.length === 0 && <p className="text-muted">No completion photos uploaded yet.</p>}
          </div>
        </div>
      </div>
      
      {/* CUSTOMER SIGNATURE (Inside Indemnity Data) */}
      <div className="card mt-6">
        <h3>Customer Indemnity Signature</h3>
        {indemnity?.signature_image ? (
            <>
            <img src={toAbsoluteUrl(indemnity.signature_image)} alt="Customer Sig" style={{ maxWidth: '100%', background: '#fff', border: '1px solid #ddd' }} />
                <p className="text-muted small mt-2">
                    Signed on: {new Date(indemnity.signed_at).toLocaleString()}<br/>
                    IP Address: {indemnity.signer_ip}<br/>

                    {/* DISPLAY THE PHYSICAL ADDRESS HERE */}
                    {indemnity.signing_address && (
                      <>
                        <strong>Verified Address:</strong> {indemnity.signing_address}<br/>
                      </>
                    )}
                </p>
            </>
        ) : (
            <p className="text-danger">Awaiting customer signature.</p>
        )}
      </div>

      {showIndemnityText && (
        <div className="indemnity-text-modal-overlay" onClick={() => setShowIndemnityText(false)}>
          <div className="indemnity-text-modal" onClick={(e) => e.stopPropagation()}>
            <div className="indemnity-text-modal-header">
              <h3>Signed Indemnity Text</h3>
              <button className="btn-secondary" onClick={() => setShowIndemnityText(false)}>Close</button>
            </div>

            {indemnity?.signed_template_title && (
              <p className="text-muted small mb-3">
                Template: {indemnity.signed_template_title}
                {indemnity?.signed_template_version ? ` (v${indemnity.signed_template_version})` : ''}
              </p>
            )}

            {!indemnity?.signed_body_html && (
              <p className="text-muted small mb-3">
                Legacy agreement: showing current template text because snapshot text was not stored at signing time.
              </p>
            )}

            <div
              className="indemnity-text-content"
              dangerouslySetInnerHTML={{ __html: signedIndemnityHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}