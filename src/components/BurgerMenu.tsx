import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import backIcon from "../assets/back.svg";
import blackBackIcon from "../assets/back-black.svg";
import type { UserProfile } from "../interfaces/UserProfile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

interface BurgerMenuProps {
  backToHome?: boolean;
}

const BurgerMenu: React.FC<BurgerMenuProps> = (props) => {
  const { user, logout } = useAuth();

  const [greeting, setGreeting] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    await logout();
    window.history.pushState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  useEffect(() => {
    const date = new Date();
    const hours = date.getHours();

    if (hours >= 6 && hours < 11) {
      setGreeting("Guten Morgen");
    } else if (hours >= 11 && hours < 17) {
      setGreeting("Hallo");
    } else if (hours >= 17 && hours < 22) {
      setGreeting("Guten Abend");
    } else {
      setGreeting("Gute Nacht");
    }
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const user = userDocSnap.data() as UserProfile;
          setUserProfile(user);
          if (user.lightmode) {
            setIsLightMode(user.lightmode);
            document.body.classList.add("lightmode");
          } else {
            setIsLightMode(user.lightmode || false);
            document.body.classList.remove("lightmode");
          }
        } else {
          console.log("Keine Benutzerdaten gefunden.");
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <div
      className={
        props.backToHome
          ? "burger-menu-wrapper with-back"
          : "burger-menu-wrapper"
      }
    >
      {props.backToHome && (
        <a href="/home" className="back-to-home">
          {!isLightMode ? (
            <img src={backIcon} alt="Zurück zur Startseite" />
          ) : (
            <img src={blackBackIcon} alt="Zurück zur Startseite" />
          )}
          Startseite
        </a>
      )}
      {!props.backToHome && (
        <h1 className="nav-greeting">
          {greeting}, <br />
          {user?.displayName
            ? `${user.displayName}`
            : userProfile
            ? `${userProfile.name}`
            : ""}
          !
        </h1>
      )}
      {/* Burger-Icon */}
      <div
        className={`burger-icon ${isOpen ? "open" : ""}`}
        onClick={toggleMenu}
      >
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div>

      {/* Menü */}
      <div
        className={isOpen ? "menu-overlay open" : "menu-overlay"}
        onClick={toggleMenu}
      ></div>
      <div className={isOpen ? "menu open" : "menu"}>
        <ul>
          <li>
            <a href="/home">Startseite</a>
          </li>
          <li>
            <a href="/overview">Notenübersicht</a>
          </li>
          <li>
            <a href="/subjects">Neues Fach</a>
          </li>
          <li>
            <a href="/new-entry">Neue Note</a>
          </li>
          <li>
            <a href="/edit-subjects">Fächer bearbeiten</a>
          </li>
          <li>
            <a href="/edit-grades">Noten bearbeiten</a>
          </li>
        </ul>
        <ul>
          <li>
            <a href="/settings">Einstellungen</a>
          </li>
          <li>
            <a onClick={handleLogout}>Logout</a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BurgerMenu;
