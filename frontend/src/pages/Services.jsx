import { useEffect, useState } from "react";
import api from "../axios_instance";
import "../styles/Services.css";

function Services() {
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: 60,
    base_price: "0.00"
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get("services/");
      setServices(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`services/${editingId}/`, formData);
      } else {
        await api.post("services/", formData);
      }
      resetForm();
      fetchServices();
    } catch (err) {
      alert("Error saving service: " + (err.response?.data?.error || "Check console"));
    }
  };

  const startEdit = (service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      base_price: service.base_price
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? Services with booking history will be deactivated instead of deleted.")) {
      try {
        const res = await api.delete(`services/${id}/`);
        if (res.data?.message) alert(res.data.message);
        fetchServices();
      } catch (err) {
        alert(err.response?.data?.error || "Delete error");
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", duration_minutes: 60, base_price: "0.00" });
    setEditingId(null);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="page-container">Loading Services...</div>;

  return (
    <div className="page-container">
      <div className="flex-between mb-6">
        <h1>Service Management</h1>
        <button 
          className="btn btn-secondary" 
          onClick={() => { resetForm(); window.scrollTo({top: 0}); }}
        >
          {editingId ? "Cancel Edit" : "Reset Form"}
        </button>
      </div>

      {/* Form Card */}
      <div className="card mb-8">
        <h2 className="mb-4">{editingId ? "Update Existing Service" : "Create New Package"}</h2>
        <form onSubmit={handleSubmit} className="grid-form">
          <div className="form-group">
            <label>Service Name</label>
            <input
              name="name"
              placeholder="e.g. Full Interior Detail"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Base Price ($)</label>
            <input
              name="base_price"
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Duration (Minutes)</label>
            <input
              name="duration_minutes"
              type="number"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              name="description"
              placeholder="What is included in this service?"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          <div className="mt-4">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Update Service" : "Add Service"}
            </button>
          </div>
        </form>
      </div>

      {/* Search Bar */}
      <div className="search-wrapper mb-4">
        <input 
          type="text" 
          placeholder="Search services by name or description..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      {/* Services Table */}
      <div className="card services-table-container">
        <table className="table-standard">
          <thead>
            <tr>
              <th>Service Details</th>
              <th>Duration</th>
              <th>Price</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length > 0 ? (
              filteredServices.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <br />
                    <small className="text-muted">{s.description || "No description provided"}</small>
                  </td>
                  <td>{s.duration_minutes} mins</td>
                  <td className="font-bold">${s.base_price}</td>
                  <td className="text-right">
                    <button onClick={() => startEdit(s)} className="text-btn mr-4">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-btn-danger">Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-8">No services found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Services;