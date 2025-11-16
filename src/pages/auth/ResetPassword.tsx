import React, { useEffect, useMemo, useState } from "react";
import { auth } from "../../firebase/firebaseConfig";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

const ResetPassword: React.FC = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    "verifying" | "ready" | "success" | "error"
  >("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!oobCode) {
        setError("Ungültiger Link: Es fehlt ein Code.");
        setStatus("error");
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        setEmail(email);
        setStatus("ready");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          msg.includes("expired")
            ? "Dieser Link ist abgelaufen. Fordern Sie bitte einen neuen an."
            : "Der Link ist ungültig oder wurde bereits verwendet."
        );
        setStatus("error");
      }
    };
    run();
  }, [oobCode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oobCode) {
      setError("Ungültiger Code.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Fehler beim Zurücksetzen des Passworts: " + msg);
      setStatus("error");
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
            <h1 className="login-header-title">Passwort zurücksetzen</h1>
            <p className="login-header-subtitle">
              {status === "verifying" && "Link wird überprüft …"}
              {status === "ready" &&
                (email
                  ? `Für: ${email}`
                  : "Geben Sie Ihr neues Passwort ein.")}
              {status === "error" && "Es ist ein Fehler aufgetreten."}
              {status === "success" && "Ihr Passwort wurde aktualisiert."}
            </p>
          </div>
        </div>

        {status === "ready" && (
          <form className="login-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Neues Passwort</label>
              <input
                className="form-input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Passwort bestätigen</label>
              <input
                className="form-input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button className="btn-primary" type="submit">
              Passwort setzen
            </button>
          </form>
        )}

        {status === "verifying" && <div className="login-form">Bitte warten …</div>}

        {status === "success" && (
          <div className="login-form">
            <button className="btn-primary" onClick={goToLogin}>
              Zum Login
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="login-form">
            {error && <p className="error-message">{error}</p>}
            <button className="btn-primary" onClick={goToLogin}>
              Zur Login-Seite
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
