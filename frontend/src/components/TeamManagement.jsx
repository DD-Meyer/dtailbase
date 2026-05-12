import { useEffect, useState, useContext } from "react";
import api from "../axios_instance";
import "../styles/TeamManagement.css";
import { AuthContext } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "./UpgradeValueCards";

function TeamManagement() {
  const { user } = useContext(AuthContext);
  const { planLimits, currentPlan, nextPlan } = useCompany();
  const [team, setTeam] = useState([]);
  const [msg, setMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({ 
    first_name: "", 
    last_name: "", 
    email: "", 
    role: "STAFF",
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // Inside TeamManagement.jsx
  const fetchTeam = async () => {
    try {
      const response = await api.get("company/team/"); // Ensure trailing slash is here
      setTeam(response.data);
    } catch (err) {
      console.error("Failed to fetch team members", err);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  // Standard handler for all inputs to keep state in sync
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateMember = async (memberId) => {
    try {
        const payload = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        role: editData.role,
        username: memberId === editingId ? editData.username : undefined, // Ensure username is sent if needed
        };

        // If the owner typed a value into the password reset field
        if (editData.password && editData.password.trim() !== "") {
        payload.password = editData.password;
        }

        await api.patch(`company/team/${memberId}/`, payload);
        
        setMsg("Member updated successfully!");
        setEditingId(null);
        fetchTeam();
        
        // Clear the message after 3 seconds
        setTimeout(() => setMsg(""), 3000);
    } catch (err) {
        console.log("Error:", err.response?.data);
        setMsg("Update failed. Check console.");
    }
    };

  const handleAddMember = async (e) => {
      e.preventDefault();

      if (!formData.first_name.trim() || !formData.last_name.trim()) {
          alert("First Name and Last Name are strictly required.");
          return;
      }

      try {
          // Construct a clean payload
          const payload = { 
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              username: formData.email, // Standard practice to use email as username
              role: formData.role,
              password: "TempPassword123", // Backend handles the user creation
              is_active: true
              // NOTICE: No 'company' or 'company_id' here. 
              // The backend will inject it from the Admin's session.
          };
          
          await api.post("company/team/", payload);
          setShowAddForm(false);
          fetchTeam();
          setFormData({ first_name: "", last_name: "", email: "", role: "STAFF" });
      } catch (err) {
        // For debugging, log the full error response
        const serverError = err.response?.data;

        if (planLimits && team.length >= planLimits.max_users) {
          setMsg(`Plan limit reached: Your current plan allows a maximum of ${planLimits.max_users} users. Please upgrade to add more team members.`);
        } else if (serverError.email) {
          setMsg(`Email error: ${serverError.email.join(" ")}`);
        } else {
          setMsg("Failed to add member. Check console for details.");
        }
      }
  };

  const handleDeleteMember = async (memberId) => {
      if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
      try {
          await api.delete(`company/team/${memberId}/`);
          setMsg("Member deleted successfully.");
          fetchTeam();
          setTimeout(() => setMsg(""), 3000);
      } catch (err) {
          setMsg("Failed to delete member.");
      }
  };

  const handleToggleStatus = async (member) => {
      const action = member.is_active ? "deactivate" : "reactivate";
      if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

      try {
          // We send the opposite of their current status
          await api.patch(`company/team/${member.id}/`, { 
          is_active: !member.is_active 
          });
          
          setMsg(`User ${action}d successfully.`);
          fetchTeam();
          setTimeout(() => setMsg(""), 3000);
      } catch (err) {
          setMsg("Failed to update status.");
      }
  };

  const filteredTeam = team.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="page-container">
      <div className="flex-between mb-6">
        <span className="text-sm text-gray-600">
          <h1>Team Management</h1>
          <p className="text-sm text-gray-600">Manage your company's team members and their roles.</p>
          <p className="text-sm text-gray-600">Current Plan: <strong>{currentPlan}</strong></p>
          <p className="text-sm text-gray-600">Users: {team.length} / {planLimits ? planLimits.max_users : "Unlimited"}</p>
        </span>
        

        {/* Show upgrade prompt if on Starter plan and at user limit */}
        {planLimits && team.length >= planLimits.max_users ? (
          <div className="plan-status-banner">
            <p>You are on the <strong>{currentPlan}</strong> plan.</p>
            
            {nextPlan ? (
              <p className="text-xs">
                Need more than {planLimits.max_users} users? 
                <span className="text-blue-500 cursor-pointer"> Upgrade to {nextPlan}</span>
              </p>
            ) : (
              <p className="text-xs text-green-600">You are on our highest tier plan!</p>
            )}
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "Add Member"}
          </button>
        )}
      </div>
      

      {showAddForm && (
        <form className="card mb-6 grid-form" onSubmit={handleAddMember}>
          {/* Added 'name' attributes so handleChange works correctly */}
          <input 
            type="text" 
            name="first_name"
            placeholder="First Name" 
            required 
            value={formData.first_name}
            onChange={handleChange} 
          />
          <input 
            type="text" 
            name="last_name"
            placeholder="Last Name" 
            required 
            value={formData.last_name}
            onChange={handleChange} 
          />
          <input 
            type="email" 
            name="email"
            placeholder="Email (Username)" 
            required 
            value={formData.email}
            onChange={handleChange} 
          />
          <select name="role" value={formData.role} onChange={handleChange} required>
            <option value="OWNER">Owner</option>
            <option value="STAFF">Technician / Staff</option>
          </select>
          <button className="btn btn-success" type="submit">Save Member</button>
        </form>
      )}

      {/* Search bar for filtering team members */}
      <input 
        type="text" placeholder="Search team members..." className="search-input"
        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
      />

      <UpgradeValueCards currentPlan={currentPlan} />

      {/* If no members match the search query, show a friendly message */}
      {filteredTeam.length === 0 && <p className="text-center text-gray-500">No team members found.</p>}
      <div className="card">
        {msg && <div className="badge badge-info mb-4 p-4 block w-full text-center">{msg}</div>}
        <table className="table-standard">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeam.map((member) => (
              <tr key={member.id}>
                {editingId === member.id ? (
                  /* Render separate cells without a fragment wrapper */
                  [
                    <td key="edit-name">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input className="input-sm" value={editData.first_name} onChange={e => setEditData({...editData, first_name: e.target.value})} />
                          <input className="input-sm" value={editData.last_name} onChange={e => setEditData({...editData, last_name: e.target.value})} />
                        </div>
                        <input type="password" placeholder="Reset Password (optional)" className="input-sm text-xs" onChange={e => setEditData({...editData, password: e.target.value})}/>
                      </div>
                    </td>,
                    <td key="edit-email">{member.email}</td>,
                    <td key="edit-role">
                      <select className="input-sm" value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}>
                        <option value="OWNER">Owner</option>
                        <option value="STAFF">Staff</option>
                      </select>
                    </td>,
                    <td key="edit-status"></td>,
                    <td key="edit-actions" className="flex gap-2">
                      <button className="btn btn-success btn-xs" onClick={() => handleUpdateMember(member.id)}>Save</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                    </td>
                  ]
                ) : (
                  /* Render separate cells without a fragment wrapper */
                  [
                    <td key="view-name">{member.first_name} {member.last_name}</td>,
                    <td key="view-email">{member.email}</td>,
                    <td key="view-role"><span className={`badge badge-${member.role}`}>{member.role}</span></td>,
                    <td key="view-status">
                      <span className={`badge ${member.is_active ? 'badge-success' : 'badge-ghost'}`}>
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>,
                    <td key="view-actions" className="flex gap-2">
                      <button className="btn btn-outline btn-xs" onClick={() => {setEditingId(member.id); setEditData(member); }}>
                        Edit
                      </button>
                      {/* Only show activate/deactivate button if this is not the logged-in user */}
                      {member.email !== user.email && (
                        <button 
                          className={`btn btn-${member.is_active ? 'danger' : 'success'} btn-xs`}
                          onClick={() => handleToggleStatus(member)}
                        >
                          {member.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                      {/* If this is the logged-in user, show a note instead of the deactivate button */}
                      {member.email === user.email && (
                        <span className="text-xs text-gray-500">You cannot deactivate your own account</span>
                      )}
                      {/*delete account button only for owner and not for themselves*/}
                      {user.role === "OWNER" && member.email !== user.email && (
                        <button className="btn btn-danger btn-xs" onClick={() => handleDeleteMember(member.id)}>
                          Delete
                        </button>
                      )}
                    </td>
                  ]
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TeamManagement;