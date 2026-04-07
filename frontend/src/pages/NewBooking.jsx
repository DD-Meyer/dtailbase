import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import api from "../axios_instance";
import "../styles/NewBooking.css";
import { useCompany } from "../context/CompanyContext";

const STEPS = [
  { id: 1, label: "Customer" },
  { id: 2, label: "Service & Time" },
  { id: 3, label: "Review & Sign" }
];

const NewBooking = () => {
  const navigate = useNavigate();
  const sigPad = useRef(null);
  const { planLimits } = useCompany();
  
  // State Management
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data Lists
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [formData, setFormData] = useState({
    customer: "",
    vehicle: "",
    service: "",
    booking_date: "",
    booking_time: "",
    notes: ""
  });

  // 1. Initial Load: Customers & Services
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, servRes] = await Promise.all([
          api.get("customers/"),
          api.get("services/")
        ]);
        setCustomers(custRes.data);
        setServices(servRes.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Filtered Vehicle Fetch (When customer changes)
  useEffect(() => {
    if (formData.customer) {
      api.get(`customers/${formData.customer}/vehicles/`)
        .then(res => setVehicles(res.data))
        .catch(() => setVehicles([]));
    }
  }, [formData.customer]);

  // 3. Availability Fetch (When date or service changes)
  useEffect(() => {
    const fetchAvailability = async () => {
      if (formData.booking_date && formData.service) {
        setLoadingSlots(true);
        try {
          const res = await api.get(`availability/${formData.booking_date}/`);
          const selectedService = res.data.services?.find(
            (svc) => String(svc.service?.id) === String(formData.service)
          );
          setAvailableSlots(selectedService?.available_slots || []);
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

    // Reset logic for dependent fields
    if (name === "customer") setFormData(prev => ({ ...prev, vehicle: "" }));
    if (name === "booking_date" || name === "service") setFormData(prev => ({ ...prev, booking_time: "" }));
  };

  const nextStep = () => {
    if (step === 1 && (!formData.customer || !formData.vehicle)) return alert("Select customer and vehicle.");
    if (step === 2 && (!formData.booking_time)) return alert("Please select an available time slot.");
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    // 1. Validation check
    if (!sigPad.current || sigPad.current.isEmpty()) {
      return alert("Signature required to authorize this booking.");
    }

    setSubmitting(true);

    try {
      // This accesses the underlying canvas directly, bypassing the "trim" bug
      const adminSignatureBase64 = sigPad.current.getCanvas().toDataURL("image/png");

      const payload = {
        customer: formData.customer,
        vehicle: formData.vehicle,
        service: formData.service,
        booking_date: formData.booking_date,
        booking_time: formData.booking_time,
        notes: formData.notes || "",
        admin_signature: adminSignatureBase64,
        is_authorized: true
      };

      // 3. Send to API
      const response = await api.post("bookings/", payload);

      // 4. Success handling
      if (response.status === 201 || response.status === 200) {
        // Use a slight delay to allow state to settle before navigating
        setTimeout(() => {
          navigate("/bookings");
        }, 100);
      }
    } catch (err) {
      console.error("FULL ERROR:", err);
      if (planLimits) {
        alert(`You have reached your plan limit: ${planLimits.monthly_bookings} bookings per month.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-container">Initializing Wizard...</div>;

  const progressWidth = `${((step - 1) / (STEPS.length - 1)) * 100}%`;

  return (
    <div className="booking-wizard">
      <div className="wizard-header">
        <h1>New Appointment</h1>
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
            <h2 className="section-title">Client & Vehicle</h2>
            <div className="form-group mb-4">
              <label className="input-label">Customer</label>
              <select className="input-field" name="customer" value={formData.customer} onChange={handleInputChange}>
                <option value="">-- Choose Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.firstname} {c.lastname}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label">Vehicle</label>
              <select className="input-field" name="vehicle" value={formData.vehicle} onChange={handleInputChange} disabled={!formData.customer}>
                <option value="">-- Select Vehicle --</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration} ({v.make})</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content animate-fade">
            <h2 className="section-title">Schedule Service</h2>
            <div className="input-grid mb-4">
              <div className="form-group">
                <label className="input-label">Service</label>
                <select className="input-field" name="service" value={formData.service} onChange={handleInputChange}>
                  <option value="">-- Select --</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Date</label>
                <input className="input-field" type="date" name="booking_date" min={new Date().toISOString().split("T")[0]} value={formData.booking_date} onChange={handleInputChange} />
              </div>
            </div>

            <label className="input-label">Available Time Slots</label>
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
                  {availableSlots.length === 0 && (
                    <p className="text-muted small italic">Select date & service to view slots.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content animate-fade">
            <h2 className="section-title">Review & Authorization</h2>
            <div className="review-box mb-4">
               <p><strong>Customer:</strong> {customers.find(c => c.id == formData.customer)?.firstname} {customers.find(c => c.id == formData.customer)?.lastname}</p>
               <p><strong>Schedule:</strong> {formData.booking_date} at {formData.booking_time}</p>
               <p><strong>Service:</strong> {services.find(s => s.id == formData.service)?.name}</p>
            </div>
            <div className="sig-canvas-container">
              <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ className: "sig-canvas" }} />
              <div className="sig-canvas-actions">
                <button className="btn-clear" onClick={() => sigPad.current.clear()}>Clear</button>
              </div>
            </div>
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

export default NewBooking;