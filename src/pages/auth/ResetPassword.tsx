import React, { useEffect, useMemo, useState } from "react";
import { auth } from "../../firebase/firebaseConfig";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

type ActionMode = "resetPassword" | "verifyEmail" | "recoverEmail" | "unknown";
type Status = "verifying" | "ready" | "success" | "error";

const modeLabel: Record<ActionMode, string> = {
  resetPassword: "Passwort zurücksetzen",
  verifyEmail: "E-Mail bestätigen",
  recoverEmail: "E-Mail wiederherstellen",
  unknown: "Aktion prüfen",
};

const statusLabel: Record<Status, string> = {
  verifying: "Wird geprüft …",
  ready: "Bereit",
  success: "Abgeschlossen",
  error: "Fehler",
};

const ResetPassword: React.FC = () => {
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const rawMode = (searchParams.get("mode") || "").toLowerCase();
  const oobCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");

  const mode: ActionMode =
    rawMode === "resetpassword"
      ? "resetPassword"
      : rawMode === "verifyemail"
      ? "verifyEmail"
      : rawMode === "recoveremail"
      ? "recoverEmail"
      : "unknown";

  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!oobCode || mode === "unknown") {
        setError(
          "Dieser Link kann nicht verarbeitet werden. Prüfe die URL oder fordere einen neuen Link an."
        );
        setStatus("error");
        return;
      }

      try {
        if (mode === "resetPassword") {
          const mail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(mail);
          setStatus("ready");
          return;
        }

        if (mode === "verifyEmail" || mode === "recoverEmail") {
          const actionInfo = await checkActionCode(auth, oobCode);
          const mail = (actionInfo.data as { email?: string }).email ?? null;
          setEmail(mail);
          await applyActionCode(auth, oobCode);
          setStatus("success");
          return;
        }

        setError("Unbekannter Modus. Bitte fordere einen neuen Link an.");
        setStatus("error");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          msg.includes("expired")
            ? "Dieser Link ist abgelaufen. Fordere bitte einen neuen an."
            : "Der Link ist ungültig oder wurde bereits verwendet."
        );
        setStatus("error");
      }
    };
    run();
  }, [mode, oobCode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode !== "resetPassword" || !oobCode) {
      setError("Ungültiger oder fehlender Code.");
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

  const goToContinue = () => {
    if (continueUrl) {
      window.location.href = continueUrl;
      return;
    }
    goToLogin();
  };

  const isPasswordFlow = mode === "resetPassword" && status === "ready";
  const headline =
    mode === "verifyEmail"
      ? "E-Mail-Adresse bestätigen"
      : "Passwort neu setzen";
  const subline =
    mode === "verifyEmail"
      ? "Öffne diesen Schritt in Ruhe im Browser, damit deine iOS-App dich wieder erkennt."
      : "Lege ein neues Passwort für dein Konto fest. Danach kannst du dich in der iOS-App erneut anmelden.";

  return (
    <div className="auth-action">
      <div className="auth-action__background">
        <span className="auth-blob auth-blob--primary" />
        <span className="auth-blob auth-blob--secondary" />
        <span className="auth-blob auth-blob--tertiary" />
      </div>

      <div className="auth-shell">
        <div className="auth-head">
          <div className="auth-badge">
            <span className="auth-badge__glow" />
            <span className="auth-badge__icon">🔒</span>
          </div>
          <div className="auth-head__text">
            <span className="auth-chip">noten.manager iOS</span>
            <h1 className="auth-action__title">
              {mode === "verifyEmail"
                ? "E-Mail bestätigen"
                : "Zugang wiederherstellen"}
            </h1>
            <p className="auth-action__lead">{subline}</p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card__top">
            <div className={`status-pill status-pill--${status}`}>
              <span className="status-dot" />
              <span>{statusLabel[status]}</span>
            </div>
            {email && <span className="auth-tag">Für: {email}</span>}
          </div>

          <div className="auth-card__header">
            <p className="auth-eyebrow">{modeLabel[mode]}</p>
            <h2 className="auth-card__title">{headline}</h2>
            <p className="auth-card__subtitle">
              {status === "error"
                ? error ?? "Es ist ein Fehler aufgetreten."
                : status === "success" && mode === "verifyEmail"
                ? "Deine E-Mail-Adresse wurde bestätigt. Du kannst jetzt zurück zur App."
                : status === "success"
                ? "Dein neues Passwort ist gesetzt. Melde dich jetzt wieder an."
                : "Schließe den Schritt im Browser ab, damit die iOS-App deinen Zugang erkennt."}
            </p>
          </div>

          {isPasswordFlow && (
            <form className="auth-form" onSubmit={onSubmit}>
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
              <button className="btn-primary auth-primary" type="submit">
                Passwort setzen
              </button>
            </form>
          )}

          {status === "verifying" && (
            <div className="auth-form">
              <p className="info-message">Link wird überprüft …</p>
            </div>
          )}

          {status === "success" && (
            <div className="auth-form auth-form--center">
              <button className="btn-primary auth-primary" onClick={goToContinue}>
                Zur App / zum Login
              </button>
              <p className="info-message">
                Falls die App noch geöffnet ist, starte sie einmal neu.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="auth-form auth-form--center">
              {error && <p className="error-message">{error}</p>}
              <div className="auth-actions">
                <button className="btn-primary auth-primary" onClick={goToLogin}>
                  Zur Login-Seite
                </button>
                <button
                  className="btn-secondary auth-secondary"
                  onClick={() => (window.location.href = "/passwort-vergessen")}
                >
                  Neuen Link anfordern
                </button>
              </div>
            </div>
          )}

          <div className="auth-divider" />

          <div className="auth-footnotes">
            <div className="auth-footnote">
              <span className="auth-dot" />
              <p>
                Nutze denselben Account wie in der iOS-App. Dieser Schritt
                funktioniert auch ohne, dass du eingeloggt bist.
              </p>
            </div>
            <div className="auth-footnote">
              <span className="auth-dot" />
              <p>
                Öffne den Link nur auf vertrauenswürdigen Geräten. Bei Fragen:
                support@noten-manager.app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
