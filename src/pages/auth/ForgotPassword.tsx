import React, { useEffect, useState } from "react";
import { resetPassword } from "../../firebase/auth";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const COOLDOWN_SECONDS = 60;
  const storageKey = "forgotPasswordCooldownUntil";
  const [cooldown, setCooldown] = useState<number>(0);

  // initialize cooldown from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    let initial = 0;
    if (stored) {
      const until = parseInt(stored, 10);
      if (!Number.isNaN(until)) {
        const diff = Math.ceil((until - Date.now()) / 1000);
        initial = diff > 0 ? diff : 0;
      }
    }
    setCooldown(initial);
  }, []);

  // tick down when cooldown active
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) {
      setError(`Bitte warte ${cooldown}s, bevor du es erneut versuchst.`);
      return;
    }
    if (!email) {
      setError("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }
    setIsSending(true);
    setError(null);
    setMessage(null);
    try {
      await resetPassword(email);
      setMessage(
        "Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet."
      );
      // start cooldown
      const until = Date.now() + COOLDOWN_SECONDS * 1000;
      localStorage.setItem(storageKey, String(until));
      setCooldown(COOLDOWN_SECONDS);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Fehler beim Senden der E-Mail: " + msg);
    } finally {
      setIsSending(false);
    }
  };

  const goToLogin = () => {
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-header-text">
            <h1 className="login-header-title">Passwort vergessen</h1>
            <p className="login-header-subtitle">
              Gib deine E-Mail-Adresse ein, um einen Link zum Zurücksetzen des Passworts zu erhalten.
            </p>
          </div>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Email:</label>
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          {cooldown > 0 && (
            <p className="info-message">Erneut senden möglich in {cooldown}s</p>
          )}
          <button
            className="btn-primary"
            type="submit"
            disabled={isSending || cooldown > 0}
          >
            {isSending ? "Senden …" : cooldown > 0 ? `Warten (${cooldown}s)` : "E-Mail senden"}
          </button>
        </form>
        <div className="login-form" style={{ marginTop: 12 }}>
          <button className="login-forgot-link" onClick={goToLogin}>
            Zurück zum Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
