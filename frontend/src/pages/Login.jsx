import { useState, useContext, useEffect, useRef } from "react";
import api from "../axios_instance";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/Login.css"
import { showToast } from "../utils/uiFeedback";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [resolvedGoogleClientId, setResolvedGoogleClientId] = useState("");
  const [isResolvingGoogleClientId, setIsResolvingGoogleClientId] = useState(true);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const planContext = location.state?.fromPlanCta ? location.state : null;
  const googleButtonRef = useRef(null);
  const didRenderGoogleButtonRef = useRef(false);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  const detectInstalledMobileApp = () => {
    const userAgent = (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
    const isStandaloneDisplay = typeof window !== "undefined" && (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches
    );
    const isIosStandalone = typeof window !== "undefined" && window.navigator?.standalone === true;
    const isAndroidTwa = typeof document !== "undefined" && document.referrer.startsWith("android-app://");

    return isMobileDevice && (isStandaloneDisplay || isIosStandalone || isAndroidTwa);
  };

  const useMobilePersistence = detectInstalledMobileApp();

  useEffect(() => {
    let isMounted = true;

    const resolveGoogleClientId = async () => {
      if (googleClientId) {
        if (isMounted) {
          setResolvedGoogleClientId(googleClientId);
          setIsResolvingGoogleClientId(false);
        }
        return;
      }

      try {
        const response = await api.get("auth/google-config/");
        const runtimeClientId = (response.data?.client_id || "").trim();
        if (isMounted) {
          setResolvedGoogleClientId(runtimeClientId);
        }
      } catch (error) {
        console.warn("Google config lookup failed:", error?.message || error);
      } finally {
        if (isMounted) {
          setIsResolvingGoogleClientId(false);
        }
      }
    };

    resolveGoogleClientId();

    return () => {
      isMounted = false;
    };
  }, [googleClientId]);

  const completeLogin = (authResponse) => {
    login(authResponse.access, authResponse.refresh, authResponse.user, { rememberMe });

    if (planContext?.selectedPlanId && planContext.selectedPlanId !== "STARTER") {
      navigate(planContext.redirectTo || `/payments?plan=${planContext.selectedPlanId}`);
    } else {
      navigate("/bookings");
    }
  };

  useEffect(() => {
    if (!resolvedGoogleClientId || !googleButtonRef.current) {
      return;
    }

    const initializeGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      if (!window.__dtailbaseGoogleInitialized) {
        window.google.accounts.id.initialize({
          client_id: resolvedGoogleClientId,
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
                mobile_app: useMobilePersistence,
                remember_me: rememberMe,
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
        window.__dtailbaseGoogleInitialized = true;
      }

      if (didRenderGoogleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 360,
      });
      didRenderGoogleButtonRef.current = true;
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
      didRenderGoogleButtonRef.current = false;
    };
  }, [resolvedGoogleClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("token/", { 
        email: email, 
        password: password,
        mobile_app: useMobilePersistence,
        remember_me: rememberMe,
      }); 
      
      completeLogin(res.data);
    } catch (err) {
      // This will print the EXACT reason the backend said "No"
      console.error("Login Error Details:", err.response?.data);
      
      // Check if the server is actually reachable
      if (!err.response) {
          showToast("Server is offline or CORS issue.", "error");
      } else {
          showToast(err.response.data.detail || "Invalid Email or Password", "error");
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
          {isResolvingGoogleClientId && (
            <p className="google-login-note">Loading Google sign-in...</p>
          )}
          {!isResolvingGoogleClientId && !resolvedGoogleClientId && (
            <p className="google-login-note">Google sign-in is not configured yet. Set GOOGLE_CLIENT_ID on the server or VITE_GOOGLE_CLIENT_ID in frontend build env.</p>
          )}
          {!!resolvedGoogleClientId && (
            <>
              <div ref={googleButtonRef} className="google-login-button" aria-live="polite" />
              {isGoogleLoading && <p className="google-login-note">Signing in with Google...</p>}
            </>
          )}
          {googleError && <p className="google-login-error">{googleError}</p>}
          {!!resolvedGoogleClientId && (
            <p className="google-login-note">
              If Google button fails with "origin not allowed", add this origin to Google OAuth Authorized JavaScript origins.
            </p>
          )}
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