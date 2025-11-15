import { useEffect, useState } from "react";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade } from "../interfaces/Grade";
import { HomeIcon, ProfileIcon, SettingsIcon } from "./icons";
import AddGrade from "./AddGrade";
import AddSubject from "./AddSubject";
import closeIcon from "../assets/close.svg";
import folderIcon from "../assets/folder.svg";
import { navigate } from "../services/navigation";

interface BottomNavProps {
  subjects: Subject[];
  encryptionKey: CryptoKey | null;
  onAddGradeToState: (
    subjectId: string,
    gradeId: string,
    grade: EncryptedGrade,
    encryptionKey: CryptoKey
  ) => void;
  onAddSubjectToState: (subject: Subject) => void;
  isFirstSubject: boolean;
  disableAddGrade: boolean;
  addGradeTitle: string;
}

export default function BottomNav({
  subjects,
  encryptionKey,
  onAddGradeToState,
  onAddSubjectToState,
  isFirstSubject,
  disableAddGrade,
  addGradeTitle,
}: BottomNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"" | "grade" | "subject">("");

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleAddGradeClick = () => {
    setActiveModal("grade");
    setIsOpen(false);
  };

  const handleAddSubjectClick = () => {
    setActiveModal("subject");
    setIsOpen(false);
  };

  const handleGradeAdded = (
    subjectId: string,
    gradeId: string,
    grade: EncryptedGrade,
    key: CryptoKey
  ) => {
    onAddGradeToState(subjectId, gradeId, grade, key);
    setActiveModal("");
  };

  const handleSubjectAdded = (subject: Subject) => {
    onAddSubjectToState(subject);
    setActiveModal("");
  };

  useEffect(() => {
    document.body.classList.toggle("scroll-disable", activeModal !== "");
    return () => {
      document.body.classList.remove("scroll-disable");
    };
  }, [activeModal]);

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const isHome = path === "/" || path === "/index.html";
  const isSubjects = path === "/fach";
  const isSettings = path === "/einstellungen";

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-bar">
        <div className="bottom-nav-items">
          <button
            className="bottom-nav-item"
            type="button"
            onClick={() => navigate("/")}
            aria-label="Home"
          >
            <span
              className={
                isHome
                  ? "bottom-nav-dot bottom-nav-dot--active"
                  : "bottom-nav-dot"
              }
            >
              <HomeIcon size={26} className="bottom-nav-icon" />
            </span>
          </button>

          <button
            className="bottom-nav-item"
            type="button"
            onClick={() => navigate("/fach")}
            aria-label={"F\u00e4cher"}
          >
            <span
              className={
                isSubjects
                  ? "bottom-nav-dot bottom-nav-dot--active"
                  : "bottom-nav-dot"
              }
            >
              <img
                src={folderIcon}
                className="bottom-nav-icon"
                alt={"F\u00e4cher"}
                width={26}
                height={26}
              />
            </span>
          </button>

          <div className="bottom-nav-fab-wrapper">
            {isFirstSubject && !isOpen && (
              <div className="bottom-nav-hint">
                <div className="bottom-nav-hint-bubble">
                  Du hast noch kein Fach angelegt. <br/> Tippe hier, um dein erstes
                  Fach zu erstellen.
                  <div className="bottom-nav-hint-arrow" />
                </div>
              </div>
            )}
            <button
              className="bottom-nav-fab"
              type="button"
              onClick={toggleOpen}
              aria-expanded={isOpen}
              aria-label={"Schnelle Aktionen öffnen"}
            >
              <span className="bottom-nav-fab-icon">+</span>
            </button>
          </div>

          <button
            className="bottom-nav-item"
            type="button"
            onClick={() => navigate("/datenschutz")}
            aria-label="Profil"
          >
            <span className="bottom-nav-dot">
              <ProfileIcon size={26} className="bottom-nav-icon" />
            </span>
          </button>

          <button
            className="bottom-nav-item"
            type="button"
            onClick={() => navigate("/einstellungen")}
            aria-label="Einstellungen"
          >
            <span
              className={
                isSettings
                  ? "bottom-nav-dot bottom-nav-dot--active"
                  : "bottom-nav-dot"
              }
            >
              <SettingsIcon size={26} className="bottom-nav-icon" />
            </span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bottom-nav-actions">
          <div
            className="bottom-nav-actions-backdrop"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="bottom-nav-actions-panel">
            <div className="bottom-nav-actions-header">
              <span className="bottom-nav-actions-title">
                Schnelle Aktionen
              </span>
              <span className="bottom-nav-actions-subtitle">
                Was möchtest du hinzufügen?
              </span>
            </div>
            <div className="bottom-nav-actions-grid">
              <button
                className="bottom-nav-actions-button"
                type="button"
                onClick={handleAddGradeClick}
                disabled={disableAddGrade}
                title={addGradeTitle}
              >
                <span className="bottom-nav-actions-icon-circle">+</span>
                <div className="bottom-nav-actions-text">
                  <span className="bottom-nav-actions-label">Note</span>
                  <span className="bottom-nav-actions-description">
                    Einzelne Leistung eintragen
                  </span>
                </div>
              </button>

              <button
                className="bottom-nav-actions-button"
                type="button"
                onClick={handleAddSubjectClick}
              >
                <span className="bottom-nav-actions-icon-circle">+</span>
                <div className="bottom-nav-actions-text">
                  <span className="bottom-nav-actions-label">Fach</span>
                  <span className="bottom-nav-actions-description">
                    Neues Fach anlegen
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal !== "" && (
        <div className="modal-wrapper">
          <div
            className="modal-background"
            onClick={() => setActiveModal("")}
          ></div>
          <div className="modal">
            {activeModal === "grade" ? (
              <AddGrade
                subjectsProp={subjects}
                onAddGrade={handleGradeAdded}
                encryptionKeyProp={encryptionKey as CryptoKey}
              />
            ) : (
              <AddSubject
                onAddSubject={handleSubjectAdded}
              />
            )}
            <img
              src={closeIcon}
              className="close-icon"
              onClick={() => setActiveModal("")}
              alt={"Schlie\u00dfen"}
            />
          </div>
        </div>
      )}
    </nav>
  );
}
