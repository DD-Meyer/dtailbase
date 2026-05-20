import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axios_instance";
import "../styles/NewBooking.css"; // Reuse your existing wizard styles
import { showToast } from "../utils/uiFeedback";
import { Building2Icon, TruckIcon } from "lucide-react";

const STEPS = [
  { id: 1, label: "Your Info" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Review" }
];

const PublicBooking = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [formData, setFormData] = useState({
    // customer info
    customer_firstname: "",
    customer_lastname: "",
    customer_email: "",
    customer_phone: "",

    // vehicle info
    vehicle_make: "",
    vehicle_model: "",
    vehicle_registration: "",
    
    // booking info
    service: "",
    booking_date: "",
    booking_time: "",
    location_type: "ONSITE",
    customer_address: "",
    });

  // 1. Load Public Company & Services
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [compRes, servRes] = await Promise.all([
          api.get(`public/company/${companySlug}/`),
          api.get(`public/services/?slug=${companySlug}`)
        ]);
        setCompany(compRes.data);
        setServices(servRes.data);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [companySlug]);

  // 2. Fetch Availability Slots
  useEffect(() => {
    const fetchAvailability = async () => {
      if (formData.booking_date && formData.service) {
        setLoadingSlots(true);
        try {
          // Ensure this endpoint is also public-access in Django!
          const res = await api.get(`public/availability/${formData.booking_date}/${formData.service}/`);
          setAvailableSlots(res.data.service?.available_slots || []);
        } catch (err) {
          setAvailableSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      }
    };
    fetchAvailability();
  }, [formData.booking_date, formData.service]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "booking_date" || name === "service") {
      setFormData(prev => ({ ...prev, booking_time: "" }));
    }
  };

  const nextStep = () => {
    if (step === 1 && (!formData.customer_firstname || !formData.customer_email)) {
      showToast("Please provide your contact details.", "error");
      return;
    }
    if (step === 1 && (!formData.vehicle_make || !formData.vehicle_model || !formData.vehicle_registration)) {
      showToast("Please provide complete vehicle information.", "error");
      return;
    }
    if (step === 1 && formData.location_type === "MOBILE" && !formData.customer_address.trim()) {
      showToast("Please enter your address for the mobile service.", "error");
      return;
    }
    if (step === 2 && (!formData.service || !formData.booking_date || !formData.booking_time)) {
      showToast("Please select a service, date, and time slot.", "error");
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await api.post(`public/book/${companySlug}/`, formData);
      // Redirect to confirmation page with booking details
      navigate(`/booking-confirmation/${companySlug}`, {
        state: { booking: response.data }
      });
    } catch (err) {
      showToast(err.response?.data?.plan_limit || "Booking failed. Slot may have been taken.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container">Loading business profile...</div>;

  const progressWidth = `${((step - 1) / (STEPS.length - 1)) * 100}%`;

  return (
    <div className="booking-wizard public-wizard">
      <div className="wizard-header">
        {company?.logo && <img src={company.logo} alt="Logo" className="public-logo-small" style={{maxWidth: '80px', marginBottom: '10px'}} />}
        <h1>{company?.name}</h1>
        <div className="progress-container" style={{ "--progress-width": progressWidth }}>
          {STEPS.map((s) => (
            <div key={s.id} className={`step-item ${step >= s.id ? "active" : ""} ${step > s.id ? "completed" : ""}`}>
              <div className="step-circle">{step > s.id ? "✓" : s.id}</div>
              <div className="step-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-step-card">
        {step === 1 && (
          <div className="step-content animate-fade">
            <h2 className="section-title">Your Details</h2>
            <div className="input-grid mb-4">
                <div className="form-group">
                    <label className="input-label">First Name</label>
                    <input className="input-field" name="customer_firstname" value={formData.customer_firstname} onChange={handleInputChange} placeholder="John" />
                </div>
                <div className="form-group">
                    <label className="input-label">Last Name</label>
                    <input className="input-field" name="customer_lastname" value={formData.customer_lastname} onChange={handleInputChange} placeholder="Doe" />
                </div>
            </div>
            <div className="form-group">
                <label className="input-label">Email Address</label>
                <input className="input-field" type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} placeholder="john@example.com" />
            </div>
            <div className="form-group">
                <label className="input-label">Phone Number (Optional)</label>
                <input className="input-field" type="tel" name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" />
            </div>

            <h2 className="section-title mt-6">Vehicle Information</h2>
            <div className="input-grid">
                <input 
                    placeholder="Make (e.g. Audi)" 
                    value={formData.vehicle_make} 
                    onChange={e => setFormData({...formData, vehicle_make: e.target.value})} 
                />
                <input 
                    placeholder="Model (e.g. A4)" 
                    value={formData.vehicle_model} 
                    onChange={e => setFormData({...formData, vehicle_model: e.target.value})} 
                />
                <input 
                    placeholder="License Plate" 
                    value={formData.vehicle_registration} 
                    onChange={e => setFormData({...formData, vehicle_registration: e.target.value})} 
                />
            </div>

            <h2 className="section-title mt-6">Service Location</h2>
            <div className="form-group mb-4">
              <label className="input-label">Booking Type</label>
              <div className="location-type-toggle">
                <button
                  // style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  type="button"
                  className={`location-btn flex items-center gap-2 ${formData.location_type === 'ONSITE' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, location_type: 'ONSITE', customer_address: '' }))}
                >
                  {/* icon must be inline with text, it is not inline*/}
                  <Building2Icon size={14} aria-hidden="true" /> On-site at Company
                </button>
                <button
                  type="button"
                  className={`location-btn flex items-center gap-2 ${formData.location_type === 'MOBILE' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, location_type: 'MOBILE' }))}
                >
                  {/* icon must be inline with text, it is not inline*/}
                  <TruckIcon size={14} aria-hidden="true" />  Mobile (We come to you)
                </button>
              </div>
            </div>
            {formData.location_type === 'MOBILE' && (
              <div className="form-group">
                <label className="input-label">Your Address <span className="text-danger">*</span></label>
                <input
                  className="input-field"
                  name="customer_address"
                  value={formData.customer_address}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Main Street, City, Postal Code"
                  required
                />
              </div>
            )}
          </div>
        )}
        
        {step === 2 && (
          <div className="step-content animate-fade">
            <h2 className="section-title">Select Service & Time</h2>
            <div className="form-group mb-4">
                <label className="input-label">Service</label>
                <select className="input-field" name="service" value={formData.service} onChange={handleInputChange}>
                    <option value="">-- Select Service --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (R{s.base_price})</option>)}
                </select>
            </div>
            <div className="form-group mb-4">
                <label className="input-label">Date</label>
                <input className="input-field" type="date" name="booking_date" min={new Date().toISOString().split("T")[0]} value={formData.booking_date} onChange={handleInputChange} />
            </div>

            <label className="input-label">Available Slots</label>
            <div className="time-slot-wrapper">
              {loadingSlots ? (
                <div className="slot-loader">Checking availability...</div>
              ) : (
                <div className="time-slot-grid">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      className={`slot-chip ${formData.booking_time === slot.start ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, booking_time: slot.start }))}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content animate-fade">
            <h2 className="section-title">Review Details</h2>
            <div className="review-box mb-4">
               <p><strong>Customer:</strong> {formData.customer_firstname} {formData.customer_lastname}</p>
               <p><strong>Service:</strong> {services.find(s => s.id == formData.service)?.name}</p>
               <p><strong>Appointment:</strong> {formData.booking_date} at {formData.booking_time}</p>
               <p className="flex items-center gap-2"><strong>Location:</strong> {formData.location_type === 'MOBILE' ? <><TruckIcon size={14} aria-hidden="true" /> Mobile - We come to you</> : <><Building2Icon size={14} aria-hidden="true" /> On-site at Company</>}</p>
               {formData.location_type === 'MOBILE' && formData.customer_address && (
                 <p><strong>Address:</strong> {formData.customer_address}</p>
               )}
            </div>
            <p className="text-muted small">By confirming, you agree to receive an email confirmation of your request.</p>
          </div>
        )}

        <div className="wizard-actions">
          {step > 1 && <button className="btn btn-back" onClick={() => setStep(step - 1)}>Back</button>}
          <button 
            className="btn btn-next" 
            style={{marginLeft: "auto"}} 
            onClick={step < 3 ? nextStep : handleSubmit} 
            disabled={submitting}
          >
            {submitting ? "Processing..." : step === 3 ? "Confirm Booking" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;