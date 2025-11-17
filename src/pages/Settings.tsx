import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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
import type { Subject, ExamType } from "../interfaces/Subject";

export default function Settings() {
  const { user } = useAuth();
  const { subjects, gradesBySubject, encryptionKey, addSubject, updateSubject } =
    useGrades();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>();
  const [theme, setTheme] = useState<"default" | "feminine">("default");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [compactView, setCompactView] = useState<boolean>(false);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [maxDroppedHalfYears, setMaxDroppedHalfYears] = useState<number>(3);

  const hasFachreferat =
    (gradesBySubject["Fachreferat"] || []).length > 0;

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
          const profileAnimationsEnabled =
            typeof profile.animationsEnabled === "boolean"
              ? profile.animationsEnabled
              : true;
          const profileMaxDropped =
            typeof profile.maxDroppedHalfYears === "number"
              ? profile.maxDroppedHalfYears
              : 3;

          setTheme(profileTheme);
          setDarkMode(profileDarkMode);
          setCompactView(profileCompact);
          setAnimationsEnabled(profileAnimationsEnabled);
          setMaxDroppedHalfYears(profileMaxDropped);
          // showTips wird aktuell nur für ältere Profile gelesen,
          // aber nicht mehr aktiv verwendet.

          applyTheme(profileTheme, profileDarkMode);
          saveThemeToStorage(profileTheme, profileDarkMode);
          if (typeof document !== "undefined") {
            document.body.classList.toggle("compact-view", profileCompact);
            document.body.classList.toggle(
              "no-animations",
              !profileAnimationsEnabled
            );
          }
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
    animationsOverride?: boolean;
    tipsOverride?: boolean;
  }) => {
    if (!user) return;

    const nextTheme = options?.themeOverride ?? theme;
    const nextDark = options?.darkOverride ?? darkMode;
    const nextCompact = options?.compactOverride ?? compactView;
    const nextAnimations =
      options?.animationsOverride ?? animationsEnabled;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        theme: nextTheme,
        darkMode: nextDark,
        compactView: nextCompact,
        animationsEnabled: nextAnimations,
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

  const handleAnimationsToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setAnimationsEnabled(next);
    if (typeof document !== "undefined") {
      document.body.classList.toggle("no-animations", !next);
    }
    void savePreferences({ animationsOverride: next });
  };

  const handleMaxDroppedHalfYearsChange = async (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    if (!user) return;

    const value = Number(event.target.value);
    setMaxDroppedHalfYears(value);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        maxDroppedHalfYears: value,
      });
    } catch (error) {
      console.error(
        "[Settings] Fehler beim Speichern der maximal streichbaren Halbjahre:",
        error
      );
    }
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

  const handleToggleExamSubject = async (subject: Subject) => {
    if (!user) return;

    const currentExamSubject = subject.examSubject === true;
    const nextExamSubject = !currentExamSubject;
    const examType: ExamType = (subject.examType as ExamType) ?? "written";

    try {
      const subjectDocRef = doc(
        db,
        "users",
        user.uid,
        "subjects",
        subject.name
      );
      await updateDoc(subjectDocRef, {
        examSubject: nextExamSubject,
        examType,
      });
    } catch (err) {
      console.error(
        "[Settings] Failed to update examSubject for subject:",
        subject.name,
        err
      );
    }

    const updatedSubject: Subject = {
      ...subject,
      examSubject: nextExamSubject,
      examType,
    };
    updateSubject(updatedSubject);
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
              <div className="settings-card">
                <div className="home-section-header-main">
                  <h2 className="section-head no-padding">Allgemein</h2>
                  <span className="subject-detail-subheadline">
                    Allgemeine App und Account Einstellungen
                  </span>
                </div>
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
                  <label className="form-label">Farbschema</label>
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
                  <label className="form-label">Dark Mode</label>
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
                  <label className="form-label">Weitere Einstellungen</label>
                  <div className="settings-checkbox-group">
                    <label
                      className={`settings-switch ${
                        compactView ? "settings-switch--on" : ""
                      }`}
                    >
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
                      <span className="settings-switch-slider" />
                      <span className="settings-switch-label">
                        {compactView
                          ? "Kompakte Tabellen-Ansicht aktiviert"
                          : "Kompakte Tabellen-Ansicht deaktiviert"}
                      </span>
                    </label>
                    <label
                      className={`settings-switch ${
                        animationsEnabled ? "settings-switch--on" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={animationsEnabled}
                        onChange={handleAnimationsToggle}
                      />
                      <span className="settings-switch-slider" />
                      <span className="settings-switch-label">
                        {animationsEnabled
                          ? "Animationen aktiviert"
                          : "Animationen deaktiviert"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="settings-card">
                <div className="home-section-header-main">
                  <h2 className="section-head no-padding">Schuljahr</h2>
                  <span className="subject-detail-subheadline">
                    Einstellungen für das aktuelle Schuljahr
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Streichbare Halbjahre</label>
                  <p className="settings-help-text">
                    Lege fest, wie viele Halbjahre du in der
                    Abschlussnoten-Ansicht maximal streichen m&ouml;chtest.
                  </p>
                  <select
                    className="form-input small"
                    value={maxDroppedHalfYears}
                    onChange={handleMaxDroppedHalfYearsChange}
                  >
                    <option value={0}>0 Halbjahre</option>
                    <option value={1}>1 Halbjahr</option>
                    <option value={2}>2 Halbjahre</option>
                    <option value={3}>3 Halbjahre</option>
                  </select>
                </div>
              <div className="form-group">
                <label className="form-label">Pr&uuml;fungsf&auml;cher</label>
                <p className="settings-help-text">
                  Hier kannst du die F&auml;cher anpassen, in denen du deine
                  Abschlusspr&uuml;fung schreibst.
                </p>
                {subjects.length === 0 ? (
                  <p className="info-message">
                    Lege zuerst F&auml;cher an, um Pr&uuml;fungsf&auml;cher zu
                    w&auml;hlen.
                  </p>
                ) : (
                  <div className="final-grade-list">
                    {subjects.map((subject) => {
                      const isExamSubject = subject.examSubject === true;
                      return (
                        <article
                          key={subject.name}
                          className="subject-card final-grade-card"
                        >
                          <header className="subject-card-header">
                            <h3 className="subject-card-title">
                              {subject.name}
                            </h3>
                            <span
                              className={`subject-tag ${
                                subject.type === 1
                                  ? "subject-tag--main"
                                  : "subject-tag--minor"
                              }`}
                            >
                              {subject.type === 1 ? "Hauptfach" : "Nebenfach"}
                            </span>
                          </header>
                          <div className="final-grade-card-body">
                            <div className="final-grade-halfyear-row">
                              <div className="final-grade-halfyear-main">
                                <label
                                  className={`settings-switch final-grade-switch ${
                                    isExamSubject ? "settings-switch--on" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isExamSubject}
                                    onChange={() =>
                                      void handleToggleExamSubject(subject)
                                    }
                                  />
                                  <span className="settings-switch-slider" />
                                </label>
                                <span className="home-summary-label">
                                  Pr&uuml;fungsfach
                                </span>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
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
              <button
                type="button"
                className="link-button"
                onClick={() => navigate("/impressum")}
              >
                Impressum anzeigen
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
          hasFachreferat={hasFachreferat}
        />
      </>
    );
  }

  return null;
}
