import { useState, useContext } from "react";
import api from "../axios_instance";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/Login.css"

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("token/", { 
        email: email, 
        password: password 
      }); 
      
      // res.data.user should contain the object: { email, role, id, ... }
      // Pass the user object instead of just the email string
      login(res.data.access, res.data.refresh, res.data.user); 
      
      navigate("/bookings");
    } catch (err) {
      // This will print the EXACT reason the backend said "No"
      console.error("Login Error Details:", err.response?.data);
      
      // Check if the server is actually reachable
      if (!err.response) {
        alert("Server is offline or CORS issue.");
      } else {
        alert(err.response.data.detail || "Invalid Email or Password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Please enter your details to sign in</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login to Dashboard"}
          </button>
        </form>
        <div className="login-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
          <p className="mt-4 text-xs">© 2026 Your Company Service Portal</p>
        </div>
      </div>
    </div>
  );
}

export default Login;