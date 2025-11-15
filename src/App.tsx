import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";
import { GradesProvider } from "./context/gradesContext";
import { useAuth } from "./context/authcontext/useAuth";
import { useEffect } from "react";
import { applyTheme, loadThemeFromStorage } from "./services/themeService";

function AppContent() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const { theme, darkMode } = loadThemeFromStorage();
    applyTheme(theme, darkMode);
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    if (isAuthenticated) {
      root.classList.add("has-bottom-nav");
    } else {
      root.classList.remove("has-bottom-nav");
    }
  }, [isAuthenticated]);

  return (
    <div className="page">
      <main style={{ position: "relative" }}>
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <GradesProvider>
        <AppContent />
      </GradesProvider>
    </AuthProvider>
  );
}

export default App;
