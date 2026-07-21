import { useEffect, useState, useCallback } from "react";
import api from "../axios_instance";
import "../styles/Global.css";
import "../styles/Bookings.css";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "../components/UpgradeValueCards";
import PlanUsageBanner from "../components/PlanUsageBanner";
import { Camera, CheckCheckIcon, Lock, Plus, Share2, Signature, Timer, CheckIcon, SlidersHorizontal, Copy, Car, CarIcon, BuildingIcon } from "lucide-react";
import { showConfirm, showToast } from "../utils/uiFeedback";
import { resizeImagesToPlanLimit } from "../utils/imageResize";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const normalizeSecureUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (window.location.protocol === "https:" && rawUrl.startsWith("http://")) {
    return rawUrl.replace("http://", "https://");
  }
  return rawUrl;
};

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return normalizeSecureUrl(url);
  }
  const safeBaseUrl = normalizeSecureUrl(API_BASE_URL);
  if (url.startsWith("/")) return `${safeBaseUrl}${url}`;
  return `${safeBaseUrl}/${url}`;
};

const VALID_STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"], 
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const ALL_STATUS_OPTIONS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const EMPTY_TABLE_ROW_COUNT = 6;

const formatTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const LiveTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const calculateTime = () => {
      if (!startTime) return;
      
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      // Total units
      const totalSeconds = Math.floor(diff / 1000);
      const seconds = totalSeconds % 60;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const minutes = totalMinutes % 60;
      const hours = Math.floor(totalMinutes / 60);

      const format = (num) => String(num).padStart(2, '0');

      if (hours > 0) {
        // If over an hour, show HH:MM:SS
        setElapsed(`${format(hours)}:${format(minutes)}:${format(seconds)}`);
      } else {
        // If under an hour, show MM:SS
        setElapsed(`${format(minutes)}:${format(seconds)}`);
      }
    };

    const interval = setInterval(calculateTime, 1000);
    calculateTime();
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="timer-display pulse-timer"><Timer size={14} aria-hidden="true" /> {elapsed}</span>;
};

