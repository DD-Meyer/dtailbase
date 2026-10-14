import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../../axios_instance";
import { AuthContext } from "../../context/AuthContext";
import PublicShell from "../../components/public/PublicShell";
import styles from "./LoginPage.module.css";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef(null);
  const submittingRef = useRef(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [resolvedGoogleClientId, setResolvedGoogleClientId] = useState("");
  const [isResolvingGoogleClientId, setIsResolvingGoogleClientId] = useState(true);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const planContext = location.state?.fromPlanCta || location.state?.returnAfterAuth ? location.state : null;
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
    navigate(getAuthDestination(planContext));
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
        shape: "rectangular",
        width: Math.min(320, Math.floor(googleButtonRef.current.clientWidth)),
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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMessage("");
    setIsLoading(true);
    try {
      const res = await api.post("token/", {
        email: email.trim().toLowerCase(),
        password,
        mobile_app: useMobilePersistence,
        remember_me: rememberMe,
      });
      completeLogin(res.data);
    } catch (err) {
      console.error("Login Error Details:", err.response?.data);
      setErrorMessage(err.response
        ? "Unable to sign in. Check your email and password and try again."
        : "Unable to connect. Please check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (errorMessage) errorRef.current?.focus();
  }, [errorMessage, isLoading]);

  return (
    <PublicShell marketing showFooter={false} variant="auth">
      <section className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <h1 className={styles.title}>Sign in to DtailBase</h1>
            <p className={styles.lede}>Welcome back. Open your shop dashboard.</p>
          </div>

          {planContext?.fromPlanCta && <p className={styles.planCtx}>
            Selected plan: <strong>{planContext.selectedPlan}</strong>
          </p>}
          {errorMessage && <p ref={errorRef} tabIndex={-1} role="alert" className={styles.errorBanner}>{errorMessage}</p>}

          <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
            <div className={styles.field}>
              <label htmlFor="login-email" className={styles.label}>Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
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
              <PasswordInput
                id="login-pw"
                name="password"
                className={styles.input}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles.options}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" state={planContext || undefined} className={`${styles.footLink} ${styles.recoveryLink}`}>Forgot password?</Link>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || isGoogleLoading}
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
            {googleError && <p className={styles.googleError} role="alert">{googleError}</p>}
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

      </section>
    </PublicShell>
  );
}
