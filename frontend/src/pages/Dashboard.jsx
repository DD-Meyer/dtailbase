import { useEffect, useState } from "react";
import api from "../axios_instance";
import "../styles/Dashboard.css";
import { FiUsers, FiSettings, FiCalendar, FiDollarSign } from "react-icons/fi";

function DashboardOverview() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeBookings: 0,
    dailyRevenue: 0,
    pendingServices: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Example endpoints - replace with your actual analytics endpoints
        const [custRes, bookRes] = await Promise.all([
          api.get("customers/"),
          api.get("bookings/recent/") 
        ]);
        
        setStats({
          totalCustomers: custRes.data.length,
          activeBookings: bookRes.data.filter(b => b.status === 'IN_PROGRESS').length,
          dailyRevenue: 1250.00, // Placeholder
          pendingServices: bookRes.data.filter(b => b.status === 'PENDING').length
        });
        setRecentBookings(bookRes.data.slice(0, 5));
        setLoading(false);
      } catch (err) {
        console.error("Dashboard load error", err);
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div className="page-container">Loading Intelligence...</div>;

  return (
    <div className="page-container">
      <header className="mb-8">
        <h1>Studio Overview</h1>
        <p className="text-muted">Welcome back. Here is what's happening today.</p>
      </header>

      {/* STATS GRID */}
      <div className="stats-grid mb-8">
        <div className="stat-card">
          <div className="stat-icon bg-blue"><FiUsers /></div>
          <div className="stat-content">
            <span className="stat-label">Total Customers</span>
            <h2 className="stat-value">{stats.totalCustomers}</h2>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-green"><FiDollarSign /></div>
          <div className="stat-content">
            <span className="stat-label">Today's Revenue</span>
            <h2 className="stat-value">${stats.dailyRevenue}</h2>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-orange"><FiCalendar /></div>
          <div className="stat-content">
            <span className="stat-label">Active Jobs</span>
            <h2 className="stat-value">{stats.activeBookings}</h2>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-purple"><FiSettings /></div>
          <div className="stat-content">
            <span className="stat-label">Pending Reviews</span>
            <h2 className="stat-value">{stats.pendingServices}</h2>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY TABLE */}
      <div className="card">
        <div className="flex-between mb-4">
          <h3>Recent Bookings</h3>
          <button className="btn-text">View All</button>
        </div>
        <table className="table-standard">
          <thead>
            <tr>
              <th>Vehicle / Customer</th>
              <th>Service Package</th>
              <th>Status</th>
              <th className="text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map(book => (
              <tr key={book.id}>
                <td>
                  <strong>{book.vehicle_name}</strong>
                  <div className="text-xs text-muted">{book.customer_name}</div>
                </td>
                <td>{book.service_name}</td>
                <td>
                  <span className={`badge status-${book.status.toLowerCase()}`}>
                    {book.status}
                  </span>
                </td>
                <td className="text-right font-bold">${book.total_price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DashboardOverview;