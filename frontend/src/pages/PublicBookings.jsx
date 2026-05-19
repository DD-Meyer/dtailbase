import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import api from '../axios_instance';
import '../styles/PublicBookings.css';

export default function PublicBookings() {
  const { companySlug } = useParams();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    // Fetch company info
    const fetchCompanyInfo = async () => {
      try {
        const response = await api.get(
          `public/company/${companySlug}/`
        );
        setCompanyInfo(response.data);
      } catch (err) {
        console.error('Error fetching company info:', err);
      }
    };

    fetchCompanyInfo();
  }, [companySlug]);

  const fetchBookings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const response = await api.get(
        `public/bookings/${companySlug}/?email=${email}`
      );
      setBookings(response.data);
    } catch (err) {
      setError('Unable to find bookings for this email. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge status-${status.toLowerCase()}`;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'PENDING': 'Pending Confirmation',
      'CONFIRMED': 'Confirmed',
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="public-bookings-container">
      <div className="bookings-header">
        <h1>Your Bookings</h1>
        {companyInfo && (
          <p className="company-name">{companyInfo.name}</p>
        )}
      </div>

      <div className="bookings-content">
        {/* Search Form */}
        <div className="search-section">
          <form onSubmit={fetchBookings} className="search-form">
            <div className="input-group">
              <input
                type="email"
                placeholder="Enter your email to view bookings"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Find Bookings'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {searched && (
          <>
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <p className="error-hint">If you haven't booked yet, please go back to make a booking.</p>
              </div>
            )}

            {bookings.length > 0 && (
              <div className="bookings-list">
                <div className="bookings-list-header">
                  <h2>Your Bookings ({bookings.length})</h2>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => window.location.href = `/book/${companySlug}`}
                  >
                    ➕ New Booking
                  </button>
                </div>
                
                <div className="bookings-grid">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-header">
                        <div>
                          <h3>{booking.service_name}</h3>
                          <p className="booking-id-small">Ref: {booking.id.slice(0, 8)}</p>
                        </div>
                        <span className={getStatusBadgeClass(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>

                      <div className="booking-details">
                        <div className="detail-item">
                          <span className="label">Date</span>
                          <span className="value">{formatDate(booking.booking_date)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Time</span>
                          <span className="value">{booking.booking_time}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Duration</span>
                          <span className="value">{booking.service_duration} min</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Vehicle</span>
                          <span className="value">
                            {booking.vehicle.make} {booking.vehicle.model}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Location</span>
                          <span className="value">
                            {booking.location_type === 'MOBILE' ? '🚗 Mobile – We come to you' : '🏢 On-site at Company'}
                          </span>
                        </div>
                        {booking.location_type === 'MOBILE' && booking.customer_address && (
                          <div className="detail-item">
                            <span className="label">Address</span>
                            <span className="value">{booking.customer_address}</span>
                          </div>
                        )}
                      </div>

                      <div className="booking-footer">
                        <div className="company-info">
                          <p className="company-name">{booking.company_name}</p>
                          {booking.company_phone && (
                            <a href={`tel:${booking.company_phone}`} className="phone-link">
                              📞 {booking.company_phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searched && bookings.length === 0 && !error && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Bookings Found</h3>
                <p>We couldn't find any bookings for <strong>{email}</strong></p>
                <p className="empty-hint">If you believe this is an error, please contact us.</p>
              </div>
            )}
          </>
        )}

        {!searched && (
          <div className="welcome-section">
            <div className="welcome-icon">👋</div>
            <h2>Welcome Back</h2>
            <p>Enter your email address to view and manage your bookings.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.href = `/book/${companySlug}`}
              style={{ marginTop: '20px' }}
            >
              ➕ Start a New Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
