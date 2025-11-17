import { useEffect, useMemo, useState } from "react";
import { Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../context/authcontext/useAuth";
import { useGrades } from "../context/gradesContext/useGrades";
import type { EncryptedGrade, GradeWithId } from "../interfaces/Grade";
import type { Subject } from "../interfaces/Subject";
import { db } from "../firebase/firebaseConfig";
import { decryptString, encryptString } from "../services/cryptoService";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import Loading from "../components/Loading";
import { EditIcon, DeleteIcon, CancelIcon } from "../components/icons";
import { lockBodyScroll, unlockBodyScroll } from "../services/scrollLock";

const FACHREFERAT_NAME = "Fachreferat";

const getGradeClass = (value: number | null): string => {
  if (value === null) return "";
  if (value >= 7) return "good";
  if (value >= 4) return "medium";
  return "bad";
};

const getGradeCategory = (points: number): "good" | "medium" | "bad" => {
  if (points >= 7) return "good";
  if (points >= 4) return "medium";
  return "bad";
};

export default function FachreferatDetail() {
  const { user } = useAuth();
  const {
    subjects,
    encryptionKey,
    isLoading,
    loadingLabel,
    progress,
    addSubject,
    addGrade,
    fachreferat,
    setFachreferat,
  } = useGrades();

  const subjectsWithoutFachreferat = useMemo(
    () => subjects.filter((s) => s.name !== FACHREFERAT_NAME),
    [subjects]
  );

  const [gradeValue, setGradeValue] = useState<string>(
    fachreferat ? String(fachreferat.grade) : ""
  );
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(
    fachreferat?.subjectName ?? ""
  );
  const [note, setNote] = useState<string>(fachreferat?.note ?? "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (fachreferat) {
      setGradeValue(String(fachreferat.grade));
      setSelectedSubjectName(fachreferat.subjectName ?? "");
      setNote(fachreferat.note ?? "");
      setIsEditing(false);
    } else {
      setGradeValue("");
      setSelectedSubjectName("");
      setNote("");
      setIsEditing(false);
    }
  }, [fachreferat]);

  const isFirstSubject = subjectsWithoutFachreferat.length === 0;

  const disableAddGrade = useMemo(
    () => !encryptionKey || subjectsWithoutFachreferat.length === 0,
    [encryptionKey, subjectsWithoutFachreferat.length]
  );

  const addGradeTitle = useMemo(() => {
    if (!encryptionKey) return "Lade Schl\u00fcssel...";
    if (subjectsWithoutFachreferat.length === 0)
      return "Lege zuerst ein Fach an";
    return "";
  }, [encryptionKey, subjectsWithoutFachreferat.length]);

  const handleAddSubjectToState = (newSubject: Subject) => {
    addSubject(newSubject);
  };

  const handleAddGradeToState = async (
    subjectId: string,
    gradeId: string,
    grade: EncryptedGrade,
    key: CryptoKey
  ) => {
    const decryptedGradeNumber = Number(
      await decryptString(grade.grade, key)
    );
    const gradeWithId: GradeWithId = {
      id: gradeId,
      grade: decryptedGradeNumber,
      weight: grade.weight,
      date: grade.date,
      note: grade.note,
      halfYear: grade.halfYear,
    };

    addGrade(subjectId, gradeWithId);
  };

  const handleGradeClick = (value: number) => {
    setGradeValue(String(value));
  };

  const handleSave = async () => {
    if (!user || !encryptionKey || !fachreferat) {
      return;
    }

    if (gradeValue === "") {
      alert("Bitte Notenpunkte auswählen.");
      return;
    }

    const gradeNumber = Number(gradeValue);
    if (!Number.isFinite(gradeNumber) || gradeNumber < 0 || gradeNumber > 15) {
      alert("Bitte eine g\u00fcltige Punktzahl zwischen 0 und 15 eingeben.");
      return;
    }

    if (!selectedSubjectName) {
      alert(
        "Bitte wähle das Fach aus, in dem du das Fachreferat gehalten hast."
      );
      return;
    }

    try {
      setIsSaving(true);

      const encryptedGradeStr = await encryptString(
        gradeNumber.toString(),
        encryptionKey
      );

      const fachreferatDocRef = doc(
        db,
        "users",
        user.uid,
        "fachreferat",
        "current"
      );

      const existingDate =
        fachreferat.date ?? Timestamp.fromDate(new Date());

      await updateDoc(fachreferatDocRef, {
        grade: encryptedGradeStr,
        subjectName: selectedSubjectName,
        note: note || null,
        date: existingDate,
      });

      setFachreferat({
        id: fachreferat.id,
        grade: gradeNumber,
        subjectName: selectedSubjectName,
        note: note || undefined,
        date: existingDate,
      });

      setIsEditing(false);
    } catch (err) {
      alert(
        "Fehler beim Speichern der Fachreferatsnote: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteModalOpen(true);
    lockBodyScroll();
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    unlockBodyScroll();
  };

  const handleConfirmDelete = async () => {
    if (!user || !fachreferat) return;

    try {
      setIsDeleting(true);

      const fachreferatDocRef = doc(
        db,
        "users",
        user.uid,
        "fachreferat",
        "current"
      );

      await deleteDoc(fachreferatDocRef);
      setFachreferat(null);
      setGradeValue("");
      setSelectedSubjectName("");
      setNote("");
      setIsEditing(false);
    } catch (err) {
      alert(
        "Fehler beim Löschen des Fachreferats: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  const currentGradeNumber = fachreferat ? fachreferat.grade : null;
  const gradeClass = getGradeClass(currentGradeNumber);

  return (
    <div className="subject-detail-page">
      {isLoading && <Loading progress={progress} label={loadingLabel} />}

      <header className="subject-detail-header">
        <BurgerMenu isSmall title="Fachreferat" />
      </header>

      <div className="subject-detail-content">
        <div className="subject-detail-main">
          {fachreferat ? (
            <section className="home-section subject-detail-grades-section" style={{ margin: 0 }}>
              <div className="home-section-header-main">
                <p className="subject-detail-subheadline">
                  Dein Fachreferat wird wie eine zusätzliche Halbjahresleistung
                  gewertet.
                </p>
              </div>

              <div className="home-summary single-column" style={{ marginTop: 8 }}>
                <div className="home-summary-card home-summary-card--row">
                  <span className="home-summary-label final-grade-label">
                    Benotung
                  </span>
                  <div
                    className={`subject-detail-summary-pill ${gradeClass}`}
                  >
                    {currentGradeNumber === null
                      ? "-"
                      : currentGradeNumber.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="subject-detail-grades-list" style={{ marginTop: 16 }}>
                <div className="subject-detail-grade-card">
                  <div className="subject-detail-grade-main fachreferat">
                    <div className="home-summary-label final-grade-label">
                      Fachreferat in {fachreferat.subjectName}
                    </div>
                    {fachreferat.note && (
                      <div className="subject-detail-grade-note" style={{ marginTop: 8 }}>
                        {fachreferat.note}
                      </div>
                    )}
                    <div className="subject-detail-grade-actions">
                      {!isEditing ? (
                        <>
                          <button
                            className="btn-small"
                            type="button"
                            onClick={() => setIsEditing(true)}
                          >
                            <EditIcon size={18} className="icon-edit" />{" "}
                            Bearbeiten
                          </button>
                          <button
                            className="btn-small btn-small--delete"
                            type="button"
                            onClick={openDeleteModal}
                            disabled={isDeleting}
                          >
                            <DeleteIcon
                              size={18}
                              className="icon-delete"
                            />{" "}
                            {isDeleting ? "Lösche..." : "Fachreferat löschen"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-small btn-small--cancel"
                            type="button"
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                          >
                            Abbrechen
                          </button>
                          <button
                            className="btn-small btn-small--save"
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? "Speichern..." : "Speichern"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div
                  className="subject-detail-grades-list"
                  style={{ marginTop: 12 }}
                >
                  <div className="subject-detail-grade-card editing">
                    <div className="subject-detail-grade-main add-subject-form">
                      <div className="form-group">
                        <label className="form-label">
                          Fach des Fachreferats
                        </label>
                        <select
                          className="form-input"
                          value={selectedSubjectName}
                          onChange={(e) =>
                            setSelectedSubjectName(e.target.value)
                          }
                        >
                          <option value="">- Fach auswählen -</option>
                          {subjectsWithoutFachreferat.map((subject) => (
                            <option key={subject.name} value={subject.name}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-two-columns">
                        <div className="form-group">
                          <label className="form-label">Punkte (0-15)</label>
                          <div className="grade-points-group">
                            {Array.from({ length: 16 }, (_, index) => {
                              const value = 15 - index;
                              const stringValue = String(value);
                              const isActive = gradeValue === stringValue;
                              const category = getGradeCategory(value);
                              const classes = [
                                "grade-point-pill",
                                `grade-point-pill--${category}`,
                                isActive ? "grade-point-pill--active" : "",
                              ]
                                .filter(Boolean)
                                .join(" ");
                              return (
                                <label key={value} className={classes}>
                                  <input
                                    type="radio"
                                    name="fachreferat-grade-points-detail"
                                    value={stringValue}
                                    checked={isActive}
                                    onChange={() =>
                                      handleGradeClick(value)
                                    }
                                  />
                                  {value}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Notiz</label>
                          <textarea
                            className="form-input hidden-textarea"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Zusätzliche Infos zum Fachreferat ..."
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="home-section subject-detail-grades-section">
              <div className="home-section-header-main">
                <h2 className="section-head no-padding">Kein Fachreferat</h2>
                <p className="subject-detail-subheadline">
                  Du hast noch keine Fachreferatsnote eingetragen.
                </p>
              </div>
              <p className="info-message">
                Nutze unten die Aktion &quot;Fachreferat&quot;, um dein
                Fachreferat anzulegen. Danach kannst du es hier bearbeiten oder
                wieder löschen.
              </p>
            </section>
          )}
        </div>
      </div>

      <BottomNav
        subjects={subjects as Subject[]}
        encryptionKey={encryptionKey}
        onAddGradeToState={handleAddGradeToState}
        onAddSubjectToState={handleAddSubjectToState}
        isFirstSubject={isFirstSubject}
        disableAddGrade={disableAddGrade}
        addGradeTitle={addGradeTitle}
        hasFachreferat={!!fachreferat}
      />

      {deleteModalOpen && (
        <div className="modal-wrapper">
          <div className="modal-background" onClick={closeDeleteModal}></div>
          <div className="modal">
            <h2 className="section-head no-padding">Fachreferat löschen?</h2>
            <p style={{ marginTop: "12px", fontSize: "14px" }}>
              Möchtest du das Fachreferat wirklich löschen? Diese Aktion kann
              nicht r\u00fcckgängig gemacht werden.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "18px",
              }}
            >
              <button
                type="button"
                className="btn-small btn-small--cancel"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                <CancelIcon size={18} /> Abbrechen
              </button>
              <button
                type="button"
                className="btn-small btn-small--delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                <DeleteIcon size={18} /> Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

