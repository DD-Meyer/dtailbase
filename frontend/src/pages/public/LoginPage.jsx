import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../../axios_instance";
import { AuthContext } from "../../context/AuthContext";
import { showToast } from "../../utils/uiFeedback";
import PublicShell from "../../components/public/PublicShell";
import styles from "./LoginPage.module.css";

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

export default function LoginPage() {
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
  const useMobilePersistence = detectInstalledMobileApp();

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      if (googleClientId) {
        if (mounted) {
          setResolvedGoogleClientId(googleClientId);
          setIsResolvingGoogleClientId(false);
        }
        return;
      }
      try {
        const response = await api.get("auth/google-config/");
        const runtimeClientId = (response.data?.client_id || "").trim();
        if (mounted) setResolvedGoogleClientId(runtimeClientId);
      } catch (error) {
        console.warn("Google config lookup failed:", error?.message || error);
      } finally {
        if (mounted) setIsResolvingGoogleClientId(false);
      }
    };
    resolve();
    return () => { mounted = false; };
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
    if (!resolvedGoogleClientId || !googleButtonRef.current) return;

    const initialize = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

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
              setGoogleError(
                error.response?.data?.detail || "Google sign in failed. Please try again."
              );
            } finally {
              setIsGoogleLoading(false);
            }
          },
        });
        window.__dtailbaseGoogleInitialized = true;
      }

      if (didRenderGoogleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
      });
      didRenderGoogleButtonRef.current = true;
    };

    if (window.google?.accounts?.id) {
      initialize();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", initialize);
      return () => existing.removeEventListener("load", initialize);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initialize);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", initialize);
      didRenderGoogleButtonRef.current = false;
    };
  }, [resolvedGoogleClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("token/", {
        email,
        password,
        mobile_app: useMobilePersistence,
        remember_me: rememberMe,
      });
      completeLogin(res.data);
    } catch (err) {
      console.error("Login Error Details:", err.response?.data);
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
    <PublicShell showFooter={false} variant="auth">
      <section className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <span className={styles.badge}>Welcome back</span>
            <h1 className={styles.title}>Sign in to DtailBase</h1>
            <p className={styles.lede}>Enter your details to open your shop dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="login-email" className={styles.label}>Email</label>
              <input
                id="login-email"
                type="email"
                className={styles.input}
                autoComplete="username"
                placeholder="e.g. owner@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="login-pw" className={styles.label}>Password</label>
              <input
                id="login-pw"
                type="password"
                className={styles.input}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me on this device</span>
            </label>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className={styles.divider}><span>or</span></div>

          <div className={styles.google}>
            {isResolvingGoogleClientId && (
              <p className={styles.googleNote}>Loading Google sign-in…</p>
            )}
            {!isResolvingGoogleClientId && !resolvedGoogleClientId && (
              <p className={styles.googleNote}>
                Google sign-in is not configured yet.
              </p>
            )}
            {!!resolvedGoogleClientId && (
              <>
                <div ref={googleButtonRef} className={styles.googleBtn} aria-live="polite" />
                {isGoogleLoading && (
                  <p className={styles.googleNote}>Signing in with Google…</p>
                )}
              </>
            )}
            {googleError && <p className={styles.googleError}>{googleError}</p>}
          </div>

          <div className={styles.foot}>
            <p>
              Don&rsquo;t have an account?{" "}
              <Link
                to="/register"
                state={planContext || undefined}
                className={styles.footLink}
              >
                Create one
              </Link>
            </p>
            <Link to="/" className={styles.backLink}>
              &larr; Back to home
            </Link>
          </div>
        </div>

        {planContext && (
          <aside className={styles.planCtx}>
            <span className={styles.planCtxLabel}>Selected plan</span>
            <h3 className={styles.planCtxName}>{planContext.selectedPlan}</h3>
            <p className={styles.planCtxBody}>
              {planContext.ctaType === "try-now"
                ? "Sign in to start with this plan."
                : "Sign in to continue upgrading this plan."}
            </p>
          </aside>
        )}
      </section>
    </PublicShell>
  );
}
