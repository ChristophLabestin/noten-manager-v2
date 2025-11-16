import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { UserProfile } from "../interfaces/UserProfile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Logout from "./Logout";
import BackToHome from "./BackToHome";
import { applyTheme, saveThemeToStorage } from "../services/themeService";

interface BurgerMenuProps {
  isSmall?: boolean;
  title?: string;
  subjectType?: number;
  subtitle?: string;
}

function BurgerMenu({ isSmall, title, subjectType, subtitle }: BurgerMenuProps) {
  const { user } = useAuth();

  const [greeting, setGreeting] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isHome, setIsHome] = useState<boolean>(true);

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
          const profile = userDocSnap.data() as UserProfile;
          setUserProfile(profile);

          const theme =
            profile.theme === "feminine" || profile.theme === "default"
              ? profile.theme
              : "default";
          const darkMode = !!profile.darkMode;

          applyTheme(theme, darkMode);
          saveThemeToStorage(theme, darkMode);
        } else {
          throw new Error("Keine Benutzerdaten gefunden");
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const isHomePath = () => {
      if (typeof window === "undefined") return true;
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      return path === "/" || path === "/index.html";
    };

    const updateIsHome = () => setIsHome(isHomePath());

    updateIsHome();
    window.addEventListener("popstate", updateIsHome);
    window.addEventListener("hashchange", updateIsHome);
    document.addEventListener("visibilitychange", updateIsHome);

    return () => {
      window.removeEventListener("popstate", updateIsHome);
      window.removeEventListener("hashchange", updateIsHome);
      document.removeEventListener("visibilitychange", updateIsHome);
    };
  }, []);

  return (
    <div
      className={
        isSmall ? "burger-menu-wrapper with-back" : "burger-menu-wrapper"
      }
    >
      {isHome ? (
        <h1 className="nav-greeting">
          <span className="greeting-small">{greeting},</span>
          <br />{" "}
          {userProfile?.displayName
            ? `${userProfile.displayName}`
            : userProfile
            ? `${userProfile.name}`
            : ""}
          !
        </h1>
      ) : (
        <BackToHome />
      )}

      {!isHome && title && typeof subjectType === "number" && (
        <div className="burger-menu-center">
          <div className="burger-subject-name">{title}</div>
          <span
            className={`subject-tag ${
              subjectType === 1 ? "subject-tag--main" : "subject-tag--minor"
            }`}
          >
            {subjectType === 1 ? "Hauptfach" : "Nebenfach"}
          </span>
        </div>
      )}

      {!isHome && title && typeof subjectType !== "number" && (
        <div className="burger-menu-center">
          <div className="burger-subject-name">{title}</div>
          <p className="subjects-page-subtitle">
            {subtitle}
          </p>
        </div>
      )}

      <div className="burger-buttons">
        <Logout />
      </div>
    </div>
  );
};

export default BurgerMenu;
