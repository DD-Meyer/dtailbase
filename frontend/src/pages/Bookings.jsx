import { useEffect, useState, useCallback } from "react";
import api from "../axios_instance";
import "../styles/Global.css";
import "../styles/Bookings.css";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "../components/UpgradeValueCards";

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

  return <span className="timer-display pulse-timer">⏱️ {elapsed}</span>;
};

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Inside Bookings function
  const { planLimits, usageStats, company, refreshCompany } = useCompany();

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

  const [afterPhotos, setAfterPhotos] = useState([]); 
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  // 2. Add the mirror functions from IndemnityForm
  const handlePhotoChange = (e) => {
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

    setAfterPhotos((prev) => [...prev, ...allowedFiles]);
    const newPreviews = allowedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
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
      triggerToast("Failed to upload photos", "error");
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
    <div className="page-container">
      {toast.show && <div className={`toast-notification ${toast.type}`}>{toast.message}</div>}

      {/* --- COMPLETION MODAL --- */}
      {showCompleteModal && (
        <div className="modal-overlay">
          <div className="modal-content completion-modal">
            <h3>📸 Final Completion Photos</h3>
            
            {/* Dynamic Plan Hint */}
            <div className="plan-limit-info mb-4">
              <span className={`badge ${afterPhotos.length >= maxAfterPhotos ? 'badge-warning' : 'badge-info'}`}>
                {company?.plan ? company.plan.charAt(0) + company.plan.slice(1).toLowerCase() : 'Plan'} Limit: {afterPhotos.length} / {maxAfterPhotos}
              </span>
            </div>

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
                    <span className="plus-icon">+</span>
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

      <div className="flex-between mb-6">
        <h1>Appointment Dashboard</h1>
        <div className="flex-items-center gap-2">
          {isBookingLimitReached && (
            <span className="limit-warning-text">
              ⚠️ Monthly limit reached ({monthlyUsage}/{monthlyLimit})
            </span>
          )}
          
          <button 
            className={`btn ${isBookingLimitReached ? 'btn-disabled' : 'btn-primary'}`} 
            onClick={() => !isBookingLimitReached && navigate("/new-booking")}
            disabled={isBookingLimitReached}
          >
            {isBookingLimitReached ? "🔒 Plan Limit Reached" : "+ New Appointment"}
          </button>
        </div>
      </div>

      <UpgradeValueCards currentPlan={company?.plan} />

      <div className="search-filter-container mb-4">
        <input 
          type="text" placeholder="Search customer or plate..." className="search-input"
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Date Pickers & Quick Filters */}
        <div className="date-filter-section">
          <div className="quick-filter-badges mb-2">
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

          <div className="date-range-picker">
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
              <button className="reset-link ml-2" onClick={() => {setStartDate(""); setEndDate("");}}>
                Reset
              </button>
            )}
          </div>
        </div>

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

        <div className="filter-tabs">
          {["ALL", ...Object.keys(ALL_STATUS_OPTIONS)].map(s => (
            <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === "ALL" ? "All" : ALL_STATUS_OPTIONS[s]}
            </button>
          ))}
        </div>
      </div>

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
            {filteredAndSortedBookings.map((b) => (
              <tr key={b.id}>
                <td>
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
                
                <td>{b.customer_name} {b.customer_lastname}</td>
                <td>
                  {b.vehicle_details?.make} {b.vehicle_details?.model}<br/>
                  <small className="text-muted">{b.vehicle_details?.registration}</small>
                </td>
                
                <td>
                  <div className={`status-chip status-chip-${b.status.toLowerCase()} ${b.status === "IN_PROGRESS" ? "pulse-chip" : ""}`}>
                    {ALL_STATUS_OPTIONS[b.status]}
                  </div>
                  <select 
                    value={b.status} 
                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
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
                
                <td>
                  {b.admin_signature ? (
                    <div className="admin-sig-container">
                      <img src={toAbsoluteUrl(b.admin_signature)} alt="Auth" className="admin-sig-img" />
                      <span className="verify-tag">Authorized</span>
                    </div>
                  ) : (
                    <span className="badge badge-warning">Waiting</span>
                  )}
                </td>
                
                <td>
                  {b.is_signed ? (
                    <span className="badge badge-success">✅ Signed</span>
                  ) : b.status === "CONFIRMED" ? (
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/indemnity/sign/${b.id}`)}>✍️ Sign & Start</button>
                  ) : (
                    <span className="text-muted small">N/A</span>
                  )}
                </td>
                
                <td>
                  <button 
                    className="btn-info btn-sm" 
                    onClick={() => navigate(`/bookings/${b.id}`)}
                  >
                    👁️ View
                  </button>
                  
                  {!["IN_PROGRESS", "COMPLETED"].includes(b.status) ? (
                    <button className="text-btn-danger" onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this booking?")) {
                        try {
                          await api.delete(`bookings/${b.id}/`);
                          triggerToast("Booking deleted successfully", "success");
                          fetchBookings();
                        } catch (err) {
                          const errorMsg = err.response?.data?.error || "Delete failed";
                          triggerToast(errorMsg, "error");
                        }
                      }
                    }}>Delete
                </button>
                ) : (
                <span className="text-muted small">Locked 🔒</span>
                )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Bookings;