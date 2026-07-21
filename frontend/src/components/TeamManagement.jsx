import { useEffect, useState, useContext } from "react";
import api from "../axios_instance";
import "../styles/TeamManagement.css";
import { AuthContext } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import UpgradeValueCards from "./UpgradeValueCards";
import PlanUsageBanner from "./PlanUsageBanner";
import { showConfirm, showToast } from "../utils/uiFeedback";

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_GUIDANCE =
  "Use at least 8 characters with uppercase, lowercase, a number, and a symbol. Example: Dtail!482A";

const generateTemporaryPassword = () => {
  const prefix = "D7t!";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const randomBytes = new Uint8Array(10);

  window.crypto.getRandomValues(randomBytes);

  const randomPart = Array.from(randomBytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `${prefix}${randomPart}`;
};

function TeamManagement() {
  const { user } = useContext(AuthContext);
  const { planLimits, currentPlan, nextPlan } = useCompany();
  const [team, setTeam] = useState([]);
  const [msg, setMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [createdMemberName, setCreatedMemberName] = useState("");
  const [createdMemberPassword, setCreatedMemberPassword] = useState("");

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
        const member = team.find((m) => m.id === memberId);
        const isSelfOwnerDemotion =
          member?.email === user.email &&
          member?.role === "OWNER" &&
          editData.role === "STAFF";

        const nextPassword = (editData.password || "").trim();
        if (nextPassword && nextPassword.length < MIN_PASSWORD_LENGTH) {
          showToast(PASSWORD_GUIDANCE, "error");
          return;
        }

        if (isSelfOwnerDemotion) {
          setMsg("Owner safety lock: You cannot change your own account role to Staff.");
          return;
        }

        const payload = {
        first_name: editData.first_name,
        last_name: editData.last_name,
        role: editData.role,
        username: memberId === editingId ? editData.username : undefined, // Ensure username is sent if needed
        };

        // If the owner typed a value into the password reset field
        if (nextPassword !== "") {
        payload.password = nextPassword;
        }

        await api.patch(`company/team/${memberId}/`, payload);
        
        setMsg("Member updated successfully!");
        setEditingId(null);
        fetchTeam();
        
        // Clear the message after 3 seconds
        setTimeout(() => setMsg(""), 3000);
    } catch (err) {
        const serverError = err.response?.data;
        const passwordError = Array.isArray(serverError?.password)
          ? serverError.password[0]
          : serverError?.password;

        if (passwordError) {
          showToast(PASSWORD_GUIDANCE, "error");
          return;
        }

        const errorMsg =
          serverError?.detail ||
          serverError?.error ||
          err.message ||
          "Update failed. Check console.";
        showToast(errorMsg, "error");
        console.log("Error:", serverError);
    }
    };

  const handleAddMember = async (e) => {
      e.preventDefault();

      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        showToast("First Name and Last Name are strictly required.", "error");
          return;
      }

      try {
          const temporaryPassword = generateTemporaryPassword();
          // Construct a clean payload
          const payload = { 
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              username: formData.email, // Standard practice to use email as username
              role: formData.role,
              password: temporaryPassword,
              is_active: true
              // NOTICE: No 'company' or 'company_id' here. 
              // The backend will inject it from the Admin's session.
          };
          
          await api.post("company/team/", payload);
          setShowAddForm(false);
          fetchTeam();
          setFormData({ first_name: "", last_name: "", email: "", role: "STAFF" });
          setCreatedMemberName(`${payload.first_name} ${payload.last_name}`.trim());
          setCreatedMemberPassword(temporaryPassword);
          setShowPasswordModal(true);
          showToast("Team member added successfully!", "success");
      } catch (err) {
        // For debugging, log the full error response
        const serverError = err.response?.data;
        let errorMsg = "Failed to add member.";

        if (planLimits && team.length >= planLimits.max_users) {
          errorMsg = `Plan limit reached: Your current plan allows a maximum of ${planLimits.max_users} users. Please upgrade to add more team members.`;
        } else if (Array.isArray(serverError?.password) && serverError.password.length > 0) {
          errorMsg = PASSWORD_GUIDANCE;
        } else if (serverError?.detail) {
          errorMsg = serverError.detail;
        } else if (serverError?.email) {
          errorMsg = `Email error: ${serverError.email.join(" ")}`;
        } else if (err.message) {
          errorMsg = err.message;
        }
        
        setMsg(errorMsg);
        showToast(errorMsg, "error");
      }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCreatedMemberName("");
    setCreatedMemberPassword("");
  };

  const handleDeleteMember = async (memberId) => {
      const confirmed = await showConfirm({
        title: "Delete team member",
        message: "Are you sure you want to delete this user? This action cannot be undone.",
        confirmText: "Delete",
        danger: true,
      });
      if (!confirmed) return;
      try {
          await api.delete(`company/team/${memberId}/`);
          showToast("Team member deleted successfully.", "success");
          fetchTeam();
      } catch (err) {
          const errorMsg = err.response?.data?.detail || 
                          err.response?.data?.error || 
                          err.message || 
                          "Failed to delete member.";
          showToast(errorMsg, "error");
          console.error("Delete error:", err);
      }
  };

  const handleToggleStatus = async (member) => {
      const action = member.is_active ? "deactivate" : "reactivate";
      const confirmed = await showConfirm({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} member`,
        message: `Are you sure you want to ${action} this user?`,
        confirmText: action === "deactivate" ? "Deactivate" : "Reactivate",
        danger: action === "deactivate",
      });
      if (!confirmed) return;

      try {
          // We send the opposite of their current status
          await api.patch(`company/team/${member.id}/`, { 
          is_active: !member.is_active 
          });
          
          showToast(`User ${action}d successfully.`, "success");
          fetchTeam();
      } catch (err) {
          const errorMsg = err.response?.data?.detail || 
                          err.response?.data?.error || 
                          err.message || 
                          `Failed to ${action} user.`;
          showToast(errorMsg, "error");
      }
  };

  const filteredTeam = team.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="page-container">
      <div className="card-banner mb-6">
        <div className="page-banner">
          <div className="page-banner-copy">
            <h1 className="text-2xl font-bold">Team Management</h1>
            <p>Manage your company's team members and their roles.</p>
          </div>

          <div className="page-banner-actions">
            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Cancel" : "Add Member"}
            </button>
          </div>
        </div>
      </div>

      <PlanUsageBanner
        metrics={[
          {
            label: "Team members",
            used: team.length,
            total: planLimits?.max_users ?? null,
          },
        ]}
        currentPlan={currentPlan}
        nextPlan={nextPlan}
      />
      

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
          <p className="text-sm text-muted" style={{ gridColumn: "1 / -1" }}>
            New team members receive a temporary strong password automatically. You will see it once after saving.
          </p>
        </form>
      )}

      <UpgradeValueCards currentPlan={currentPlan} />

      {/* Search bar for filtering team members */}
      <input 
        type="text" placeholder="Search team members..." className="search-input mb-4"
        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
      />

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
                        <input
                          type="password"
                          placeholder="Reset Password (optional, min 8 chars)"
                          className="input-sm text-xs"
                          onChange={e => setEditData({...editData, password: e.target.value})}
                        />
                        <span className="text-xs text-muted">{PASSWORD_GUIDANCE}</span>
                      </div>
                    </td>,
                    <td key="edit-email">{member.email}</td>,
                    <td key="edit-role">
                      <select
                        className="input-sm"
                        value={editData.role}
                        onChange={e => setEditData({...editData, role: e.target.value})}
                        disabled={member.email === user.email && member.role === "OWNER"}
                        title={member.email === user.email && member.role === "OWNER" ? "You cannot change your own Owner role" : "Change role"}
                      >
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
                    <td key="view-actions" className="team-action-group">
                      <button className="btn btn-xs team-action-btn team-action-edit" onClick={() => {setEditingId(member.id); setEditData(member); }}>
                        Edit
                      </button>
                      {/* Only show activate/deactivate button if this is not the logged-in user */}
                      {member.email !== user.email && (
                        <button 
                          className={`btn btn-xs team-action-btn ${member.is_active ? 'team-action-deactivate' : 'team-action-reactivate'}`}
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
                        <button className="btn btn-xs team-action-btn team-action-delete" onClick={() => handleDeleteMember(member.id)}>
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

      {showPasswordModal && (
        <div className="modal-backdrop" onClick={closePasswordModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Team member created</h2>
            <p className="text-sm text-muted mb-4">
              Save this temporary password now. It will not be shown again for this creation.
            </p>

            <div className="card p-4 mb-4" style={{ background: "#f8fafc" }}>
              <p className="text-sm text-muted mb-1">Member</p>
              <p className="font-semibold mb-3">{createdMemberName || "New team member"}</p>
              <p className="text-sm text-muted mb-1">Temporary password</p>
              <p className="font-mono text-base break-all">{createdMemberPassword}</p>
            </div>

            <p className="text-sm text-muted mb-4">{PASSWORD_GUIDANCE}</p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(createdMemberPassword);
                  showToast("Temporary password copied to clipboard.", "success");
                }}
              >
                Copy Password
              </button>
              <button type="button" className="btn btn-primary" onClick={closePasswordModal}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamManagement;