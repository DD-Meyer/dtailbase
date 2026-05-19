import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import api from "../axios_instance";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Indemnity.css";
import { formatShortRef } from "../utils/formatters";
import { useCompany } from "../context/CompanyContext";
import { resizeImagesToPlanLimit } from "../utils/imageResize";

function IndemnityForm() {
  const { bookingId } = useParams();
  const { planLimits, company } = useCompany();
  const sigCanvas = useRef({});
  const navigate = useNavigate();

  const [bookingData, setBookingData] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [customerData, setCustomerData] = useState(null); // Added to store customer details
  const [template, setTemplate] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  // Inside IndemnityForm component
  const maxBeforePhotos = planLimits?.max_images_before ?? 2; // Default to 2 if not loaded yet
  const maxImageWidth = planLimits?.max_image_width ?? 1280;
  const maxImageHeight = planLimits?.max_image_height ?? 720;

  // Add preview state at the top of Bookings component
  const [beforePhotos, setBeforePhotos] = useState([]);

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
        setError("Could not load form details.");
      } finally {
        setIsLoading(false);
      }
    };
    if (bookingId) loadFormData();
  }, [bookingId]);

  // const handlePhotoChange = (e) => {
  //   const files = Array.from(e.target.files);
  //   setPhotos((prev) => [...prev, ...files]);
  //   const newPreviews = files.map((file) => URL.createObjectURL(file));
  //   setPreviews((prev) => [...prev, ...newPreviews]);
  // };

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    
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

    try {
      const resizedFiles = await resizeImagesToPlanLimit(
        allowedFiles,
        maxImageWidth,
        maxImageHeight
      );
      setBeforePhotos((prev) => [...prev, ...resizedFiles]);
      const newPreviews = resizedFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    } catch (resizeError) {
      console.error("Image resize failed:", resizeError);
      triggerToast("Could not process one or more images. Please try again.", "error");
    } finally {
      e.target.value = "";
    }
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(previews[index]);
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
    if (!template || !bookingData) return;
    if (sigCanvas.current.isEmpty()) {
      triggerToast("Please provide a signature.", "error");
      return;
    }
    if (beforePhotos.length < 1) {
      triggerToast("Please upload at least one BEFORE image.", "error");
      return;
    }

    setIsSubmitting(true);

    // 1. Check if geolocation is supported
    if (!("geolocation" in navigator)) {
      triggerToast(
        "Geolocation is not supported by your browser. Please use a different device/browser for security compliance.",
        "error"
      );
      setIsSubmitting(false);
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
      setTimeout(() => navigate("/bookings"), 900);
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
    }
  };

  if (isLoading) return <div className="loading-screen">Loading Agreement Details...</div>;

  if (error) {
    return (
      <div className="page-container">
        <div className="card error-card">
          <h2>Notice</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/bookings")} className="btn btn-primary">Back to Bookings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {toast.show && <div className={`toast-notification ${toast.type}`}>{toast.message}</div>}
      <div className="card indemnity-card">
        <header className="indemnity-header">
          <h1>Vehicle Condition & Indemnity</h1>
          <div className="booking-info">
            <p><strong>Ref:</strong> {formatShortRef(bookingId)}</p>
            {/* Updated to use customerData state */}
            {/* Change this line in your JSX */}
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

        <section className="template-section">
          <h3>{template?.title}</h3>
          <div 
            className="template-body-html"
            dangerouslySetInnerHTML={{ __html: template?.body_html || "<p>No content available.</p>" }}
          />
          <span className="version-label">Version {template?.version}</span>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="photo-upload-section">
            <h3>Vehicle Inspection Photos</h3>
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
                  <img src={url} alt="Vehicle preview" />
                  <button type="button" onClick={() => removePhoto(index)} className="remove-photo-btn">×</button>
                </div>
              ))}
              {/* Button only shows if under the dynamic limit */}
              {beforePhotos.length < maxBeforePhotos && (
                <label className="add-photo-box">
                  <input type="file" className="add-photo-input" multiple accept="image/*" capture="environment" onChange={handlePhotoChange} />
                  <span className="plus-icon">+</span>
                  <span className="label-text">Add Photo</span>
                </label>
              )}
            </div>
          </div>

          <div className="signature-section">
            <h3>Digital Signature</h3>
            <div className="sig-canvas-container">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ className: "sigCanvas" }}
              />
            </div>
            <button type="button" onClick={clearSignature} className="btn-secondary">Clear Signature</button>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying GPS & Uploading..." : "Accept & Submit Agreement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IndemnityForm;