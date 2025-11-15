import { navigate } from "../services/navigation";
import { BackIcon } from "./icons";

export default function BackToHome() {
  const navigateToHome = () => {
    navigate("/");
  };

  return (
    <div className="back-to-home-wrapper nav-circle" onClick={navigateToHome}>
      <BackIcon size={24} />
    </div>
  );
}
