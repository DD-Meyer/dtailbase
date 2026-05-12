import { useState, useEffect } from "react";
import api from "../axios_instance";
import "../styles/Settings.css";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "../components/UpgradeValueCards";

function Settings() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const { planLimits, currentPlan, nextPlan } = useCompany();

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        // Fetch the user first to get their company ID
        const userRes = await api.get("auth/users/me/");
        const res = await api.get(`company/${userRes.data.company_id}/`);
        setCompany(res.data);
      } catch (err) {
        console.error("Error loading settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, []);

  const handleSave = async (e) => {
      e.preventDefault();
      try {
          await api.patch(`company/${company.id}/`, company);
          setMsg("Settings updated successfully!");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => setMsg(""), 3000);
      } catch (err) {
          // 🛡️ Catch the Pro Feature validation error from Django
          const errorData = err.response?.data;
          if (errorData?.booking_buffer) {
              setMsg(`❌ ${errorData.booking_buffer}`);
          } else {
              setMsg("Failed to update. Check all fields.");
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  if (loading) return <div className="p-10 ml-64 text-gray-500">Loading business profile...</div>;

  return (
  <div className="settings-wrapper">
    <div className="settings-container">
      
      <header className="settings-header">
        <div>
          <h1>Business Settings</h1>
          <p>Configure the public profile for <strong>{company.name}</strong></p>
          <a href={`https://glistenworx.co.za/`} target="_blank" rel="noreferrer" className="view-site-link">🔗 View My Website</a>
        </div>
        <span className="plan-badge">{company.is_active ? "Active Account" : "Paused"}</span>
      </header>

      {msg && <div className="alert-success">✅ {msg}</div>}

      <UpgradeValueCards currentPlan={currentPlan} />

      <form onSubmit={handleSave}>
        
        {/* Section: Brand Identity */}
        <section className="settings-card">
          <h2 className="card-title">🏷️ Brand Identity</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Business Name</label>
              <input 
                value={company.name || ""} 
                onChange={e => setCompany({...company, name: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Slug (URL Handle)</label>
              <input className="input-readonly" value={company.slug || ""} readOnly />
            </div>
            <div className="input-group full-width">
              <label>Website</label>
              <input 
                value={company.website || ""} 
                onChange={e => setCompany({...company, website: e.target.value})} 
              />
            </div>
          </div>
        </section>

        {/* Section: Contact & Location */}
        <section className="settings-card">
          <h2 className="card-title">📍 Contact & Location</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Public Email</label>
              <input 
                value={company.email || ""} 
                onChange={e => setCompany({...company, email: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input 
                value={company.phone || ""} 
                onChange={e => setCompany({...company, phone: e.target.value})} 
              />
            </div>
            <div className="input-group full-width">
              <label>Physical Address</label>
              <textarea 
                value={company.address || ""} 
                onChange={e => setCompany({...company, address: e.target.value})} 
              />
            </div>
          </div>
        </section>

        {/* Section: Operations */}
        <section className="settings-card">
          <h2 className="card-title">⏰ Operational Rules</h2>
          <div className="form-grid">
            <div className="input-group">
              <label>Opening Time</label>
              <input 
                type="time" 
                value={company.opening_time || ""} 
                onChange={e => setCompany({...company, opening_time: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Closing Time</label>
              <input 
                type="time" 
                value={company.closing_time || ""} 
                onChange={e => setCompany({...company, closing_time: e.target.value})} 
              />
            </div>
            <div className="input-group full-width">
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <label>Booking Buffer</label>
                  <span style={{color: planLimits.buffer_timer ? '#3b82f6' : '#94a3b8', fontWeight: 'bold'}}>
                      {company.booking_buffer} min 
                      {!planLimits.buffer_timer && " (Pro Only)"}
                  </span>
              </div>
              <input 
                  type="range" 
                  className={`buffer-range ${!planLimits.buffer_timer ? 'opacity-50 cursor-not-allowed' : ''}`}
                  min="0" max="120" step="5" // Reduced max to 120 (2 hours) for better UX
                  value={company.booking_buffer || 15} 
                  disabled={!planLimits.buffer_timer} // 🛡️ Disable the slider if not allowed
                  onChange={e => setCompany({...company, booking_buffer: e.target.value})} 
              />
            </div>
          </div>
        </section>

        <div className="save-button-container">
          <button type="submit" className="btn-save">Save Glistenworx Profile</button>
        </div>
      </form>
    </div>
  </div>
);
}

export default Settings;