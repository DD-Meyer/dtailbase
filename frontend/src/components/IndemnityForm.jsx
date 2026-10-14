import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import api from "../axios_instance";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Indemnity.css";
import { formatShortRef } from "../utils/formatters";
import { useCompany } from "../context/CompanyContext";
import { resizeImagesToPlanLimit } from "../utils/imageResize";
import { jobError } from "../utils/jobStatus";
import { Camera, Check, PenLine, FileText, X } from "lucide-react";

function IndemnityForm({ bookingId: suppliedBookingId, onSuccess, onClose, onBusyChange }) {
  const { bookingId: routeBookingId } = useParams();
  const bookingId = suppliedBookingId || routeBookingId;
  const { planLimits, company } = useCompany();
  const sigCanvas = useRef({});
  const signatureContainer = useRef(null);
  const navigate = useNavigate();

  const [bookingData, setBookingData] = useState(null);
  const [template, setTemplate] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const previewUrls = useRef(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  // Inside IndemnityForm component
  const maxBeforePhotos = planLimits?.max_images_before ?? 2; // Default to 2 if not loaded yet
  const maxImageWidth = planLimits?.max_image_width ?? 1280;
  const maxImageHeight = planLimits?.max_image_height ?? 720;

  // Add preview state at the top of Bookings component
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const photoLock = useRef(false);
  useEffect(() => {
    onBusyChange?.(isSubmitting || isProcessingPhotos);
  }, [isSubmitting, isProcessingPhotos, onBusyChange]);
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // 1. Consolidated Data Loader
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setIsLoading(true);
        // We only need these two now! Company is already in Context.
        const [bookingRes, templateRes] = await Promise.all([
          api.get(`bookings/${bookingId}/`),
          api.get("indemnity/template/latest/", { params: { booking: bookingId } })
        ]);

        setBookingData(bookingRes.data);
        setTemplate(templateRes.data);

        if (bookingRes.data.status !== "CONFIRMED") {
          setError("This booking is not in a 'Confirmed' state.");
          return;
        }
        setError(null);
      } catch (err) {
        setError(jobError(err));
      } finally {
        setIsLoading(false);
      }
    };
    if (bookingId) loadFormData();
  }, [bookingId]);

  useEffect(() => {
    const container = signatureContainer.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const pad = sigCanvas.current;
      const canvas = pad.getCanvas();
      const width = container.clientWidth;
      if (!width) return;
      const oldWidth = Number(canvas.dataset.logicalWidth) || width;
      const strokes = pad.toData().map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => ({ ...point, x: point.x * width / oldWidth })),
      }));
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(200 * ratio);
      canvas.getContext("2d").scale(ratio, ratio);
      canvas.dataset.logicalWidth = String(width);
      pad.clear();
      pad.fromData(strokes);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isLoading, error]);

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (photoLock.current || submitLock.current || !files.length) return;
    
    // Calculate how many more photos are allowed
    const remainingSlots = maxBeforePhotos - beforePhotos.length;
    
    if (remainingSlots <= 0) {
      triggerToast(`You have reached your limit of ${maxBeforePhotos} photos`, "error");
      return;
    }

    // Only take what's allowed
    const allowedFiles = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      triggerToast(`Only the first ${remainingSlots} photos were added due to plan limits.`, "info");
    }

    photoLock.current = true;
    setIsProcessingPhotos(true);
    try {
      const resizedFiles = await resizeImagesToPlanLimit(
        allowedFiles,
        maxImageWidth,
        maxImageHeight
      );
      setBeforePhotos((prev) => [...prev, ...resizedFiles]);
      const newPreviews = resizedFiles.map((file) => URL.createObjectURL(file));
      newPreviews.forEach((url) => previewUrls.current.add(url));
      setPreviews((prev) => [...prev, ...newPreviews]);
    } catch (resizeError) {
      console.error("Image resize failed:", resizeError);
      triggerToast("Could not process one or more images. Please try again.", "error");
    } finally {
      photoLock.current = false;
      setIsProcessingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(previews[index]);
    previewUrls.current.delete(previews[index]);
    setBeforePhotos(beforePhotos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const clearSignature = () => sigCanvas.current.clear();

  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current || photoLock.current) return;
    if (!template || !bookingData) return;
    if (sigCanvas.current.isEmpty()) {
      triggerToast("Please provide a signature.", "error");
      return;
    }
    if (beforePhotos.length < 1) {
      triggerToast("Please upload at least one BEFORE image.", "error");
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);

    // 1. Check if geolocation is supported
    if (!("geolocation" in navigator)) {
      triggerToast(
        "Geolocation is not supported by your browser. Please use a different device/browser for security compliance.",
        "error"
      );
      setIsSubmitting(false);
      submitLock.current = false;
      return;
    }

    // 2. Request location immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
        // 3. Success: Proceed to upload
        processUpload(coords);
      },
      (err) => {
        // 4. Error: Handle denials or timeouts
        let errorMessage = "Location is mandatory for security. ";
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += "Please enable location permissions in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }
        
        triggerToast(errorMessage, "error");
        setIsSubmitting(false);
        submitLock.current = false;
      },
      { 
        enableHighAccuracy: true, // Force GPS instead of IP-based location
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  // Create this helper function to handle the API call
  const processUpload = async (coords) => {
    // FINAL SAFETY CHECK
    if (!coords.lat || !coords.lng) {
      triggerToast("Submission blocked: Valid GPS coordinates are required.", "error");
      setIsSubmitting(false);
      submitLock.current = false;
      return;
    }

    const formData = new FormData();
    const canvas = sigCanvas.current.getCanvas();

    try {
      const signatureBase64 = canvas.toDataURL("image/png");
      const byteString = atob(signatureBase64.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const signatureBlob = new Blob([ab], { type: "image/png" });

      const customerId = typeof bookingData.customer === 'object' 
        ? bookingData.customer?.id 
        : bookingData.customer;

      formData.append("signature_image", signatureBlob, `sig_${bookingId}.png`);
      formData.append("booking", bookingId);
      formData.append("template", template.id);
      formData.append("customer", customerId);
      formData.append("signer_user_agent", navigator.userAgent);

      if (coords.lat) {
        formData.append("latitude", coords.lat);
        formData.append("longitude", coords.lng);
      }

      beforePhotos.forEach((photo) => {
        formData.append("uploaded_images", photo);
      });

      await api.post("indemnity/sign/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      triggerToast("Indemnity submitted successfully!", "success");
      if (onSuccess) await onSuccess();
      else navigate("/bookings");
    } catch (err) {
      console.error("API Error:", err.response?.data);
      const apiError = err.response?.data;
      const firstFieldError =
        apiError?.detail ||
        apiError?.error ||
        apiError?.uploaded_images?.[0] ||
        apiError?.signature_image?.[0] ||
        "Submission failed.";
      triggerToast(firstFieldError, "error");
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  };

  if (isLoading) return <div className="loading-screen">Loading Agreement Details...</div>;

  if (error) {
    return (
      <div className="indemnity-page">
        <div className="indemnity-error">
          <h2>Notice</h2>
          <p role="alert">{error}</p>
          <button onClick={onClose || (() => navigate("/bookings"))} className="btn btn-primary">{onClose ? "Back to job" : "Back to Bookings"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="indemnity-page">
      {toast.show && <div role={toast.type === "error" ? "alert" : "status"} className={`indemnity-notice ${toast.type}`}>{toast.message}</div>}
      <div className="indemnity-card">
        <header className="indemnity-header">
          <h1>Before you start</h1>
          <p className="indemnity-intro">Review the agreement, add before photos, then ask the customer to sign.</p>
          <div className="booking-info">
            <p><strong>Ref:</strong> {formatShortRef(bookingId)}</p>
            <p>
              <strong>Customer:</strong> {
                // 1. If it's the 'List' view structure (flattened)
                bookingData?.customer_name 
                  ? `${bookingData.customer_name} ${bookingData.customer_lastname || ''}` 
                  : (
                    // 2. If it's the 'Detail' view structure (nested object)
                    typeof bookingData?.customer === 'object' && bookingData?.customer !== null
                      ? `${bookingData.customer.firstname || bookingData.customer.first_name || ''} ${bookingData.customer.lastname || bookingData.customer.last_name || ''}`
                      : (
                        // 3. Last resort fallback
                        bookingData?.customer ? `Customer ID: ${bookingData.customer}` : "Not Assigned"
                      )
                  )
              }
            </p>
          </div>
        </header>

        <section className="template-section" aria-labelledby="agreement-heading">
          <div className="indemnity-section-heading"><FileText size={20} aria-hidden="true" /><h2 id="agreement-heading">1. Review agreement</h2></div>
          <div className="agreement-meta"><h3>{template?.title}</h3><span className="version-label">Version {template?.version}</span></div>
          <div 
            className="template-body-html"
            dangerouslySetInnerHTML={{ __html: template?.body_html || "<p>No content available.</p>" }}
          />
        </section>

        <form onSubmit={handleSubmit} aria-busy={isSubmitting || isProcessingPhotos}>
          <section className="photo-upload-section" aria-labelledby="inspection-heading">
            <div className="indemnity-section-heading"><Camera size={20} aria-hidden="true" /><h2 id="inspection-heading">2. Before photos</h2></div>
            <p className="indemnity-help">Add at least one clear photo of the vehicle before work begins.</p>
            <p className="limit-hint">
              {beforePhotos.length} photos added. 
              <span className={beforePhotos.length >= maxBeforePhotos ? "text-warning" : ""}> 
                ({company?.plan 
                  ? company.plan.charAt(0) + company.plan.slice(1).toLowerCase() 
                  : "Plan"} limit: {maxBeforePhotos})
              </span>
            </p>
            <p className="limit-hint">Resolution cap: up to {maxImageWidth}x{maxImageHeight} per photo.</p>
            <div className="photo-grid">
              {previews.map((url, index) => (
                <div key={index} className="photo-preview-item">
                  <img src={url} alt={`Before photo ${index + 1}`} />
                  <button type="button" disabled={isSubmitting || isProcessingPhotos} aria-label={`Remove before photo ${index + 1}`} onClick={() => removePhoto(index)} className="remove-photo-btn"><X size={18} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
            {beforePhotos.length < maxBeforePhotos && <div className="indemnity-photo-actions">
              <label className="indemnity-photo-picker">
                <Camera size={18} aria-hidden="true" /><span>Take photo</span>
                <input type="file" aria-label="Take before photo" accept="image/*" capture="environment" disabled={isSubmitting || isProcessingPhotos} onChange={handlePhotoChange} />
              </label>
              <label className="indemnity-photo-picker">
                <span>Choose photos</span>
                <input type="file" aria-label="Choose before photos" multiple accept="image/*" disabled={isSubmitting || isProcessingPhotos} onChange={handlePhotoChange} />
              </label>
            </div>}
            {isProcessingPhotos && <p role="status" className="indemnity-help">Preparing photos…</p>}
          </section>

          <section className="signature-section" aria-labelledby="signature-heading">
            <div className="indemnity-section-heading"><PenLine size={20} aria-hidden="true" /><h2 id="signature-heading">3. Customer signature</h2></div>
            <p id="signature-instructions" className="indemnity-help">Ask the customer to sign inside the box using their finger or a stylus.</p>
            <div ref={signatureContainer} className="sig-canvas-container">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                clearOnResize={false}
                canvasProps={{ className: "sigCanvas", role: "img", "aria-label": "Customer signature drawing area", "aria-describedby": "signature-instructions" }}
              />
            </div>
            <button type="button" onClick={clearSignature} disabled={isSubmitting || isProcessingPhotos} className="indemnity-clear">Clear signature</button>
          </section>

          <div className="indemnity-actions">
            <p className="indemnity-help">Submitting accepts the agreement and starts the job. Location permission is required to record the signing.</p>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || isProcessingPhotos}>
              <Check size={18} aria-hidden="true" />{isSubmitting ? "Verifying location & uploading…" : "Accept & start job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IndemnityForm;