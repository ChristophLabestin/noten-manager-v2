import { useEffect, useState } from "react";
import closeIcon from "../assets/close.svg";
import { lockBodyScroll, unlockBodyScroll } from "../services/scrollLock";
import { useAuth } from "../context/authcontext/useAuth";
import { useGrades } from "../context/gradesContext/useGrades";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "../interfaces/UserProfile";
import type { Subject, ExamType } from "../interfaces/Subject";

export default function ExamSubjectsModal() {
  const { user } = useAuth();
  const { subjects, updateSubject } = useGrades();

  const [visible, setVisible] = useState(false);
  const [hasConfigured, setHasConfigured] = useState(false);

  useEffect(() => {
    const checkVisibility = async () => {
      if (!user) return;
      if (!subjects.length) return;
      if (hasConfigured) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        const profile = snap.exists()
          ? (snap.data() as UserProfile)
          : undefined;
        const hasConfiguredRemote =
          profile?.hasConfiguredExamSubjects === true;

        const hasAnyExamSubject = subjects.some(
          (subject) => subject.examSubject === true
        );

        if (hasConfiguredRemote) {
          setVisible(false);
          setHasConfigured(true);
          return;
        }

        if (hasAnyExamSubject) {
          await updateDoc(userDocRef, {
            hasConfiguredExamSubjects: true,
          });
          setHasConfigured(true);
          setVisible(false);
          return;
        }

        setVisible(true);
      } catch (err) {
        console.error(
          "[ExamSubjectsModal] Failed to check visibility:",
          err
        );

        const hasAnyExamSubject = subjects.some(
          (subject) => subject.examSubject === true
        );

        if (!hasAnyExamSubject && !hasConfigured) {
          setVisible(true);
        }
      }
    };

    void checkVisibility();
  }, [user, subjects, hasConfigured]);

  useEffect(() => {
    if (visible) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
    return () => {
      unlockBodyScroll();
    };
  }, [visible]);

  const persistExamSubjectChange = async (
    subject: Subject,
    examSubject: boolean,
    examType: ExamType
  ) => {
    if (!user) return;

    try {
      const subjectDocRef = doc(
        db,
        "users",
        user.uid,
        "subjects",
        subject.name
      );
      await updateDoc(subjectDocRef, {
        examSubject,
        examType,
      });
    } catch (err) {
      console.error(
        "[ExamSubjectsModal] Failed to update examSubject for subject:",
        subject.name,
        err
      );
    }

    const updatedSubject: Subject = {
      ...subject,
      examSubject,
      examType,
    };
    updateSubject(updatedSubject);
  };

  const handleToggleExamSubject = (subject: Subject) => {
    const currentExamSubject = subject.examSubject === true;
    const nextExamSubject = !currentExamSubject;
    const examType: ExamType = (subject.examType as ExamType) ?? "written";

    void persistExamSubjectChange(subject, nextExamSubject, examType);
  };

  const markConfiguredAndClose = () => {
    if (user && !hasConfigured) {
      const userDocRef = doc(db, "users", user.uid);
      void updateDoc(userDocRef, {
        hasConfiguredExamSubjects: true,
      }).catch(() => {
        // ignore Firestore errors for this hint
      });
    }

    setHasConfigured(true);
    setVisible(false);
  };

  const handleClose = () => {
    markConfiguredAndClose();
  };

  if (!visible || subjects.length === 0) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-background" onClick={handleClose}></div>
      <div className="modal">
        <img
          src={closeIcon}
          className="close-icon"
          onClick={handleClose}
          alt="Pr&uuml;fungsf&auml;cher Auswahl schlie&szlig;en"
        />
        <div className="new-features-modal exam-subjects-modal-content">
          <h2 className="section-headline">Pr&uuml;fungsf&auml;cher festlegen</h2>
          <p className="settings-help-text">
            W&auml;hle die F&auml;cher, in denen du deine Abschlusspr&uuml;fung
            schreibst. Du kannst diese Auswahl sp&auml;ter in den
            Einstellungen &auml;ndern.
          </p>
          <div className="final-grade-list">
            {subjects.map((subject) => {
              const isExamSubject = subject.examSubject === true;

              return (
                <article
                  key={subject.name}
                  className="subject-card final-grade-card"
                >
                  <header className="subject-card-header">
                    <h3 className="subject-card-title">{subject.name}</h3>
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
                            onChange={() => handleToggleExamSubject(subject)}
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
          <div className="new-features-actions">
            <button
              type="button"
              className="btn-primary small"
              onClick={markConfiguredAndClose}
            >
              Fertig
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
