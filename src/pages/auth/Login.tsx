import React, { useEffect, useState } from "react";
import { loginUser, loginUserWithGoogle } from "../../firebase/auth";
import { useAuth } from "../../context/authcontext/useAuth";
import googleIcon from "../../assets/google-icon.svg";

const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSigningIn) {
      setIsSigningIn(true);
      try {
        await loginUser(email, password);
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
        await loginUserWithGoogle();
        // Weiterleiten nach erfolgreichem Google-Login
        window.history.pushState({}, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (error: unknown) {
        if (error instanceof Error) {
          // Fehlerbehandlung
          setError(
            "Fehler bei der Anmeldung mit Google. Bitte versuchen Sie es später erneut. " +
              error.message
          );
          setIsSigningIn(false);
        }
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

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
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
          <button className="login-button" type="submit">
            Login
          </button>
        </form>
        <div className="login-divider"></div>
        <form className="google-login-form" onSubmit={onGoogleLogin}>
          <button className="google-login-button" type="submit">
            <img src={googleIcon} alt="Google Logo 24px" />
            Login with Google
          </button>
        </form>
        <div className="login-links-wrapper">
          <p>
            <a className="forgot-password-link" href="/reset-password">
              Passwort vergessen?
            </a>
          </p>
          <p>
            Noch keinen Account?{" "}
            <a
              className="register-link"
              href="/register"
              onClick={redirectToRegister}
            >
              Registrieren
            </a>
          </p>
        </div>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
