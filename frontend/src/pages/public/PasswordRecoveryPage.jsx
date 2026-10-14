import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../axios_instance";
import PublicShell from "../../components/public/PublicShell";
import PasswordInput from "../../components/public/PasswordInput";
import styles from "./LoginPage.module.css";

export default function PasswordRecoveryPage() {
  const location = useLocation();
  const resetting = location.pathname === "/reset-password";
  const [link] = useState(() => {
    const [uid, token] = window.location.hash.slice(1).split("/");
    return { uid, token };
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (resetting) window.history.replaceState(window.history.state, "", "/reset-password");
  }, [resetting]);
  const validLink = !resetting || Boolean(link.uid && link.token);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (resetting && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = resetting
        ? await api.post("auth/password-reset/confirm/", {
          uid: link.uid, token: link.token, password, password_confirm: confirmation,
        })
        : await api.post("auth/password-reset/", { email });
      const detail = response.data?.detail;
      if (typeof detail !== "string" || !detail.trim()) {
        throw new Error("Invalid password recovery response");
      }
      setMessage(detail);
      setPassword("");
      setConfirmation("");
    } catch (failure) {
      const data = failure.response?.data;
      const messages = data && typeof data === "object"
        ? Object.values(data).flat().filter((value) => typeof value === "string")
        : [];
      setError(messages.join(" ") || "Password recovery is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell marketing variant="auth" showFooter={false}>
      <section className={styles.page}>
        <div className={styles.card}>
          <div className={styles.head}>
            <h1 className={styles.title}>{resetting ? "Choose a new password" : "Forgot your password?"}</h1>
            <p className={styles.lede}>{resetting ? "Use a strong password you have not used elsewhere." : "Enter your account email to request a reset link."}</p>
          </div>
          {!validLink && <p role="alert">This reset link is incomplete. Request a new link below.</p>}
          {error && <p className={styles.googleError} role="alert">{error}</p>}
          {message ? <p role="status">{message}</p> : validLink && (
            <form className={styles.form} onSubmit={submit}>
              {!resetting ? (
                <div className={styles.field}>
                  <label htmlFor="recovery-email" className={styles.label}>Email</label>
                  <input id="recovery-email" type="email" autoComplete="email" required
                    className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              ) : (
                <>
                  <div className={styles.field}>
                    <label htmlFor="reset-password" className={styles.label}>New password</label>
                    <PasswordInput id="reset-password" autoComplete="new-password" required minLength={8} maxLength={128}
                      className={styles.input} value={password} onChange={(event) => setPassword(event.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="reset-confirm" className={styles.label}>Confirm new password</label>
                    <PasswordInput id="reset-confirm" autoComplete="new-password" required minLength={8} maxLength={128}
                      className={styles.input} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                  </div>
                </>
              )}
              <button type="submit" className={styles.submitBtn} disabled={busy}>
                {busy ? "Please wait..." : resetting ? "Update password" : "Request reset link"}
              </button>
            </form>
          )}
          {resetting && <Link to="/forgot-password" className={styles.footLink}>Request a new reset link</Link>}
          <Link to="/login" state={location.state} className={styles.footLink}>Back to sign in</Link>
        </div>
      </section>
    </PublicShell>
  );
}
