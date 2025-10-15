import logoutIcon from "../assets/logout.svg";
import { useAuth } from "../context/authcontext/useAuth";

export default function Logout() {
    const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className="logout-wrapper" onClick={handleLogout}>
        <img src={logoutIcon}/>
    </div>
  );
}
