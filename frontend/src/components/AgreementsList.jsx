import { useState, useEffect } from "react";
import api from "../axios_instance";
import { useNavigate } from "react-router-dom";
import "../styles/Indemnity.css"; // You can reuse your styles

function AgreementsList() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const res = await api.get("indemnity/agreements/");
        setAgreements(res.data);
      } catch (err) {
        console.error("Failed to fetch agreements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgreements();
  }, []);

  if (loading) return <div className="loading-screen">Loading Agreement Log...</div>;

  return (
    <div className="page-container">
      <div className="card list-card">
        <header className="list-header">
          <h1>Signed Indemnity Log</h1>
          <button onClick={() => navigate("/bookings")} className="btn btn-secondary">
            New Signature
          </button>
        </header>

        <div className="table-responsive">
          <table className="agreements-table">
            <thead>
              <tr>
                <th>Date Signed</th>
                <th>Customer</th>
                <th>Booking Ref</th>
                <th>Photos</th>
                <th>Legal Hash</th>
              </tr>
            </thead>
            <tbody>
                {agreements.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>No signed agreements found.</td></tr>
                ) : (
                    agreements.map((agm) => (
                    <tr key={agm.id}>
                        <td>{agm.signed_at ? new Date(agm.signed_at).toLocaleString() : "Pending"}</td>
                        <td>{agm.customer_name || "Unknown Customer"}</td>
                        {/* ✅ Use optional chaining and a fallback for substring */}
                        <td><code>{agm.id?.substring(0, 8).toUpperCase() || "N/A"}</code></td>
                        <td>{agm.photos?.length || 0} Images</td>
                        <td className="hash-cell">
                        {/* ✅ Safe check for hash */}
                        {agm.document_hash ? `${agm.document_hash.substring(0, 12)}...` : "No Hash"}
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AgreementsList;