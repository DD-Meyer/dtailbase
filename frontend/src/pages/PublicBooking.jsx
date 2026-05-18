import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../axios_instance";
import "../styles/NewBooking.css"; // Reuse your existing wizard styles
import { showToast } from "../utils/uiFeedback";

const STEPS = [
  { id: 1, label: "Your Info" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Review" }
];

const PublicBooking = () => {
  const { companySlug } = useParams();
  const [company, setCompany] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [formData, setFormData] = useState({
    // customer info
    customer_firstname: "",
    customer_lastname: "",
    customer_email: "",

    // vehicle info
    vehicle_make: "",
    vehicle_model: "",
    vehicle_registration: "",
    
    // booking info
    service: "",
    booking_date: "",
    booking_time: "",
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
    if (step === 2 && !formData.booking_time) {
      showToast("Please select an available time slot.", "error");
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`public/book/${companySlug}/`, formData);
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err) {
      showToast(err.response?.data?.plan_limit || "Booking failed. Slot may have been taken.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container">Loading business profile...</div>;
  
  if (success) return (
    <div className="public-wrapper animate-fade" style={{padding: '50px 20px', textAlign: 'center'}}>
        <h1>🎉 Appointment Requested!</h1>
        <p>Thank you. <strong>{company.name}</strong> will be in touch shortly.</p>
        <button className="btn btn-next" onClick={() => window.location.reload()}>Book Another</button>
    </div>
  );

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