import { useState, useContext, useEffect } from "react";
import api from "../axios_instance";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/Login.css"; 
import { countryOptions, getCountryLabel } from "../utils/countries";

const getCurrencyForCountry = (countryCode) => (countryCode === "ZA" ? "ZAR" : "USD");

function Register() {
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

  const [detectedCountryCode, setDetectedCountryCode] = useState("US");
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    country_code: "US",
    currency: "USD",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const planContext = location.state?.fromPlanCta ? location.state : null;

  useEffect(() => {
    let isMounted = true;

    const getBrowserCountryFallback = () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const locale = navigator.language || "";

      if (timezone === "Africa/Johannesburg" || locale.toUpperCase().endsWith("-ZA")) {
        return { country_code: "ZA", currency: "ZAR" };
      }

      return { country_code: "US", currency: "USD" };
    };

    const detectCountryAndCurrency = async () => {
      try {
        const response = await api.get("payments/plans/");
        const detectedCountry = (response.data?.country_code || "US").toUpperCase();
        const detectedCurrency = (response.data?.currency || "USD").toUpperCase();
        const browserFallback = getBrowserCountryFallback();

        const normalizedCountry =
          detectedCountry === "US" && browserFallback.country_code === "ZA"
            ? "ZA"
            : detectedCountry;

        const normalizedCurrency =
          normalizedCountry === "ZA" ? "ZAR" : (detectedCurrency || "USD");

        if (isMounted) {
          setDetectedCountryCode(normalizedCountry);
          setFormData((prev) => ({
            ...prev,
            country_code: normalizedCountry,
            currency: normalizedCurrency,
          }));
        }
      } catch {
        const browserFallback = getBrowserCountryFallback();
        if (isMounted) {
          setDetectedCountryCode(browserFallback.country_code);
          setFormData((prev) => ({
            ...prev,
            country_code: browserFallback.country_code,
            currency: browserFallback.currency,
          }));
        }
      }
    };

    detectCountryAndCurrency();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      // 1. Create the account with auto-assigned company
      const res = await api.post("users/", {
        company_name: formData.company_name,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        password: formData.password,
        country_code: formData.country_code,
        currency: formData.currency,
        role: "OWNER" 
      });

      if (res.status === 201) {
        // 2. Auto-login immediately after registration
        const loginRes = await api.post("token/", {
          email: formData.email,
          password: formData.password,
          mobile_app: useMobilePersistence,
          remember_me: true,
        });

        login(loginRes.data.access, loginRes.data.refresh, loginRes.data.user);

        if (planContext?.selectedPlanId && planContext.selectedPlanId !== "STARTER") {
          navigate(planContext.redirectTo || `/payments?plan=${planContext.selectedPlanId}`);
        } else {
          navigate("/bookings");
        }
      }
    } catch (err) {
      console.error("Registration Error:", err.response?.data);
      const data = err.response?.data;
      
      // Pulling the first specific error message from the server
      const firstError = data ? Object.values(data).flat()[0] : "Registration failed";
      setErrorMessage(firstError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <Link to="/" className="auth-back-link" aria-label="Back to home">
          &larr; Back to home
        </Link>

        <div className="login-header">
          <h1>Create Account</h1>
          <p>Join the platform to get started</p>
        </div>

        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Country</label>
            <select
              value={formData.country_code}
              onChange={(e) => {
                const selectedCountry = e.target.value;
                const selectedCurrency = getCurrencyForCountry(selectedCountry);

                setFormData((prev) => ({
                  ...prev,
                  country_code: selectedCountry,
                  currency: selectedCurrency,
                }));
              }}
            >
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} ({option.code})
                </option>
              ))}
            </select>
            <p className="auth-meta-note">
              Detected location: {getCountryLabel(detectedCountryCode)} ({detectedCountryCode})
            </p>
            <p className="auth-meta-note">Billing currency: {formData.currency}</p>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Register Account"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" state={planContext || undefined}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;