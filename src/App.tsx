// import CookieBanner from "./components/CookieBanner";
import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";
import { CookieConsentProvider } from "./context/cookieContext";
import { DarkModeProvider } from "./context/darkModeContext";
// import { useAuth } from './context/authcontext/useAuth';
import { useDarkMode } from "./context/darkModeContext/useDarkMode";

function AppContent() {
  // const { isAuthenticated, user } = useAuth();
  const { isDarkMode } = useDarkMode();

  return (
    <div className={`page ${isDarkMode ? "dark" : ""}`}>
      {/* {isAuthenticated && (
        <div className="sidebar">
          <Nav userId={userId || ""} />
        </div>
      )} */}
      <main style={{ position: "relative" }}>
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CookieConsentProvider>
        <DarkModeProvider>
          <AppContent></AppContent>
          {/* <CookieBanner></CookieBanner> */}
        </DarkModeProvider>
      </CookieConsentProvider>
    </AuthProvider>
  );
}

export default App;
