import { useEffect, useState } from "react";
import api from "../axios_instance";
import { Plus, X } from "lucide-react";
import "../styles/Vehicles.css";
import "../styles/EditableRow.css";
import EditableRow from "../components/EditableRow";
import { showConfirm } from "../utils/uiFeedback";

function Vehicles() {
  const TABLET_BREAKPOINT = 1024;
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newVehicle, setNewVehicle] = useState({ customer: "", make: "", model: "", year: "", registration: "" });
  const [isCompactView, setIsCompactView] = useState(() => window.innerWidth <= TABLET_BREAKPOINT);
  const [showVehicleForm, setShowVehicleForm] = useState(() => window.innerWidth > TABLET_BREAKPOINT);

  // 1. Toast State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // 2. Helper to trigger toast and auto-hide
  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000); // Hide after 4 seconds
  };

  useEffect(() => {
    api.get("vehicles/").then(res => setVehicles(res.data));
    api.get("customers/").then(res => setCustomers(res.data));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const compact = window.innerWidth <= TABLET_BREAKPOINT;
      setIsCompactView(compact);
      if (!compact) {
        setShowVehicleForm(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isNaN(newVehicle.year)) {
      triggerToast("Year must be a valid number", "error");
      return;
    }

    try {
      const res = await api.post("vehicles/", {
        ...newVehicle,
        year: parseInt(newVehicle.year, 10)
      });
      
      setVehicles([...vehicles, res.data]);
      setNewVehicle({ customer: "", make: "", model: "", year: "", registration: "" });
      if (isCompactView) {
        setShowVehicleForm(false);
      }
      
      triggerToast("Vehicle registered successfully!", "success");
    } catch (err) {
      const serverErrors = err.response?.data;
      let errorMsg = "Error adding vehicle";
      
      if (serverErrors) {
        errorMsg = Object.entries(serverErrors)
          .map(([field, messages]) => `${messages.join(" ")}`)
          .join(" ");
      }
      triggerToast(errorMsg, "error");
    }
  };

  const handleDeleteVehicle = async (id) => {
    const confirmed = await showConfirm({
      title: "Delete vehicle",
      message: "Delete this vehicle?",
      confirmText: "Delete",
      danger: true,
    });

    if (!confirmed) return;

    try {
      await api.delete(`vehicles/${id}/`);
      setVehicles(prev => prev.filter(v => v.id !== id));
      triggerToast("Vehicle deleted", "success");
    } catch (err) { 
      triggerToast(err.response?.data?.error || "Delete failed. Vehicle might be linked to a booking.", "error"); 
    }
  };

  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ customer: "", make: "", model: "", year: "", registration: "" });

  // 1. Fill the form with existing data
  const startEdit = (v) => {
    setEditingVehicle(v.id);
    setFormData({
      customer: v.customer.id, // Ensure we send the ID
      make: v.make,
      model: v.model,
      year: v.year,
      registration: v.registration
    });
    setShowModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. Handle the actual update
  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`vehicles/${editingVehicle}/`, {
        ...formData,
        year: parseInt(formData.year, 10)
      });
      
      // Update the list locally
      setVehicles(prev => prev.map(v => v.id === editingVehicle ? res.data : v));
      
      // Reset state
      setEditingVehicle(null);
      setShowModal(false);
      setFormData({ customer: "", make: "", model: "", year: "", registration: "" });
      triggerToast("Vehicle updated!", "success");
    } catch (err) {
      triggerToast("Update failed", "error");
    }
  };

  const handleSaveVehicle = async (updatedVehicle) => {
    try {
      if (updatedVehicle.id) {
        await api.put(`vehicles/${updatedVehicle.id}/`, updatedVehicle);
      } else {
        await api.post("vehicles/", updatedVehicle);
      }
      fetchVehicles();
      setEditingVehicle(null);
    } catch (err) {
      triggerToast("Error saving vehicle. Please check your data.", "error");
    }
  };

  const cancelEdit = () => {
    setEditingVehicle(null);
    setShowModal(false);
    setNewVehicle({ customer: "", make: "", model: "", year: "", registration: "" });
    if (isCompactView) {
      setShowVehicleForm(false);
    }
  };

  const shouldShowVehicleForm = !isCompactView || showVehicleForm || editingVehicle !== null;
  const filteredVehicles = vehicles.filter((vehicle) => {
    const ownerName = `${vehicle.customer?.firstname || ""} ${vehicle.customer?.lastname || ""}`.toLowerCase();
    const vehicleDetails = `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.toLowerCase();
    const registration = `${vehicle.registration || ""}`.toLowerCase();
    const query = searchQuery.toLowerCase();

    return ownerName.includes(query) || vehicleDetails.includes(query) || registration.includes(query);
  });

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle.id);
    setFormData({
      customer: vehicle.customer.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      registration: vehicle.registration,
    });
    setShowModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}

      <div className="card-banner mb-6">
        <div className="page-banner">
          <div className="page-banner-copy">
            <h1 className="text-2xl font-bold">Vehicle Fleet</h1>
            <p>{vehicles.length} registered vehicles across your customer base.</p>
          </div>

          <div className="page-banner-actions">
            {isCompactView && (
              <button
                type="button"
                className="btn btn-primary vehicles-toggle-btn"
                onClick={() => {
                  if (editingVehicle !== null) {
                    cancelEdit();
                    return;
                  }
                  setShowVehicleForm(prev => !prev);
                }}
                aria-expanded={shouldShowVehicleForm}
              >
                {editingVehicle !== null || shouldShowVehicleForm ? (
                  <X size={14} aria-hidden="true" />
                ) : (
                  <Plus size={14} aria-hidden="true" />
                )}
                {editingVehicle !== null
                  ? "Cancel Edit"
                  : shouldShowVehicleForm
                    ? "Hide Vehicle Form"
                    : "Add Vehicle"}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {shouldShowVehicleForm && (
      <div className="card mb-6">
        {/* Title changes based on mode */}
        <h3>{editingVehicle ? "🔧 Update Vehicle" : "🚗 Register New Vehicle"}</h3>
        
        {/* ONLY ONE FORM HERE */}
        <form onSubmit={editingVehicle ? handleUpdateVehicle : handleSubmit} className="input-grid mt-4">
          
          <select 
            className="full-width" 
            value={newVehicle.customer} // Controlled component
            onChange={e => setNewVehicle({...newVehicle, customer: e.target.value})} 
            required
          >
            <option value="">-- Select Owner --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.firstname} {c.lastname}</option>
            ))}
          </select>

          <input 
            placeholder="Make" 
            value={newVehicle.make} // Added value
            onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} 
            required
          />
          
          <input 
            placeholder="Model" 
            value={newVehicle.model} // Added value
            onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} 
            required
          />
          
          <input 
            type="number" 
            placeholder="Year" 
            value={newVehicle.year} 
            onChange={e => setNewVehicle({...newVehicle, year: e.target.value})} 
            required
          />
          
          <input 
            placeholder="Registration" 
            value={newVehicle.registration} // Added value
            onChange={e => setNewVehicle({...newVehicle, registration: e.target.value})} 
            required
          />

          {/* align button right */}
          <div className="flex gap-2 w-full mt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {editingVehicle ? "Save Changes" : "Register Vehicle"}
            </button>
            
            {editingVehicle && (
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      )}

      {isCompactView && (
        <div className="search-wrapper vehicles-search-wrapper mb-4">
          <input
            type="text"
            placeholder="Search owner, vehicle, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input vehicles-search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      )}

      <div className="card vehicles-table-container">
        <table className="table-standard vehicles-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Make</th>
              <th>Model</th>
              <th>Year</th>
              <th>Registration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td data-label="Owner">{vehicle.customer?.firstname} {vehicle.customer?.lastname}</td>
                <td data-label="Make">{vehicle.make}</td>
                <td data-label="Model">{vehicle.model}</td>
                <td data-label="Year">{vehicle.year}</td>
                <td data-label="Registration">{vehicle.registration}</td>
                <td data-label="Actions">
                  <div className="vehicle-action-group">
                    <button className="btn btn-xs team-action-btn team-action-edit" onClick={() => handleEdit(vehicle)}>
                      Edit
                    </button>
                    <button className="btn btn-xs team-action-btn team-action-delete" onClick={() => handleDeleteVehicle(vehicle.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Vehicle</h2>
            <form onSubmit={handleUpdateVehicle}>
              <div className="form-group">
                <label>Customer</label>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  required
                >
                  <option value="">-- Select Owner --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstname} {customer.lastname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Registration</label>
                <input
                  type="text"
                  name="registration"
                  value={formData.registration}
                  onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary">
                  Update Vehicle
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;