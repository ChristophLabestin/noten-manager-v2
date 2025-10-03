import React, { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { UserProfile } from "../interfaces/UserProfile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

interface BurgerMenuProps {
  backToHome?: boolean;
}

const BurgerMenu: React.FC<BurgerMenuProps> = (props) => {
  const { user } = useAuth();

  const [greeting, setGreeting] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
      {!props.backToHome && (
        <h1 className="nav-greeting">
          {greeting}, {user?.displayName
            ? `${user.displayName}`
            : userProfile
            ? `${userProfile.name}`
            : ""}
          !
        </h1>
      )}
    </div>
  );
};

export default BurgerMenu;
