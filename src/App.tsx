import CookieBanner from "./components/CookieBanner";
import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";
import { CookieConsentProvider } from "./context/cookieContext";

function AppContent() {
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
      <CookieConsentProvider>
        <AppContent></AppContent>
        <CookieBanner></CookieBanner>
      </CookieConsentProvider>
    </AuthProvider>
  );
}

export default App;
