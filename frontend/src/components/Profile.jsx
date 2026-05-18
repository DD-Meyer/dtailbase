import { useState, useEffect } from "react";
import api from "../axios_instance";
import "../styles/Profile.css";
import { showToast } from "../utils/uiFeedback";

function Profile() {
  const [userData, setUserData] = useState({ 
    first_name: "", 
    last_name: "", 
    username: "", 
    email: "" 
  });
  const [passwordData, setPasswordData] = useState({ old_password: "", new_password: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Fetch the current user data
    api.get("auth/users/me/").then(res => setUserData(res.data));
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      // Send all 4 fields to the partial update endpoint
      await api.patch("auth/users/me/", userData);
      setMsg("Profile updated successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { 
      console.error("Update Error:", err.response?.data);
      setMsg(err.response?.data?.email || err.response?.data?.username || "Update failed."); 
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.post("auth/set-password/", passwordData);
      showToast("Password updated!", "success");
      setPasswordData({ old_password: "", new_password: "" });
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed to change password.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-banner">
        <div className="page-banner-copy">
          <h1>My Profile</h1>
          <p>View and update your account information and security settings.</p>
        </div>
      </div>
      {msg && <div className="badge badge-info mb-4 block text-center">{msg}</div>}
      
      <div className="grid cols-2 gap-6">
        <form className="card flex flex-col gap-3" onSubmit={handleUpdateProfile}>
          <h3>Account Information</h3>
          
          <label className="text-sm font-bold">First Name</label>
          <input 
            type="text" 
            value={userData.first_name || ""} 
            onChange={e => setUserData({...userData, first_name: e.target.value})} 
            placeholder="First Name" 
            required 
          />

          <label className="text-sm font-bold">Last Name</label>
          <input 
            type="text" 
            value={userData.last_name || ""} 
            onChange={e => setUserData({...userData, last_name: e.target.value})} 
            placeholder="Last Name" 
            required 
          />

          <label className="text-sm font-bold">Username</label>
          <input 
            type="text" 
            value={userData.username || ""} 
            onChange={e => setUserData({...userData, username: e.target.value})} 
            placeholder="Username" 
            required 
          />

          <label className="text-sm font-bold">Email Address</label>
          <input 
            type="email" 
            value={userData.email || ""} 
            onChange={e => setUserData({...userData, email: e.target.value})} 
            placeholder="Email" 
            required 
          />

          <button className="btn btn-primary mt-2">Save Profile Changes</button>
        </form>

        <form className="card flex flex-col gap-3" onSubmit={handleChangePassword}>
          <h3>Security</h3>
          <p className="text-xs text-gray-500 mb-2">Update your login password here.</p>
          
          <label className="text-sm font-bold">Current Password</label>
          <input 
            type="password" 
            value={passwordData.old_password}
            placeholder="••••••••" 
            onChange={e => setPasswordData({...passwordData, old_password: e.target.value})} 
            required 
          />
          
          <label className="text-sm font-bold">New Password</label>
          <input 
            type="password" 
            value={passwordData.new_password}
            placeholder="••••••••" 
            onChange={e => setPasswordData({...passwordData, new_password: e.target.value})} 
            required 
          />
          
          <button className="btn btn-danger mt-2">Update Password</button>
        </form>
      </div>
    </div>
  );
}

export default Profile;