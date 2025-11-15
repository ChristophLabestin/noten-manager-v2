import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";
import { useAuth } from "./context/authcontext/useAuth";
import { GradesProvider } from "./context/gradesContext";

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <div className="page">
        <main style={{ position: "relative" }}>
          <Router />
        </main>
      </div>
      {!isAuthenticated && (
        <div className="footer">
          <a href="/datenschutz">Datenschutzerklärung</a>
        </div>
      )}
    </>
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
