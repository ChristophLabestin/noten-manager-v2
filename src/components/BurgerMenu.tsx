import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { UserProfile } from "../interfaces/UserProfile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Logout from "./Logout";
import BackToHome from "./BackToHome";


const BurgerMenu: React.FC = () => {
  const { user } = useAuth();

  const [greeting, setGreeting] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isHome, setIsHome] = useState<boolean>(true)

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
        } else {
          throw new Error("Keine Benutzerdaten gefunden")
        }
      }
    };

    // 🔍 Prüfen, ob aktuelle Seite die Startseite ist
    const checkIfHome = () => {
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname;
        setIsHome(pathname === "/");
      }
    };

    fetchUserProfile();
    checkIfHome();
  }, [user]);

  return (
    <div
      className={
        !isHome
          ? "burger-menu-wrapper with-back"
          : "burger-menu-wrapper"
      }
    >
      {isHome && (
        <h1 className="nav-greeting">
          <span className="greeting-small">{greeting},</span><br/> {user?.displayName
            ? `${user.displayName}`
            : userProfile
            ? `${userProfile.name}`
            : ""}
          !
        </h1>
      )}
      {!isHome && (
        <BackToHome />
      )}
      <Logout/>
    </div>
  );
};

export default BurgerMenu;
