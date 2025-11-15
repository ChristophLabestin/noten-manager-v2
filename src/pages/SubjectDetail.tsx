import { useMemo, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, Grade, GradeWithId } from "../interfaces/Grade";
import { deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import {
  EditIcon,
  DeleteIcon,
  SaveIcon,
  CancelIcon,
} from "../components/icons";
import Loading from "../components/Loading";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import { useGrades } from "../context/gradesContext/useGrades";
import { decryptString, encryptString } from "../services/cryptoService";

interface SubjectDetailPageProps {
  subjectId: string;
}

const calculateGradeWeightForSubject = (
  subjectType: number,
  grade: Grade
): number => {
  if (subjectType === 1) {
    return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1;
  }
  if (subjectType === 0) {
    return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1;
  }
  return 1;
};

const calculateAverageForSubject = (
  grades: GradeWithId[],
  subjectType: number
): number | null => {
  if (!grades || grades.length === 0) return null;

  let total = 0;
  let totalWeight = 0;

  for (const grade of grades) {
    const weight = calculateGradeWeightForSubject(subjectType, grade);
    total += grade.grade * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return total / totalWeight;
};

const formatAverage = (value: number | null): string =>
  value === null ? "-" : value.toFixed(2);

const getGradeClass = (value: number | null): string => {
  if (value === null) return "";
  if (value >= 7) return "good";
  if (value >= 4) return "medium";
  return "bad";
};

export default function SubjectDetailPage({
  subjectId,
}: SubjectDetailPageProps) {
  const { user } = useAuth();
  const {
    subjects,
    gradesBySubject,
    encryptionKey,
    isLoading,
    loadingLabel,
    progress,
    addSubject,
    addGrade,
    updateGrade,
    deleteGrade,
  } = useGrades();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedGrade, setEditedGrade] = useState<Grade>({
    grade: 0,
    weight: 1,
    date: Timestamp.fromDate(new Date()),
    note: "",
    halfYear: 1,
  });
  const [halfYearFilter, setHalfYearFilter] =
    useState<"all" | 1 | 2>("all");

  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.name === subjectId),
    [subjects, subjectId]
  );

  const subjectGrades = useMemo(
    () => gradesBySubject[subjectId] || [],
    [gradesBySubject, subjectId]
  );

  const filteredGrades = useMemo(
    () =>
      subjectGrades.filter(
        (grade) =>
          halfYearFilter === "all" ||
          grade.halfYear === halfYearFilter
      ),
    [subjectGrades, halfYearFilter]
  );

  const sortedGrades = useMemo(
    () =>
      [...filteredGrades].sort(
        (a, b) => b.date.seconds - a.date.seconds
      ),
    [filteredGrades]
  );

  const averageValue = useMemo(() => {
    if (!activeSubject) return null;
    return calculateAverageForSubject(filteredGrades, activeSubject.type);
  }, [activeSubject, filteredGrades]);

  const averageDisplay = formatAverage(averageValue);
  const averageClass = getGradeClass(averageValue);

  const isFirstSubject = subjects.length === 0;

  const disableAddGrade = useMemo(
    () => !encryptionKey || subjects.length === 0,
    [encryptionKey, subjects.length]
  );

  const addGradeTitle = useMemo(() => {
    if (!encryptionKey) return "Lade Schlüssel...";
    if (subjects.length === 0) return "Lege zuerst ein Fach an";
    return "";
  }, [encryptionKey, subjects.length]);

  const handleAddSubjectToState = (newSubject: Subject) => {
    addSubject(newSubject);
  };

  const handleAddGradeToState = async (
    subjectIdParam: string,
    gradeId: string,
    grade: EncryptedGrade,
    key: CryptoKey
  ) => {
    const decryptedGradeNumber = Number(await decryptString(grade.grade, key));
    const gradeWithId: GradeWithId = {
      id: gradeId,
      grade: decryptedGradeNumber,
      weight: grade.weight,
      date: grade.date,
      note: grade.note,
      halfYear: grade.halfYear,
    };

    addGrade(subjectIdParam, gradeWithId);
  };

  const handleEditClick = (index: number) => {
    const grade = sortedGrades[index];
    if (!grade) return;

    setEditingIndex(index);
    setEditedGrade({
      grade: grade.grade,
      weight: grade.weight,
      date: grade.date,
      note: grade.note ?? "",
      halfYear: grade.halfYear ?? 1,
    });
  };

  const handleDeleteClick = async (gradeId: string) => {
    if (!user || !activeSubject) return;
    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "subjects",
          activeSubject.name,
          "grades",
          gradeId
        )
      );
      deleteGrade(activeSubject.name, gradeId);
    } catch (err) {
      throw new Error(
        "Fehler beim Löschen der Note: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleSaveClick = async (gradeId: string) => {
    if (!user || editingIndex === null || !encryptionKey || !activeSubject) {
      return;
    }

    try {
      const encryptedGradeStr = await encryptString(
        editedGrade.grade.toString(),
        encryptionKey
      );

      const gradeDocRef = doc(
        db,
        "users",
        user.uid,
        "subjects",
        activeSubject.name,
        "grades",
        gradeId
      );

      await updateDoc(gradeDocRef, {
        grade: encryptedGradeStr,
        weight: editedGrade.weight,
        date: editedGrade.date,
        note: editedGrade.note,
        halfYear: editedGrade.halfYear ?? null,
      });

      const updatedGrade: GradeWithId = {
        id: gradeId,
        grade: editedGrade.grade,
        weight: editedGrade.weight,
        date: editedGrade.date,
        note: editedGrade.note,
        halfYear: editedGrade.halfYear,
      };

      updateGrade(activeSubject.name, updatedGrade);
      setEditingIndex(null);
    } catch (err) {
      throw new Error(
        "Fehler beim Speichern der Note: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalGradeId, setNoteModalGradeId] = useState<string | null>(null);
  const [noteModalValue, setNoteModalValue] = useState("");

  const openNoteModal = (gradeId: string) => {
    const grade = subjectGrades.find((g) => g.id === gradeId);
    if (!grade) return;
    setNoteModalGradeId(gradeId);
    setNoteModalValue(grade.note ?? "");
    setNoteModalOpen(true);
    document.body.classList.add("scroll-disable");
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    setNoteModalGradeId(null);
    setNoteModalValue("");
    document.body.classList.remove("scroll-disable");
  };

  const handleSaveNote = async () => {
    if (!user || !activeSubject || !noteModalGradeId) return;
    try {
      const gradeDocRef = doc(
        db,
        "users",
        user.uid,
        "subjects",
        activeSubject.name,
        "grades",
        noteModalGradeId
      );

      await updateDoc(gradeDocRef, {
        note: noteModalValue || null,
      });

      const existing = subjectGrades.find((g) => g.id === noteModalGradeId);
      if (existing) {
        const updatedGrade: GradeWithId = {
          ...existing,
          note: noteModalValue || undefined,
        };
        updateGrade(activeSubject.name, updatedGrade);
      }

      closeNoteModal();
    } catch (err) {
      throw new Error(
        "Fehler beim Speichern der Notiz: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalGradeId, setDeleteModalGradeId] = useState<string | null>(
    null
  );

  const openDeleteModal = (gradeId: string) => {
    setDeleteModalGradeId(gradeId);
    setDeleteModalOpen(true);
    document.body.classList.add("scroll-disable");
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteModalGradeId(null);
    document.body.classList.remove("scroll-disable");
  };

  const handleConfirmDelete = async () => {
    if (deleteModalGradeId === null) return;
    await handleDeleteClick(deleteModalGradeId);
    closeDeleteModal();
  };

  if (!activeSubject) {
    if (isLoading) {
      return (
        <div className="subject-detail-page">
          <Loading progress={progress} label={loadingLabel} />
          <header className="subject-detail-header">
            <BurgerMenu isSmall />
          </header>
        </div>
      );
    }

    return (
      <div className="subject-detail-page">
        <header className="subject-detail-header">
          <BurgerMenu isSmall />
        </header>
        <div className="subject-detail-content">
          <p>Fach nicht gefunden.</p>
        </div>
        <BottomNav
          subjects={subjects as Subject[]}
          encryptionKey={encryptionKey}
          onAddGradeToState={handleAddGradeToState}
          onAddSubjectToState={handleAddSubjectToState}
          isFirstSubject={isFirstSubject}
          disableAddGrade={disableAddGrade}
          addGradeTitle={addGradeTitle}
        />
      </div>
    );
  }

  return (
    <div className="subject-detail-page">
      {isLoading && (
        <Loading progress={progress} label={loadingLabel} />
      )}

      <header className="subject-detail-header">
        <BurgerMenu
          isSmall
          title={activeSubject.name}
          subjectType={activeSubject.type}
        />
      </header>

      <div className="subject-detail-content">
        <div className="subject-detail-main">
          <div className="home-halfyear-toggle">
            <button
              type="button"
              className={`home-halfyear-toggle-button ${
                halfYearFilter === "all"
                  ? "home-halfyear-toggle-button--active"
                  : ""
              }`}
              onClick={() => setHalfYearFilter("all")}
            >
              Alle
            </button>
            <button
              type="button"
              className={`home-halfyear-toggle-button ${
                halfYearFilter === 1
                  ? "home-halfyear-toggle-button--active"
                  : ""
              }`}
              onClick={() => setHalfYearFilter(1)}
            >
              1. Hj
            </button>
            <button
              type="button"
              className={`home-halfyear-toggle-button ${
                halfYearFilter === 2
                  ? "home-halfyear-toggle-button--active"
                  : ""
              }`}
              onClick={() => setHalfYearFilter(2)}
            >
              2. Hj
            </button>
          </div>

          <section className="home-summary two-columns">
            <div className="home-summary-card">
              <span className="home-summary-label">
                Durchschnitt
              </span>
              <div
                className={`subject-detail-summary-pill ${averageClass}`}
              >
                {averageDisplay}
              </div>
            </div>
            <div className="home-summary-card">
              <span className="home-summary-label">Noten</span>
              <span className="subject-detail-summary-value home-summary-value-pill">
                {subjectGrades.length}
              </span>
            </div>
          </section>

          {(activeSubject.teacher ||
            activeSubject.alias ||
            activeSubject.email ||
            activeSubject.room) && (
            <section className="home-section">
              <h2 className="section-head no-padding">Details</h2>
              <div className="subject-detail-details-list">
                {activeSubject.teacher && (
                  <div className="subject-detail-detail-row">
                    <span className="subject-detail-detail-label">
                      Lehrkraft
                    </span>
                    <span className="subject-detail-detail-value">
                      {activeSubject.teacher}
                    </span>
                  </div>
                )}
                {activeSubject.alias && (
                  <div className="subject-detail-detail-row">
                    <span className="subject-detail-detail-label">
                      Kürzel
                    </span>
                    <span className="subject-detail-detail-value">
                      {activeSubject.alias}
                    </span>
                  </div>
                )}
                {activeSubject.email && (
                  <div className="subject-detail-detail-row">
                    <span className="subject-detail-detail-label">
                      E-Mail
                    </span>
                    <a
                      href={`mailto:${activeSubject.email}`}
                      className="subject-detail-detail-value"
                    >
                      {activeSubject.email}
                    </a>
                  </div>
                )}
                {activeSubject.room && (
                  <div className="subject-detail-detail-row">
                    <span className="subject-detail-detail-label">
                      Raum
                    </span>
                    <span className="subject-detail-detail-value">
                      {activeSubject.room}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="home-section">
            <h2 className="section-head no-padding">Noten</h2>
            <p className="subject-detail-subheadline">Tippe auf eine Note, um diese zu bearbeiten</p>
            {sortedGrades.length === 0 ? (
              <p>Keine Noten vorhanden</p>
            ) : (
              <div className="subject-detail-grades-list">
                {sortedGrades.map((grade, index) => {
                  const isEditing = editingIndex === index;
                  return (
                    <div
                      key={grade.id}
                      className={`subject-detail-grade-card ${
                        isEditing ? "editing" : ""
                      }`}
                      onClick={() => handleEditClick(index)}
                    >
                      <div className="subject-detail-grade-main">
                        <div className="subject-detail-grade-header">
                          <div className="subject-detail-grade-meta">
                            <div className="subject-detail-grade-type-row">
                              <div className="subject-detail-grade-type">
                                {isEditing ? (
                                  <select
                                    value={editedGrade.weight}
                                    className="form-input small"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setEditedGrade({
                                        ...editedGrade,
                                        weight: Number(e.target.value),
                                      })
                                    }
                                  >
                                    {activeSubject.type === 0 ? (
                                      <>
                                        <option value={3}>Fachreferat</option>
                                        <option value={1}>Kurzarbeit</option>
                                        <option value={0}>Mündlich</option>
                                      </>
                                    ) : (
                                      <>
                                        <option value={3}>Fachreferat</option>
                                        <option value={2}>Schulaufgabe</option>
                                        <option value={1}>Kurzarbeit</option>
                                        <option value={0}>Mündlich</option>
                                      </>
                                    )}
                                  </select>
                                ) : (
                                  <>
                                    {grade.weight === 0
                                      ? "Mündlich"
                                      : grade.weight === 1
                                      ? "Kurzarbeit"
                                      : grade.weight === 2
                                      ? "Schulaufgabe"
                                      : "Fachreferat"}
                                  </>
                                )}
                              </div>
                              <div className="subject-detail-grade-halfyear">
                                {isEditing ? (
                                  <select
                                    value={editedGrade.halfYear ?? 1}
                                    className="form-input small"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setEditedGrade({
                                        ...editedGrade,
                                        halfYear: Number(
                                          e.target.value
                                        ) as 1 | 2,
                                      })
                                    }
                                  >
                                    <option value={1}>1. Hj</option>
                                    <option value={2}>2. Hj</option>
                                  </select>
                                ) : (
                                  typeof grade.halfYear === "number" && (
                                    <span>
                                      {grade.halfYear === 1 ? "1. Hj" : "2. Hj"}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="subject-detail-grade-date">
                              {isEditing ? (
                                <input
                                  type="date"
                                  className="form-input small"
                                  value={editedGrade.date
                                    .toDate()
                                    .toISOString()
                                    .slice(0, 10)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setEditedGrade({
                                      ...editedGrade,
                                      date: Timestamp.fromDate(
                                        new Date(e.target.value)
                                      ),
                                    })
                                  }
                                />
                              ) : (
                                grade.date.toDate().toLocaleDateString()
                              )}
                            </div>
                          </div>
                          <div className="subject-detail-grade-value">
                            {isEditing ? (
                              <input
                                type="number"
                                className="form-input small"
                                value={editedGrade.grade}
                                min={0}
                                max={15}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  setEditedGrade({
                                    ...editedGrade,
                                    grade: Number(e.target.value),
                                  })
                                }
                              />
                            ) : (
                              <span
                                className={`subject-detail-grade-pill ${getGradeClass(
                                  grade.grade
                                )}`}
                              >
                                {grade.grade}
                              </span>
                            )}
                          </div>
                        </div>
                          <div className="subject-detail-grade-footer">
                            <div className="subject-detail-grade-note">
                            {grade.note ? (
                              <button
                                type="button"
                                className="link-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openNoteModal(grade.id);
                                }}
                              >
                                Notiz anzeigen
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="link-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openNoteModal(grade.id);
                                }}
                              >
                                Notiz hinzufügen
                              </button>
                            )}
                          </div>
                          <div className="subject-detail-grade-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="btn-small btn-small--save"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveClick(grade.id);
                                  }}
                                >
                                  <SaveIcon size={18} className="icon-save" />{" "}
                                  Speichern
                                </button>
                                <button
                                  className="btn-small btn-small--cancel"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingIndex(null);
                                  }}
                                >
                                  <CancelIcon
                                    size={18}
                                    className="icon-cancel"
                                  />{" "}
                                  Abbrechen
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-small"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(index);
                                  }}
                                >
                                  <EditIcon size={18} className="icon-edit" />{" "}
                                  Bearbeiten
                                </button>
                                <button
                                  className="btn-small btn-small--delete"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(grade.id);
                                  }}
                                >
                                  <DeleteIcon
                                    size={18}
                                    className="icon-delete"
                                  />{" "}
                                  Löschen
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
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
        defaultSubjectId={subjectId}
      />

      {noteModalOpen && (
        <div className="modal-wrapper">
          <div className="modal-background" onClick={closeNoteModal}></div>
          <div className="modal">
            <h2 className="section-head no-padding">Notiz bearbeiten</h2>
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Notiz</label>
              <textarea
                className="form-input hidden-textarea"
                value={noteModalValue}
                onChange={(e) => setNoteModalValue(e.target.value)}
                placeholder="Notiz zur Note eingeben ..."
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <button
                type="button"
                className="btn-small btn-small--cancel"
                onClick={closeNoteModal}
              >
                <CancelIcon size={18} /> Abbrechen
              </button>
              <button
                type="button"
                className="btn-small btn-small--save"
                onClick={handleSaveNote}
              >
                <SaveIcon size={18} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="modal-wrapper">
          <div className="modal-background" onClick={closeDeleteModal}></div>
          <div className="modal">
            <h2 className="section-head no-padding">Note löschen?</h2>
            <p style={{ marginTop: "12px", fontSize: "14px" }}>
              Möchtest du diese Note wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
              >
                <CancelIcon size={18} /> Abbrechen
              </button>
              <button
                type="button"
                className="btn-small btn-small--delete"
                onClick={handleConfirmDelete}
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
