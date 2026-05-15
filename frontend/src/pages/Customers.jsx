import { useEffect, useState, useContext } from "react";
import api from "../axios_instance";
import "../styles/Customers.css";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "../components/UpgradeValueCards";

function Customers() {
  const TABLET_BREAKPOINT = 1024;
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null); // Track if we are editing
  const [formData, setFormData] = useState({ firstname: "", lastname: "", email: "", phone: "" });
  const [isCompactView, setIsCompactView] = useState(() => window.innerWidth <= TABLET_BREAKPOINT);
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

  useEffect(() => {
    const handleResize = () => {
      setIsCompactView(window.innerWidth <= TABLET_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      <div className="card-banner mb-6">
        <div className="page-banner">
          <div className="page-banner-copy">
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-50">
            {/* 3. Improved Display Logic */}
            {customers.length} total customers out of {isUnlimited ? "unlimited" : planLimits.max_customers}.
            
            {!isUnlimited && (
              <>
                {" "}Plan limit: {planLimits.max_customers}.{" "}
                {nextPlan && `Upgrade to ${nextPlan} for more.`}
              </>
            )}
          </p>
          </div>

          <div className="page-banner-actions">
            <button 
              className={`btn ${isLimitReached ? 'btn-disabled opacity-50' : 'btn-primary'}`} 
              onClick={handleAddNew}
              disabled={isLimitReached} // Actually disable the button
              title={isLimitReached ? "Limit reached" : "Add new customer"}
            >
              {isLimitReached ? "Limit Reached" : "+ Add Customer"}
            </button>
          </div>
        </div>
      </div>

      

      <UpgradeValueCards currentPlan={currentPlan} />

      {!isCompactView && (
        <input 
          className="search-input mb-4" 
          placeholder="Search customers..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)} 
        />
      )}

      {isCompactView && (
        <div className="search-wrapper customers-search-wrapper mb-4">
          <input 
            type="text"
            className="search-input customers-search-input"
            placeholder="Search customers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)} 
          />
          <span className="search-icon">🔍</span>
        </div>
      )}

      <div className="card customers-table-container">
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
                <td data-label="Name">{c.firstname} {c.lastname}</td>
                <td data-label="Email">{c.email}</td>
                <td data-label="Phone">{c.phone}</td>
                <td data-label="Actions">
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