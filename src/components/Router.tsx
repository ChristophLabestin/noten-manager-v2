import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import Login from "../pages/auth/Login";
import Home from "../pages/Home";
import SubjectsPage from "../pages/Subjects";
import SubjectDetailPage from "../pages/SubjectDetail";

const routes: { [key: string]: () => React.JSX.Element } = {
  "/login": () => <Login />,
  "/": () => (
    <PrivateRoute>
      <Home />
    </PrivateRoute>
  ),
  "/fach": () => (
    <PrivateRoute>
      <SubjectsPage />
    </PrivateRoute>
  ),
  "/fach/:id": () => {
    const subjectId = window.location.pathname.split("/")[2];
    return (
      <PrivateRoute>
        <SubjectDetailPage subjectId={subjectId} />
      </PrivateRoute>
    );
  },
};

const PrivateRoute = ({ children }: { children: React.JSX.Element }) => {
  const { isAuthenticated } = useAuth(); // Authentifizierungsstatus prüfen

  return isAuthenticated ? children : <NavigateToLogin />;
};

const NavigateToLogin = () => {
  useEffect(() => {
    window.history.pushState({}, "", "/login"); // Navigiere zur Login-Seite
  }, []);
  return <Login />;
};

const Router: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const renderRoute = () => {
    const route = Object.keys(routes).find((route) => {
      // Wenn der Pfad eine dynamische Route ist, wie z.B. '/season/:seasonId/race/:id'
      if (route.includes(":")) {
        const regexRoute = route.replace(/:[^\s/]+/g, "([\\w-]+)");
        const regex = new RegExp(`^${regexRoute}$`);
        return regex.test(currentPath);
      }
      return route === currentPath;
    });

    return route ? routes[route]() : <div>404 - Page not found</div>;
  };

  return <>{renderRoute()}</>;
};

export default Router;
