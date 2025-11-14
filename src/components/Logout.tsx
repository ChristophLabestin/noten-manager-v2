import { useAuth } from "../context/authcontext/useAuth";
import { LogoutIcon } from "./icons";

export default function Logout() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="logout-wrapper" onClick={handleLogout}>
      <LogoutIcon size={24} />
    </div>
  );
}
