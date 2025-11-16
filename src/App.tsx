import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";
import { GradesProvider } from "./context/gradesContext";
import { useAuth } from "./context/authcontext/useAuth";
import { useEffect } from "react";
import { applyTheme, loadThemeFromStorage } from "./services/themeService";
import { useGrades } from "./context/gradesContext/useGrades";

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { compactView } = useGrades();

  useEffect(() => {
    const { theme, darkMode } = loadThemeFromStorage();
    applyTheme(theme, darkMode);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("compact-view", compactView);
  }, [compactView]);

  // iOS Safari: use inline bottom nav instead of fixed
  useEffect(() => {
    if (typeof document === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isChromeIOS = /CriOS/i.test(ua);
    const isFirefoxIOS = /FxiOS/i.test(ua);
    const isEdgeIOS = /EdgiOS/i.test(ua);
    const isSafariLike = isIOS && !isChromeIOS && !isFirefoxIOS && !isEdgeIOS;

    document.documentElement.classList.toggle("inline-bottom-nav", isSafariLike);
  }, []);

  // Fix mobile viewport height (iOS Safari keyboard / toolbar)
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const setViewportVar = () => {
      const vhSource =
        window.visualViewport?.height ?? window.innerHeight ?? 0;
      if (!vhSource) return;
      const vh = vhSource * 0.01;
      document.documentElement.style.setProperty(
        "--app-vh",
        `${vh}px`
      );
    };

    setViewportVar();

    window.addEventListener("resize", setViewportVar);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setViewportVar);
      window.visualViewport.addEventListener("scroll", setViewportVar);
    }

    return () => {
      window.removeEventListener("resize", setViewportVar);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", setViewportVar);
        window.visualViewport.removeEventListener("scroll", setViewportVar);
      }
    };
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
