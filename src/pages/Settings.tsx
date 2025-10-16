import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import BurgerMenu from "../components/BurgerMenu";
import type { UserProfile } from "../interfaces/UserProfile";
import Loading from "../components/Loading";

export default function Settings() {
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const user = userDocSnap.data() as UserProfile;
          setUserProfile(user);
          console.log(user);
        } else {
          throw new Error("Keine Benutzerdaten gefunden");
        }
      }
    };

    setIsLoading(true);
    fetchUserProfile();
    setIsLoading(false);
  }, [user]);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: newName.trim(),
        displayName: newName.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Namens:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (userProfile && user) {
    return (
      <div className="home-layout">
        <BurgerMenu />
        <div className="settings-head">
          {/* <div className="settings-top">
            <h2 className="section-head">Einstellungen</h2>
          </div> */}

          <form onSubmit={handleNameUpdate} className="settings-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Name ändern
              </label>
              <input
                className="form-input"
                id="username"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  userProfile.displayName || userProfile.name || "Dein Name"
                }
              />
            </div>
            <button
              type="submit"
              disabled={isSaving || !newName.trim()}
              className="btn-primary small"
            >
              {isSaving ? "Speichern..." : "Speichern"}
            </button>
            {success && (
              <p className="success-msg">✅ Name erfolgreich geändert!</p>
            )}
          </form>
        </div>
      </div>
    );
  }
}
