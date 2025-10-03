import React, { useEffect, useState } from "react";
import { registerUser } from "../../firebase/auth";
import { useAuth } from "../../context/authcontext/useAuth";

const Register: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    if (!isRegistering) {
      setIsRegistering(true);
      try {
        await registerUser(email, password, name);
      } catch (error) {
        setError("Fehler bei der Registrierung: " + (error as Error).message);
        setIsRegistering(false);
      }
    }
  };

  const redirectToLogin = () => {
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  useEffect(() => {
    if (isAuthenticated) {
      window.history.pushState({}, "", "/home");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isAuthenticated]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Register</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Anzeigename:</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="form-input"
              placeholder="Name"
              required
              name="name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail:</label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              className="form-input"
              placeholder="example@email.com"
              required
              name="email"
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
              required
              name="password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort bestätigen:</label>
            <input
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="********"
              required
              name="confirm-password"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={isRegistering}
          >
            {isRegistering ? "Registriere..." : "Registrieren"}
          </button>
        </form>
        <div className="login-links-wrapper">
          <p>
            Schon registriert?{" "}
            <a
              className="register-link"
              href="/login"
              onClick={redirectToLogin}
            >
              Login
            </a>
          </p>
        </div>
        {error && <p>{error}</p>}
      </div>
    </div>
  );
};

export default Register;
