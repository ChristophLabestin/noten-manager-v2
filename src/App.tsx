import Navigation from "./components/Navigation";
import Router from "./components/Router";
import { AuthProvider } from "./context/authcontext";

function AppContent() {
  return (
    <>
      <div className="page">
        <main style={{ position: "relative" }}>
          <Router />
          <Navigation/>
        </main>
      </div>
      <div className="footer">
        <a href="/datenschutz">Datenschutzerklärung</a>
      </div>
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
