import React, { useEffect, useState } from "react";
import {
  handleGoogleRedirectLogin,
  loginUser,
  loginUserWithGoogle,
} from "../../firebase/auth";
import { useAuth } from "../../context/authcontext/useAuth";
import googleIcon from "../../assets/google-icon.svg";

const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSigningIn) {
      setIsSigningIn(true);
      try {
        await loginUser(email, password, rememberMe);
        // Weiterleiten nach erfolgreichem Login
        window.history.pushState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.message.includes("auth/invalid-credential")) {
            setError(
              "Fehler bei der Anmeldung: Ungültige Anmeldeinformationen. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort. " +
                error.message
            );
          } else {
            setError(
              "Fehler bei der Anmeldung. Bitte versuchen Sie es später erneut. " +
                error.message
            );
          }
        } else {
          setError("Ein unbekannter Fehler ist aufgetreten.");
        }
        setIsSigningIn(false);
      }
    }
  };

  const onGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSigningIn) {
      setIsSigningIn(true);
      try {
        const result = await loginUserWithGoogle(rememberMe);
        // Bei Popup-Flow direkt weiterleiten, beim Redirect-Flow übernimmt Firebase
        if (result) {
          window.history.pushState({}, "", "/");
          window.dispatchEvent(new PopStateEvent("popstate"));
          setIsSigningIn(false);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          // Fehlerbehandlung
          setError(
            "Fehler bei der Anmeldung mit Google. Bitte versuchen Sie es später erneut. " +
              error.message
          );
        }
        setIsSigningIn(false);
      }
    }
  };

  const redirectToRegister = () => {
    window.history.pushState({}, "", "/register");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  useEffect(() => {
    if (isAuthenticated) {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Redirect-Ergebnis (z. B. iOS-PWA) auswerten
    void (async () => {
      try {
        const result = await handleGoogleRedirectLogin();
        if (result) {
          window.history.pushState({}, "", "/");
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(
            "Fehler bei der Anmeldung mit Google. Bitte versuchen Sie es später erneut. " +
              error.message
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-header-text">
            <h1 className="login-header-title">
              Account anmelden
            </h1>
            <p className="login-header-subtitle">
              Melde dich mit deinen Zugangsdaten an.
            </p>
          </div>
        </div>
        <div className="login-tabs">
          <button
            type="button"
            className="login-tab login-tab--active"
          >
            Login
          </button>
          <button
            type="button"
            className="login-tab"
            onClick={redirectToRegister}
          >
            Registrieren
          </button>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email:</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="example@email.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort:</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="********"
            />
          </div>
          <div className="login-form-footer">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberMeChange}
              />
              Eingeloggt bleiben
            </label>
            <button
              type="button"
              className="login-forgot-link"
              onClick={(event) => event.preventDefault()}
            >
              Passwort vergessen?
            </button>
          </div>
          <button className="btn-primary" type="submit">
            Login
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        <div className="login-divider">
          <span>oder weiter mit</span>
        </div>
        <form className="google-login-form" onSubmit={onGoogleLogin}>
          <button className="google-login-button" type="submit">
            <img src={googleIcon} alt="Google Logo 24px" />
            mit Google anmelden
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
