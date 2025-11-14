import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";
import { useAuth } from "./context/authcontext/useAuth";

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
      <AppContent></AppContent>
    </AuthProvider>
  );
}

export default App;
