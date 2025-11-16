import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAuth } from "../context/authcontext/useAuth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import BurgerMenu from "../components/BurgerMenu";
import type { UserProfile } from "../interfaces/UserProfile";
import {
  applyTheme,
  loadThemeFromStorage,
  saveThemeToStorage,
} from "../services/themeService";
import BottomNav from "../components/BottomNav";
import { useGrades } from "../context/gradesContext/useGrades";
import { navigate } from "../services/navigation";

export default function Settings() {
  const { user } = useAuth();
  const {
    subjects,
    encryptionKey,
    addSubject,
  } = useGrades();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>();
  const [theme, setTheme] = useState<"default" | "feminine">("default");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [compactView, setCompactView] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          setUserProfile(profile);

          const stored = loadThemeFromStorage();

          const profileTheme: "default" | "feminine" =
            profile.theme === "feminine" || profile.theme === "default"
              ? profile.theme
              : stored.theme;
          const profileDarkMode =
            typeof profile.darkMode === "boolean"
              ? profile.darkMode
              : stored.darkMode;
          const profileCompact =
            typeof profile.compactView === "boolean"
              ? profile.compactView
              : false;

          setTheme(profileTheme);
          setDarkMode(profileDarkMode);
          setCompactView(profileCompact);
          // showTips wird aktuell nur für ältere Profile gelesen,
          // aber nicht mehr aktiv verwendet.

          applyTheme(profileTheme, profileDarkMode);
          saveThemeToStorage(profileTheme, profileDarkMode);
        } else {
          throw new Error("Keine Benutzerdaten gefunden");
        }
      } catch (error) {
        console.error("Fehler beim Laden des Profils:", error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const savePreferences = async (options?: {
    themeOverride?: "default" | "feminine";
    darkOverride?: boolean;
    compactOverride?: boolean;
    tipsOverride?: boolean;
  }) => {
    if (!user) return;

    const nextTheme = options?.themeOverride ?? theme;
    const nextDark = options?.darkOverride ?? darkMode;
    const nextCompact = options?.compactOverride ?? compactView;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        theme: nextTheme,
        darkMode: nextDark,
        compactView: nextCompact,
      });

      applyTheme(nextTheme, nextDark);
      saveThemeToStorage(nextTheme, nextDark);
    } catch (error) {
      console.error("Fehler beim Speichern der Einstellungen:", error);
    }
  };

  const handleThemeChange = (value: "default" | "feminine") => {
    setTheme(value);
    applyTheme(value, darkMode);
    void savePreferences({ themeOverride: value });
  };

  const handleDarkModeToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setDarkMode(next);
    applyTheme(theme, next);
    void savePreferences({ darkOverride: next });
  };

  const handleSaveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, "users", user.uid);
      const trimmedName = newName.trim();

      await updateDoc(userRef, {
        name: trimmedName,
        displayName: trimmedName,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      setNewName("");
    } catch (err) {
      console.error("Fehler beim Speichern des Namens:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (user) {
    const displayNamePlaceholder =
      userProfile?.displayName ||
      userProfile?.name ||
      user.displayName ||
      "Dein Name";

    return (
      <>
        <div className="home-layout">
          <BurgerMenu
            isSmall
            title="Einstellungen"
            subtitle="Name und App-Design anpassen"
          />
          <div className="settings-head">
            <form onSubmit={handleSaveName} className="settings-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Anzeigename
                </label>
                <div className="settings-name-row">
                  <input
                    className="form-input"
                    id="name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={displayNamePlaceholder}
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary small"
                  >
                    {isSaving ? "Speichern..." : "Name speichern"}
                  </button>
                </div>
                {success && (
                  <p className="success-msg">
                    ✅ Name erfolgreich gespeichert!
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Farbschema
                </label>
                <div className="settings-theme-options">
                  <button
                    type="button"
                    className={`settings-theme-pill ${
                      theme === "default" ? "active" : ""
                    }`}
                    onClick={() => handleThemeChange("default")}
                  >
                    Klassisch
                  </button>
                  <button
                    type="button"
                    className={`settings-theme-pill settings-theme-pill--feminine ${
                      theme === "feminine" ? "active" : ""
                    }`}
                    onClick={() => handleThemeChange("feminine")}
                  >
                    Pink
                  </button>
                </div>
                <p className="settings-help-text">
                  Wähle, ob die Oberfläche eher klassisch oder mit einem
                  weicheren, weiblicheren Farbschema angezeigt wird.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Dark Mode
                </label>
                <label
                  className={`settings-switch ${
                    darkMode ? "settings-switch--on" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={handleDarkModeToggle}
                  />
                  <span className="settings-switch-slider" />
                  <span className="settings-switch-label">
                    {darkMode
                      ? "Dark Mode aktiviert"
                      : "Dark Mode deaktiviert"}
                  </span>
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Weitere Einstellungen
                </label>
                <div className="settings-checkbox-group">
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={compactView}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setCompactView(next);
                        void savePreferences({ compactOverride: next });
                        if (typeof document !== "undefined") {
                          document.body.classList.toggle(
                            "compact-view",
                            next
                          );
                        }
                      }}
                    />
                    <span>
                      Kompakte Tabellen-Ansicht
                    </span>
                  </label>
                </div>
              </div>
            </form>
            <div className="settings-privacy-link">
              <button
                type="button"
                className="link-button"
                onClick={() => navigate("/datenschutz")}
              >
                Datenschutzerkl&auml;rung anzeigen
              </button>
            </div>
            <div className="settings-privacy-link">
              <p>App Version 1.3</p>
            </div>
          </div>
        </div>
        <BottomNav
          subjects={subjects}
          encryptionKey={encryptionKey}
          onAddGradeToState={() => {}}
          onAddSubjectToState={addSubject}
          isFirstSubject={subjects.length === 0}
          disableAddGrade={!encryptionKey || subjects.length === 0}
          addGradeTitle={
            !encryptionKey
              ? "Lade Schlüssel..."
              : subjects.length === 0
              ? "Lege zuerst ein Fach an"
              : ""
          }
        />
      </>
    );
  }

  return null;
}