function Bookings() {
  const TABLET_BREAKPOINT = 1024;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [isCompactView, setIsCompactView] = useState(() => window.innerWidth <= TABLET_BREAKPOINT);
  const [showFilters, setShowFilters] = useState(() => window.innerWidth > TABLET_BREAKPOINT);

  // Inside Bookings function
  const { planLimits, usageStats, company, nextPlan, refreshCompany } = useCompany();

  const isUnlimited = planLimits.monthly_bookings === null || 
                    planLimits.max_customers === undefined || 
                    planLimits.max_customers === Infinity;

  // 1. Get the current count from usageStats (matching your context)
  const monthlyUsage = usageStats?.monthly_bookings || 0;

  // 2. Get the limit from planLimits
  const monthlyLimit = planLimits?.monthly_bookings || 10; 

  // 3. The Logic Check
  const isBookingLimitReached = company?.plan === "STARTER" && monthlyUsage >= monthlyLimit;
  
  // --- New State for Completion Modal ---
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingBookingId, setCompletingBookingId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sort and filtering states
  const [sortBy, setSortBy] = useState("CREATED_DESC"); // Default: Newest first
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // At the top of your Bookings function
  const maxAfterPhotos = planLimits?.max_images_after ?? 2;
  const maxImageWidth = planLimits?.max_image_width ?? 1280;
  const maxImageHeight = planLimits?.max_image_height ?? 720;

  const [afterPhotos, setAfterPhotos] = useState([]); 
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  useEffect(() => {
    const handleResize = () => {
      const compact = window.innerWidth <= TABLET_BREAKPOINT;
      setIsCompactView(compact);
      if (!compact) {
        setShowFilters(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Add the mirror functions from IndemnityForm
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Calculate how many more photos are allowed
    const remainingSlots = maxAfterPhotos - afterPhotos.length;
    
    if (remainingSlots <= 0) {
      triggerToast(`You have reached your limit of ${maxAfterPhotos} photos`, "error");
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
      setAfterPhotos((prev) => [...prev, ...resizedFiles]);
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
    setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  // 3. Clear previews when closing the modal or finishing
  const closeModal = () => {
    previews.forEach(url => URL.revokeObjectURL(url)); // Clean up memory
    setPreviews([]);
    setAfterPhotos([]);
    setShowCompleteModal(false);
  };

  const navigate = useNavigate();

  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  // 1. Unified Fetching Logic
  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get("bookings/");
      setBookings(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  }, []);


  // 2. Fetch Bookings on Mount
  useEffect(() => {
    fetchBookings();
  }, []);


  // Updated Status Handler
  const handleStatusChange = async (bookingId, newStatus) => {
    // INTERCEPT: If completing, open modal instead of patching immediately
    if (newStatus === "COMPLETED") {
      setCompletingBookingId(bookingId);
      setShowCompleteModal(true);
      return;
    }

    try {
      await api.patch(`bookings/${bookingId}/`, { status: newStatus });
      triggerToast(`Status updated to ${ALL_STATUS_OPTIONS[newStatus]}`, "info");
      fetchBookings();
      refreshCompany();
    } catch (err) {
      triggerToast("Update failed", "error");
    }
  };

  // Copy booking tracking link to clipboard
  const handleCopyTrackingLink = () => {
    if (!company?.slug) {
      showToast("Company information not available.", "error");
      return;
    }
    const trackingLink = `${window.location.origin}/public/bookings/${company.slug}`;
    navigator.clipboard.writeText(trackingLink);
    showToast("Tracking link copied to clipboard! Share it with your clients.", "success");
  };

  // Final Submission with Photos
  // Final Submission with Photos
  // --- Inside Bookings.jsx ---
  const handleFinalCompletion = async () => {
    if (afterPhotos.length === 0) {
      return triggerToast("Please upload at least one 'After' photo", "error");
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("status", "COMPLETED");
    
    // CHANGE THIS: Use "uploaded_images" to match your Serializer
    afterPhotos.forEach((file) => {
      formData.append("uploaded_images", file); 
    });

    try {
      const response = await api.patch(`bookings/${completingBookingId}/update_status/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      triggerToast("Job completed successfully!", "success");

      // Update local state with the NEW indemnity_data (the photos)
      setBookings(prev => prev.map(b => 
        b.id === completingBookingId 
          ? { 
              ...b, 
              status: response.data.status, 
              completed_at: response.data.completed_at,
              indemnity_data: response.data.indemnity_data // Added this line
            } 
          : b
      ));

      closeModal();
    } catch (err) {
      console.error("Upload error details:", err.response?.data || err.message);
      const apiError = err.response?.data;
      const errorMessage =
        apiError?.uploaded_images?.[0] ||
        apiError?.detail ||
        apiError?.error ||
        "Failed to upload photos";
      triggerToast(errorMessage, "error");
    } finally {
      setIsUploading(false);
    }
  };

  {/*Helper functions for date range picker */}
  const setRangeToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setRangeThisWeek = () => {
      const today = new Date();
      const first = today.getDate() - today.getDay(); // Sunday
      const last = first + 6; // Saturday

      const firstDay = new Date(today.setDate(first)).toISOString().split('T')[0];
      const lastDay = new Date(today.setDate(last)).toISOString().split('T')[0];
      
      setStartDate(firstDay);
      setEndDate(lastDay);
  };

  const filteredAndSortedBookings = bookings
    .filter((b) => {
      // 1. Status Filter
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      
      // 2. Search Filter
      const searchStr = `${b.customer_name} ${b.customer_lastname} ${b.vehicle_details?.registration}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());

      // 3. Date Range Filter
      const bookingDate = b.booking_date; // Format: YYYY-MM-DD
      const matchesStartDate = !startDate || bookingDate >= startDate;
      const matchesEndDate = !endDate || bookingDate <= endDate;

      // Now all four variables are defined and used
      return matchesStatus && matchesSearch && matchesStartDate && matchesEndDate;
    })
    .sort((a, b) => {
      if (sortBy === "CREATED_DESC") {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === "CREATED_ASC") {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === "APPOINTMENT") {
        return new Date(`${a.booking_date}T${a.booking_time}`) - new Date(`${b.booking_date}T${b.booking_time}`);
      }
      return 0;
    });

  if (loading) return <div className="page-container">Loading Dashboard...</div>;

  return (
    // Fit the page container to the screen size for mobile devices, use tailwind utilities for responsive design, and ensure the table is scrollable on smaller screens
    <div className="page-container w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {toast.show && <div className={`toast-notification ${toast.type}`}>{toast.message}</div>}

      {/* --- COMPLETION MODAL --- */}
      {showCompleteModal && (
        <div className="modal-overlay">
          <div className="modal-content completion-modal">
            <h3><Camera size={18} aria-hidden="true" /> Final Completion Photos</h3>
            
            {/* Dynamic Plan Hint */}
            <div className="plan-limit-info mb-4">
              <span className={`badge ${afterPhotos.length >= maxAfterPhotos ? 'badge-warning' : 'badge-info'}`}>
                {company?.plan ? company.plan.charAt(0) + company.plan.slice(1).toLowerCase() : 'Plan'} Limit: {afterPhotos.length} / {maxAfterPhotos}
              </span>
            </div>

            <p className="text-muted">Resolution cap: up to {maxImageWidth}x{maxImageHeight} per photo.</p>

            <p className="text-muted">Upload "After" photos to finish the job.</p>
            
            <div className="photo-upload-section">
              <div className="photo-grid">
                {previews.map((url, index) => (
                  <div key={index} className="photo-preview-item">
                    <img src={url} alt="Service result" />
                    <button type="button" onClick={() => removePhoto(index)} className="remove-photo-btn">×</button>
                  </div>
                ))}

                {/* Logic check: use the variable we defined at the top */}
                {afterPhotos.length < maxAfterPhotos ? (
                  <label className="add-photo-box">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handlePhotoChange} 
                    />
                    <span className="plus-icon"><Plus size={18} aria-hidden="true" /></span>
                    <span className="label-text">Add Photo</span>
                  </label>
                ) : (
                  <div className="limit-reached-msg">
                    <p>Plan limit reached ({maxAfterPhotos} photos).</p>
                    <small>Upgrade to Professional for more slots.</small>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions mt-4">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button 
                className="btn btn-success" 
                onClick={handleFinalCompletion}
                disabled={isUploading || afterPhotos.length === 0}
              >
                {isUploading ? "Uploading..." : "Confirm & Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* background card container for
      the heading with a gradient background for the banner
      , must be fullscreen*/}
      <div className="card-banner mb-6">
        <div className="page-banner">
          <div className="page-banner-copy">
            <h1>Appointment Dashboard</h1>
            <p>Track appointments, manage statuses, and keep your daily workflow moving.</p>
          </div>
          <div className="page-banner-actions">
            {isBookingLimitReached && (
              <span className="limit-warning-text">
                <Lock size={14} aria-hidden="true" /> Monthly limit reached ({monthlyUsage}/{monthlyLimit})
              </span>
            )}

            <button 
              className="btn btn-secondary" 
              onClick={handleCopyTrackingLink}
              title="Copy the booking tracking link to share with clients"
            >
              <Copy size={16} aria-hidden="true" /> Copy Tracking Link
            </button>

            <button className="btn btn-secondary" onClick={() => navigate("/share-booking")}>
              <Share2 size={16} aria-hidden="true" /> Share Booking
            </button>
            
            <button 
              className={`btn ${isBookingLimitReached ? 'btn-disabled' : 'btn-primary'}`} 
              onClick={() => !isBookingLimitReached && navigate("/new-booking")}
              disabled={isBookingLimitReached}
            >
              {isBookingLimitReached ? "Plan Limit Reached" : (
                <>
                  <Plus size={16} aria-hidden="true" /> New Appointment
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <UpgradeValueCards currentPlan={company?.plan} />
      <PlanUsageBanner
        metrics={[
          {
            label: "Bookings this month",
            used: monthlyUsage,
            total: isUnlimited ? null : monthlyLimit,
          },
        ]}
        currentPlan={company?.plan}
        nextPlan={nextPlan}
      />

      {isCompactView && (
        <div className="bookings-filters-toggle-wrap mb-4">
          <button
            type="button"
            className="btn btn-secondary filters-toggle-btn"
            onClick={() => setShowFilters(prev => !prev)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      )}

      {/* hide filters behind button on mobile screens to save space */}
      {/* Search, Status Filter, and Date Range Filter */}
      {(!isCompactView || showFilters) && (
      <div className="search-filter-container mb-4">
        <div className={`search-filter-top-row ${isCompactView ? "search-filter-top-row-compact" : ""}`}>
        {!isCompactView && (
        <input 
          type="text"
          placeholder="Search customer or plate..."
          className="search-input search-input-bookings"
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        />
        )}

        {/* Date Range Filters */}
        <select 
          className="sort-select" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="CREATED_DESC">Recently Added</option>
          <option value="CREATED_ASC">Oldest Added</option>
          <option value="APPOINTMENT">Appointment Time</option>
        </select>
        </div>

        {/* Date Pickers & Quick Filters */}
        <div className="date-filter-section">
          <div className="date-inputs">
            <input 
              type="date" 
              className="date-input"
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
            <span className="text-muted">to</span>
            <input 
              type="date" 
              className="date-input"
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
            {(startDate || endDate) && (
              <button className="reset-link" onClick={() => {setStartDate(""); setEndDate("");}}>
                Reset
              </button>
            )}
          </div>

          <div className="quick-filter-badges">
            <button 
              type="button" 
              className={`badge-filter ${startDate === new Date().toISOString().split('T')[0] ? 'active' : ''}`} 
              onClick={setRangeToday}
            >
              Today
            </button>
            <button 
              type="button" 
              className="badge-filter" 
              onClick={setRangeThisWeek}
            >
              This Week
            </button>
          </div>
        </div>

        <div className="filter-tabs">
          {["ALL", ...Object.keys(ALL_STATUS_OPTIONS)].map(s => (
            <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === "ALL" ? "All" : ALL_STATUS_OPTIONS[s]}
            </button>
          ))}
        </div>
      </div>
      )}

      {isCompactView && (
        <div className="search-wrapper bookings-search-wrapper mb-4">
          <input
            type="text"
            placeholder="Search customer or plate..."
            className="search-input bookings-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
      )}

      <div className="card bookings-table-container">
        <table className="table-standard">
          <thead>
            <tr>
              <th>Schedule & Actual</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Status & Timer</th>
              <th>Authorization</th>
              <th>Indemnity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedBookings.length > 0 ? filteredAndSortedBookings.map((b) => (
              <tr 
                key={b.id} 
                className="booking-row-clickable"
              >
                <td data-label="Schedule">
                  <div className="mb-1"><strong>{b.booking_date}</strong></div>
                  <div className="text-sm">
                    <span className="text-muted">Est: </span> 
                    {b.booking_time?.slice(0, 5)} - {b.booking_end_time?.slice(0, 5)}
                  </div>
                  {(b.started_at || b.completed_at) && (
                    <div className="actual-timestamps mt-1">
                      {b.started_at && (
                        <div className="text-xs">
                          <span className="text-info">Start: </span>
                          <strong>{formatTime(b.started_at)}</strong>
                        </div>
                      )}
                      {b.completed_at && (
                        <div className="text-xs">
                          <span className="text-success">End: </span>
                          <strong>{formatTime(b.completed_at)}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                
                <td className="td-customer" data-label="Customer">
                  <div className="customer-name-mobile">{b.customer_name} {b.customer_lastname}</div>
                  {b.location_type === 'MOBILE' ? (
                    <div className="text-xs mt-1">
                      <span className="badge badge-info"><CarIcon size={14} aria-hidden="true" className="inline-block mb-1"/> Mobile</span>
                      {b.customer_address && <div className="text-muted" style={{fontSize:'0.7rem'}}>{b.customer_address}</div>}
                    </div>
                  ) : (
                    <div className="text-xs mt-1"><span className="badge badge-secondary"><BuildingIcon size={14} aria-hidden="true" className="inline-block mb-1"/> On-site</span></div>
                  )}
                </td>
                
                <td className="td-vehicle" data-label="Vehicle">
                  {b.vehicle_details?.make} {b.vehicle_details?.model}<br/>
                  <small className="text-muted">{b.vehicle_details?.registration}</small>
                </td>
                
                <td className="td-status" data-label="Status">
                  <div className={`status-chip status-chip-${b.status.toLowerCase()} ${b.status === "IN_PROGRESS" ? "pulse-chip" : ""}`}>
                    {ALL_STATUS_OPTIONS[b.status]}
                  </div>
                  <select 
                    value={b.status} 
                    onChange={(e) => { e.stopPropagation(); handleStatusChange(b.id, e.target.value); }}
                    className={`status-select ${b.status.toLowerCase()}`}
                    disabled={VALID_STATUS_TRANSITIONS[b.status].length === 0}
                  >
                    <option value={b.status}>{ALL_STATUS_OPTIONS[b.status]}</option>
                    {VALID_STATUS_TRANSITIONS[b.status].map(opt => (
                      <option key={opt} value={opt}>{ALL_STATUS_OPTIONS[opt]}</option>
                    ))}
                  </select>
                  {b.status === "IN_PROGRESS" && b.started_at && (
                    <div className="mt-2"><LiveTimer startTime={b.started_at} /></div>
                  )}
                </td>
                
                <td className="td-auth" data-label="Authorization">
                  {b.admin_signature ? (
                    <div className="admin-sig-container">
                      <img src={toAbsoluteUrl(b.admin_signature)} alt="Auth" className="admin-sig-img" />
                      <span className="verify-tag">Authorized</span>
                    </div>
                  ) : (
                    <span className="badge badge-warning">Waiting</span>
                  )}
                </td>
                
                <td className="td-indemnity" data-label="Indemnity">
                  {b.is_signed ? (
                    // Show check icon with "Signed" badge next to it inline if signed, instead of the button
                    <div className="flex items-center">
                      {/* align next to each other */}
                      <span className="badge-signed badge-success ml-1">
                        <CheckIcon size={14} aria-hidden="true" className="inline-block mb-1" />
                        Signed
                      </span>
                    </div>
                  ) : b.status === "CONFIRMED" ? (
                    <button 
                      className="btn btn-primary btn-sm btn-sign-start" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/indemnity/sign/${b.id}`); }}
                    >
                      <Signature size={14} aria-hidden="true" /> Sign & Start
                    </button>
                  ) : (
                    <span className="text-muted small">N/A</span>
                  )}
                </td>
                
                <td className="td-actions" data-label="Actions">
                  <div className="booking-action-group">
                    <button 
                      className="btn-info btn-sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bookings/${b.id}`);
                      }}
                    >
                      View
                    </button>

                    {!['IN_PROGRESS', 'COMPLETED'].includes(b.status) ? (
                      <button 
                        className="text-btn-danger" 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = await showConfirm({
                            title: "Delete booking",
                            message: "Are you sure you want to delete this booking?",
                            confirmText: "Delete",
                            danger: true,
                          });
                          if (!confirmed) return;

                          api.delete(`bookings/${b.id}/`)
                            .then(() => {
                              triggerToast("Booking deleted successfully", "success");
                              fetchBookings();
                            })
                            .catch((err) => {
                              const errorMsg = err.response?.data?.error || "Delete failed";
                              triggerToast(errorMsg, "error");
                            });
                        }}
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-muted small"><Lock size={12} aria-hidden="true" /> Locked</span>
                    )}
                  </div>
                </td>
              </tr>
            )) : Array.from({ length: EMPTY_TABLE_ROW_COUNT }, (_, index) => (
              <tr key={`empty-row-${index}`} className="booking-row-empty" aria-hidden="true">
                <td data-label="Schedule">{index === 0 ? "No matching bookings" : "\u00A0"}</td>
                <td data-label="Customer">\u00A0</td>
                <td data-label="Vehicle">\u00A0</td>
                <td data-label="Status">\u00A0</td>
                <td data-label="Authorization">\u00A0</td>
                <td data-label="Indemnity">\u00A0</td>
                <td data-label="Actions">\u00A0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Bookings;