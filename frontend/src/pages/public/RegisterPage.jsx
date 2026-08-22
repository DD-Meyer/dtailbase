import { useState, useContext, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../../axios_instance";
import { AuthContext } from "../../context/AuthContext";
import { getCountryLabel } from "../../utils/countries";
import PublicShell from "../../components/public/PublicShell";
import styles from "./RegisterPage.module.css";

function detectInstalledMobileApp() {
  const userAgent =
    (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
  const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const isStandaloneDisplay =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches);
  const isIosStandalone =
    typeof window !== "undefined" && window.navigator?.standalone === true;
  const isAndroidTwa =
    typeof document !== "undefined" &&
    document.referrer.startsWith("android-app://");
  return isMobileDevice && (isStandaloneDisplay || isIosStandalone || isAndroidTwa);
}

export default function RegisterPage() {
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
    let mounted = true;

    const getBrowserFallback = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const loc = navigator.language || "";
      if (tz === "Africa/Johannesburg" || loc.toUpperCase().endsWith("-ZA")) {
        return { country_code: "ZA", currency: "USD" };
      }
      return { country_code: "US", currency: "USD" };
    };

    const detect = async () => {
      try {
        const response = await api.get("payments/plans/");
        const detected = (response.data?.country_code || "US").toUpperCase();
        const currency = (response.data?.currency || "USD").toUpperCase();
        const fb = getBrowserFallback();
        const normalizedCountry =
          detected === "US" && fb.country_code === "ZA" ? "ZA" : detected;
        if (mounted) {
          setDetectedCountryCode(normalizedCountry);
          setFormData((p) => ({
            ...p,
            country_code: normalizedCountry,
            currency: currency || "USD",
          }));
        }
      } catch {
        const fb = getBrowserFallback();
        if (mounted) {
          setDetectedCountryCode(fb.country_code);
          setFormData((p) => ({
            ...p,
            country_code: fb.country_code,
            currency: fb.currency,
          }));
        }
      }
    };

    detect();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
    try {
      const res = await api.post("users/", {
        company_name: formData.company_name,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        password: formData.password,
        role: "OWNER",
      });

      if (res.status === 201) {
        const loginRes = await api.post("token/", {
          email: formData.email,
          password: formData.password,
          mobile_app: useMobilePersistence,
          remember_me: true,
        });
        login(loginRes.data.access, loginRes.data.refresh, loginRes.data.user);

        if (planContext?.selectedPlanId && planContext.selectedPlanId !== "STARTER") {
          navigate(
            planContext.redirectTo || `/payments?plan=${planContext.selectedPlanId}`
          );
        } else {
          navigate("/bookings");
        }
      }
    } catch (err) {
      console.error("Registration Error:", err.response?.data);
      const data = err.response?.data;
      const firstError = data
        ? Object.values(data).flat()[0]
        : "Registration failed";
      setErrorMessage(firstError);
    } finally {
      setIsLoading(false);
    }
  };

  const update = (key) => (e) =>
    setFormData((p) => ({ ...p, [key]: e.target.value }));

  return (
    <PublicShell showFooter={false} variant="auth">
      <section className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <span className={styles.badge}>Create account</span>
            <h1 className={styles.title}>Start your free trial</h1>
            <p className={styles.lede}>
              14-day free trial &middot; No card required &middot; Cancel anytime.
            </p>
          </div>

          {errorMessage && (
            <div className={styles.errorBanner}>{errorMessage}</div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-company">
                Company name
              </label>
              <input
                id="reg-company"
                className={styles.input}
                type="text"
                placeholder="e.g. Detailz Pro"
                value={formData.company_name}
                onChange={update("company_name")}
                required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-first">
                  First name
                </label>
                <input
                  id="reg-first"
                  className={styles.input}
                  type="text"
                  placeholder="Alex"
                  value={formData.firstName}
                  onChange={update("firstName")}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-last">
                  Last name
                </label>
                <input
                  id="reg-last"
                  className={styles.input}
                  type="text"
                  placeholder="Detailer"
                  value={formData.lastName}
                  onChange={update("lastName")}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-user">
                Username
              </label>
              <input
                id="reg-user"
                className={styles.input}
                type="text"
                placeholder="Choose a username"
                value={formData.username}
                onChange={update("username")}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
                className={styles.input}
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={update("email")}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-pw">
                Password
              </label>
              <input
                id="reg-pw"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={update("password")}
                required
              />
            </div>

            <div className={styles.meta}>
              <p>
                <strong>Country:</strong>{" "}
                {getCountryLabel(formData.country_code)} (
                {formData.country_code})
              </p>
              <p>
                <strong>Billing:</strong> {formData.currency}
              </p>
              <p className={styles.metaHint}>
                Detected as {getCountryLabel(detectedCountryCode)}. You can
                change your billing region later from Settings.
              </p>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? "Creating your workspace…" : "Create account"}
            </button>
          </form>

          <div className={styles.foot}>
            <p>
              Already have an account?{" "}
              <Link
                to="/login"
                state={planContext || undefined}
                className={styles.footLink}
              >
                Sign in
              </Link>
            </p>
            <Link to="/" className={styles.backLink}>
              &larr; Back to home
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
