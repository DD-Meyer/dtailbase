import { useState, useContext, useEffect, useRef } from "react";
import api from "../axios_instance";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/Login.css"

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const planContext = location.state?.fromPlanCta ? location.state : null;
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const completeLogin = (authResponse) => {
    login(authResponse.access, authResponse.refresh, authResponse.user, { rememberMe });

    if (planContext?.selectedPlanId && planContext.selectedPlanId !== "STARTER") {
      navigate(planContext.redirectTo || `/payments?plan=${planContext.selectedPlanId}`);
    } else {
      navigate("/bookings");
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const initializeGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) {
            setGoogleError("Google authentication did not return a credential.");
            return;
          }

          setGoogleError("");
          setIsGoogleLoading(true);

          try {
            const authResponse = await api.post("auth/google-login/", {
              credential: response.credential,
            });

            completeLogin(authResponse.data);
          } catch (error) {
            console.error("Google Login Error:", error.response?.data || error.message);
            setGoogleError(error.response?.data?.detail || "Google sign in failed. Please try again.");
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogleButton();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogleButton);
      return () => existingScript.removeEventListener("load", initializeGoogleButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initializeGoogleButton);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", initializeGoogleButton);
    };
  }, [googleClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("token/", { 
        email: email, 
        password: password 
      }); 
      
      completeLogin(res.data);
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
    <div className={`login-container ${planContext ? "login-from-plan" : ""}`}>
      <div className="login-shell">
        <div className="login-card">
        <Link to="/" className="auth-back-link" aria-label="Back to home">
          &larr; Back to home
        </Link>

        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Please enter your details to sign in</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              autoComplete="username"
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
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="login-options-row">
            <label className="remember-me-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login to Dashboard"}
          </button>
        </form>

        <div className="google-login-wrap">
          <div className="login-divider"><span>or</span></div>
          {!googleClientId && (
            <p className="google-login-note">Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to your frontend environment.</p>
          )}
          {googleClientId && (
            <>
              <div ref={googleButtonRef} className="google-login-button" aria-live="polite" />
              {isGoogleLoading && <p className="google-login-note">Signing in with Google...</p>}
            </>
          )}
          {googleError && <p className="google-login-error">{googleError}</p>}
        </div>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" state={planContext || undefined}>Register here</Link>
          </p>
          <p className="mt-4 text-xs">© 2026 Your Company Service Portal</p>
        </div>
        </div>

        {planContext && (
          <aside className="login-plan-context">
            <p className="plan-context-label">Selected Plan</p>
            <h3>{planContext.selectedPlan}</h3>
            <p>
              {planContext.ctaType === "try-now"
                ? "Sign in to start with this plan."
                : "Sign in to continue upgrading this plan."}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

export default Login;