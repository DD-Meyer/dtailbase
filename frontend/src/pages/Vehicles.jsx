import { useEffect, useState } from "react";
import api from "../axios_instance";
import "../styles/Vehicles.css";

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [newVehicle, setNewVehicle] = useState({ customer: "", make: "", model: "", year: "", registration: "" });

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
      
      // REMOVED alert() - Toast now triggers instantly
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
    if (window.confirm("Delete this vehicle?")) {
      try {
        await api.delete(`vehicles/${id}/`);
        setVehicles(prev => prev.filter(v => v.id !== id));
        triggerToast("Vehicle deleted", "success");
      } catch (err) { 
        triggerToast("Delete failed. Vehicle might be linked to a booking.", "error"); 
      }
    }
  };

  const [editingVehicle, setEditingVehicle] = useState(null);

// 1. Fill the form with existing data
const startEdit = (v) => {
  setEditingVehicle(v.id);
  setNewVehicle({
    customer: v.customer.id, // Ensure we send the ID
    make: v.make,
    model: v.model,
    year: v.year,
    registration: v.registration
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  // 2. Handle the actual update
  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`vehicles/${editingVehicle}/`, {
        ...newVehicle,
        year: parseInt(newVehicle.year, 10)
      });
      
      // Update the list locally
      setVehicles(prev => prev.map(v => v.id === editingVehicle ? res.data : v));
      
      // Reset state
      setEditingVehicle(null);
      setNewVehicle({ customer: "", make: "", model: "", year: "", registration: "" });
      triggerToast("Vehicle updated!", "success");
    } catch (err) {
      triggerToast("Update failed", "error");
    }
  };

  // 3. Clear edit mode
  const cancelEdit = () => {
    setEditingVehicle(null);
    setNewVehicle({ customer: "", make: "", model: "", year: "", registration: "" });
  };

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}

      <h1>Vehicle Fleet</h1>
      
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

          <div className="flex gap-2 full-width">
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

      <div className="card vehicles-table-container">
        <table className="table-standard">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Vehicle</th>
              <th>Reg Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id}>
                <td>{v.customer?.firstname} {v.customer?.lastname}</td>
                <td>{v.year} {v.make} {v.model}</td>
                <td><strong>{v.registration}</strong></td>
                <td>
                  <button className="text-btn-primary mr-2" onClick={() => startEdit(v)}>Edit</button>
                  <button className="text-btn-danger" onClick={() => handleDeleteVehicle(v.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Vehicles;