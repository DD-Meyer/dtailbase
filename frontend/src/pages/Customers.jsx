import { useEffect, useState, useContext } from "react";
import api from "../axios_instance";
import "../styles/Customers.css";
import { useCompany } from "../context/CompanyContext";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); // Track if we are editing
  const [formData, setFormData] = useState({ firstname: "", lastname: "", email: "", phone: "" });
  const { planLimits, currentPlan, nextPlan } = useCompany();

  const fetchCustomers = async () => {
    try {
      const res = await api.get("customers/");
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers");
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const isUnlimited = planLimits.max_customers === null || 
                      planLimits.max_customers === undefined || 
                      planLimits.max_customers === Infinity;

  // 2. Determine if the user is blocked from adding more
  const isLimitReached = !isUnlimited && customers.length >= planLimits.max_customers;

  const handleAddNew = () => {
    if (isLimitReached) {
      alert(`Customer limit reached for your current plan (${currentPlan}). Please upgrade to add more.`);
      return;
    }
    setEditId(null);
    setFormData({ firstname: "", lastname: "", email: "", phone: "" });
    setShowModal(true);
  };

  // Open modal for editing existing
  const handleEdit = (customer) => {
    setEditId(customer.id);
    setFormData({
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email || "",
      phone: customer.phone || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // UPDATE (PUT or PATCH)
        await api.put(`customers/${editId}/`, formData);
      } else {
        // CREATE (POST)
        await api.post("customers/", formData);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      alert("Error saving customer. Please check your data.");
    }
  };

  const deleteCustomer = async (id) => {
    if (window.confirm("Delete this customer and all their records?")) {
      await api.delete(`customers/${id}/`);
      fetchCustomers();
    }
  };

  const filtered = customers.filter(c => 
    `${c.firstname} ${c.lastname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="flex-between mb-4">
        <span className="text-lg font-bold">
          <h1>Customers</h1>
          <p className="text-sm text-gray-500">
            {/* 3. Improved Display Logic */}
            {customers.length} total customers out of {isUnlimited ? "unlimited" : planLimits.max_customers}.
            
            {!isUnlimited && (
              <>
                {" "}Plan limit: {planLimits.max_customers}.{" "}
                {nextPlan && `Upgrade to ${nextPlan} for more.`}
              </>
            )}
          </p>
        </span>
        
        <button 
          className={`btn ${isLimitReached ? 'btn-disabled opacity-50' : 'btn-primary'}`} 
          onClick={handleAddNew}
          disabled={isLimitReached} // Actually disable the button
          title={isLimitReached ? "Limit reached" : "Add new customer"}
        >
          {isLimitReached ? "Limit Reached" : "+ Add Customer"}
        </button>
      </div>

      <input 
        className="search-input mb-4" 
        placeholder="Search customers..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)} 
      />

      <div className="card">
        <table className="table-standard">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>{c.firstname} {c.lastname}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="text-btn" onClick={() => handleEdit(c)}>Edit</button>
                    <button className="text-btn-danger" onClick={() => deleteCustomer(c.id)}>Delete</button>
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
            <h2>{editId ? "Edit Customer" : "New Customer"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>First Name</label>
                <input 
                  value={formData.firstname}
                  required 
                  onChange={e => setFormData({...formData, firstname: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input 
                  value={formData.lastname}
                  required 
                  onChange={e => setFormData({...formData, lastname: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary">
                  {editId ? "Update Customer" : "Save Customer"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
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

export default Customers;