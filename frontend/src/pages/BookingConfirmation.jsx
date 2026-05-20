import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/BookingConfirmation.css';
import { Hourglass, MapPin, PinIcon } from 'lucide-react';

export default function BookingConfirmation() {
  const { companySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If no booking data in state, redirect to home
    if (!booking) {
      navigate(`/book/${companySlug}`);
    }
  }, [booking, companySlug, navigate]);

  const handleViewStatus = () => {
    navigate(`/public/bookings/${companySlug}`, {
      state: { email: booking.customer.email }
    });
  };

  const handleNewBooking = () => {
    navigate(`/book/${companySlug}`);
  };

  if (!booking) {
    return null;
  }

  return (
    <div className="booking-confirmation-container">
      <div className="confirmation-card">
        {/* Success Badge */}
        <div className="success-header">
          <div className="success-icon">✓</div>
          <h1>Booking Submitted Successfully!</h1>
          <p className="subtitle">Thank you for your submission</p>
        </div>

        {/* Booking Details */}
        <div className="booking-summary">
          <h2>Your Booking Details</h2>
          
          <div className="detail-section">
            <h3>Service</h3>
            <p className="detail-value">{booking.service_name}</p>
            <p className="detail-info">Duration: {booking.service_duration} minutes</p>
          </div>

          <div className="detail-section">
            <h3>Date & Time</h3>
            <div className="date-time-grid">
              <div>
                <p className="detail-label">Date</p>
                <p className="detail-value">
                  {new Date(booking.booking_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="detail-label">Time</p>
                <p className="detail-value">{booking.booking_time}</p>
              </div>
              <div>
                <p className="detail-label">End Time</p>
                <p className="detail-value">{booking.booking_end_time}</p>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Vehicle</h3>
            <p className="detail-value">{booking.vehicle.make} {booking.vehicle.model}</p>
            <p className="detail-info">Registration: {booking.vehicle.registration}</p>
          </div>

          <div className="detail-section">
            <h3>Customer</h3>
            <p className="detail-value">{booking.customer.firstname} {booking.customer.lastname}</p>
            <p className="detail-info">Email: {booking.customer.email}</p>
            {booking.customer.phone && (
              <p className="detail-info">Phone: {booking.customer.phone}</p>
            )}
          </div>

          <div className="detail-section">
            <h3>Service Provider</h3>
            <p className="detail-value">{booking.company_name}</p>
            <p className="detail-info">
              {booking.company_phone && <span>Phone: {booking.company_phone}</span>}
            </p>
            {booking.location_type === 'MOBILE' ? (
              <div>
                <p className="detail-info flex items-center gap-2"><MapPin color='red' size={18} aria-hidden="true" /> <strong>Mobile Service</strong> – We will come to you</p>
                {booking.customer_address && (
                  <p className="detail-info">Address: {booking.customer_address}</p>
                )}
              </div>
            ) : (
              booking.company_address && (
                <p className="detail-info flex items-center gap-2"><MapPin color='red' size={18} aria-hidden="true" /> Location: {booking.company_address}</p>
              )
            )}
          </div>

          <div className="status-box">
            <p className="status-label">Status</p>
            <p className="status-pending flex items-center gap-2"><Hourglass size={20} aria-hidden="true" /> Pending Confirmation</p>
            <p className="status-note">We'll review your booking and send you a confirmation email shortly.</p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="next-steps">
          <h2>What's Next?</h2>
          <ol>
            <li><strong>Check your email</strong> - We'll send you updates on your booking</li>
            <li><strong>Review your booking</strong> - Visit the link below to track status anytime</li>
            <li><strong>Contact us</strong> - Call {booking.company_phone} if you need to make changes</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={handleViewStatus}
          >
            View Your Bookings
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleNewBooking}
          >
            Make Another Booking
          </button>
        </div>

        {/* Booking ID */}
        <div className="booking-id">
          <p>Booking Reference: <code>{booking.id}</code></p>
          <p className="text-muted">Save this reference for future inquiries</p>
        </div>
      </div>
    </div>
  );
}
