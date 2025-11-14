import { useEffect, useState } from "react";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade } from "../interfaces/Grade";
import { HomeIcon, ProfileIcon, SettingsIcon } from "./icons";
import AddGrade from "./AddGrade";
import AddSubject from "./AddSubject";
import closeIcon from "../assets/close.svg";
import folderIcon from "../assets/folder.svg";

interface BottomNavProps {
  subjects: Subject[];
  encryptionKey: CryptoKey | null;
  onAddGradeToState: (
    subjectId: string,
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
            onClick={() => (window.location.href = "/")}
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
            onClick={() => (window.location.href = "/fach")}
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

          <button
            className="bottom-nav-fab"
            type="button"
            onClick={toggleOpen}
            aria-expanded={isOpen}
            aria-label={"Schnelle Aktionen \u00f6ffnen"}
          >
            <span className="bottom-nav-fab-icon">+</span>
          </button>

          <button
            className="bottom-nav-item"
            type="button"
            onClick={() => (window.location.href = "/einstellungen")}
            aria-label="Profil"
          >
            <span className="bottom-nav-dot">
              <ProfileIcon size={26} className="bottom-nav-icon" />
            </span>
          </button>

          <button
            className="bottom-nav-item"
            type="button"
            onClick={() => (window.location.href = "/einstellungen")}
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
          <div className="bottom-nav-actions-bar">
            <button
              className="bottom-nav-action-button"
              type="button"
              onClick={handleAddGradeClick}
              disabled={disableAddGrade}
              title={addGradeTitle}
            >
              <span className="bottom-nav-action-icon">+</span>
              <span className="bottom-nav-action-label">Note</span>
            </button>

            <button
              className="bottom-nav-action-button"
              type="button"
              onClick={handleAddSubjectClick}
            >
              <span className="bottom-nav-action-icon">+</span>
              <span className="bottom-nav-action-label">Fach</span>
            </button>
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
                onAddGrade={onAddGradeToState}
                encryptionKeyProp={encryptionKey as CryptoKey}
              />
            ) : (
              <AddSubject
                onAddSubject={onAddSubjectToState}
                isFirstSubject={isFirstSubject}
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
