import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../../axios_instance";
import { AuthContext } from "../../context/AuthContext";
import { getCountryLabel } from "../../utils/countries";
import PublicShell from "../../components/public/PublicShell";
import styles from "./RegisterPage.module.css";
import PasswordInput from "../../components/public/PasswordInput";
import { getAuthDestination } from "../../utils/authNavigation";

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
  const [step, setStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [accountCreated, setAccountCreated] = useState(false);
  const submittingRef = useRef(false);
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const errorRef = useRef(null);
  const focusTarget = useRef(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const planContext = location.state?.fromPlanCta || location.state?.returnAfterAuth ? location.state : null;

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

  useEffect(() => {
    if (isLoading || !focusTarget.current) return;
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === "heading") headingRef.current?.focus();
    else if (target === "error") errorRef.current?.focus();
    else formRef.current?.elements.namedItem(target)?.focus();
  }, [step, fieldErrors, errorMessage, accountCreated, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || accountCreated) return;
    if (step === 1) {
      setErrorMessage("");
      setFieldErrors({});
      focusTarget.current = "heading";
      setStep(2);
      return;
    }
    submittingRef.current = true;
    setErrorMessage("");
    setFieldErrors({});
    setIsLoading(true);
    let created = false;
    try {
      const res = await api.post("users/", {
        company_name: formData.company_name,
        email: formData.email.trim().toLowerCase(),
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        password: formData.password,
        role: "OWNER",
      });

      if (res.status !== 201) throw new Error("Unexpected registration response");
      created = true;
      const loginRes = await api.post("token/", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        mobile_app: useMobilePersistence,
        remember_me: true,
      });
      login(loginRes.data.access, loginRes.data.refresh, loginRes.data.user);

      navigate(getAuthDestination(planContext));
    } catch (err) {
      console.error("Registration Error:", err.response?.data);
      if (created) {
        setAccountCreated(true);
        setErrorMessage("Your workspace was created, but automatic sign-in failed. Sign in with your new account to continue.");
        focusTarget.current = "error";
        return;
      }
      const data = err.response?.data;
      const fields = {};
      const general = [];
      const apiNames = { email: "email", username: "username", password: "password", first_name: "firstName", last_name: "lastName", company_name: "company_name" };
      if (data && typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
          const message = (Array.isArray(value) ? value : [value])
            .filter((item) => typeof item === "string").join(" ");
          if (!message) continue;
          if (apiNames[key]) fields[apiNames[key]] = message;
          else general.push(message);
        }
      }
      const invalidField = ["email", "username", "password", "firstName", "lastName", "company_name"].find((key) => fields[key]);
      setFieldErrors(fields);
      if (invalidField) {
        setStep(["email", "username", "password"].includes(invalidField) ? 1 : 2);
        focusTarget.current = invalidField;
      } else {
        focusTarget.current = "error";
      }
      setErrorMessage(general.join(" ") || (invalidField
        ? "Please check the highlighted details."
        : "Unable to create your workspace. Please try again."));
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  const update = (key) => (e) => {
    setFormData((p) => ({ ...p, [key]: e.target.value }));
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const renderField = (key, label, options = {}) => {
    const Input = key === "password" ? PasswordInput : "input";
    return (
      <div className={styles.field} key={key}>
        <label className={styles.label} htmlFor={`reg-${key}`}>{label}</label>
        <Input
          id={`reg-${key}`}
          name={key}
          className={styles.input}
          type="text"
          {...options}
          value={formData[key]}
          onChange={update(key)}
          aria-invalid={fieldErrors[key] ? true : undefined}
          aria-describedby={fieldErrors[key] ? `reg-${key}-error` : undefined}
          required
        />
        {fieldErrors[key] && <p id={`reg-${key}-error`} className={styles.fieldError}>{fieldErrors[key]}</p>}
      </div>
    );
  };

  return (
    <PublicShell marketing showFooter={false} variant="auth">
      <section className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <span className={styles.step} data-step={step} role="status">Step {step} of 2 · {step === 1 ? "Account details" : "Workspace details"}</span>
            <h1 ref={headingRef} tabIndex={-1} className={styles.title}>{accountCreated ? "Your workspace is ready" : step === 1 ? "Create your account" : "Set up your workspace"}</h1>
            <p className={styles.lede}>
              {accountCreated ? "Sign in to finish getting started." : step === 1 ? "Your shop, organised. Start for free." : "A few details to make it yours."}
            </p>
          </div>

          {planContext?.fromPlanCta && <p className={styles.planCtx}>Selected plan: <strong>{planContext.selectedPlan}</strong></p>}
          {errorMessage && (
            <p ref={errorRef} tabIndex={-1} role="alert" className={styles.errorBanner}>{errorMessage}</p>
          )}

          {accountCreated ? (
            <Link className={styles.submitBtn} to="/login" state={planContext || undefined}>Continue to sign in</Link>
          ) : <form ref={formRef} onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
            {step === 1 ? <>
              {renderField("email", "Email", { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false, placeholder: "name@example.com" })}
              {renderField("username", "Username", { autoComplete: "username", autoCapitalize: "none", spellCheck: false, placeholder: "Choose a username" })}
              {renderField("password", "Password", { autoComplete: "new-password", placeholder: "Create a password" })}
            </> : <>
              <div className={styles.row}>
                {renderField("firstName", "First name", { autoComplete: "given-name", placeholder: "Alex" })}
                {renderField("lastName", "Last name", { autoComplete: "family-name", placeholder: "Taylor" })}
              </div>
              {renderField("company_name", "Company name", { autoComplete: "organization", placeholder: "Your shop name" })}
              <details className={styles.meta}>
                <summary>{getCountryLabel(formData.country_code)} · {formData.currency} billing</summary>
                <p>Detected as {getCountryLabel(detectedCountryCode)}. You can change your billing region later from Settings.</p>
              </details>
            </>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? "Creating your workspace…" : step === 1 ? "Continue" : "Create workspace"}
            </button>
            {step === 2 && <button type="button" className={styles.backButton} disabled={isLoading} onClick={() => {
              focusTarget.current = "heading";
              setErrorMessage("");
              setStep(1);
            }}>← Back to account details</button>}
          </form>}

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
