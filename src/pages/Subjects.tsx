import { useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, GradeWithId } from "../interfaces/Grade";
import { db } from "../firebase/firebaseConfig";
import { useGrades } from "../context/gradesContext/useGrades";
import { useAuth } from "../context/authcontext/useAuth";
import { decryptString } from "../services/cryptoService";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import Loading from "../components/Loading";
import { CancelIcon, DeleteIcon, EditIcon, SaveIcon } from "../components/icons";

export default function SubjectsPage() {
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
    refresh,
  } = useGrades();

  const [editingSubjectName, setEditingSubjectName] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState<string>("");
  const [editTeacher, setEditTeacher] = useState<string>("");
  const [editRoom, setEditRoom] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editAlias, setEditAlias] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalSubjectName, setDeleteModalSubjectName] = useState<
    string | null
  >(null);

  const sortedSubjects = useMemo(
    () =>
      [...subjects].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      ),
    [subjects]
  );

  const mainSubjectsCount = useMemo(
    () => subjects.filter((s) => s.type === 1).length,
    [subjects]
  );

  const minorSubjectsCount = useMemo(
    () => subjects.filter((s) => s.type === 0).length,
    [subjects]
  );

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
    subjectId: string,
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

    addGrade(subjectId, gradeWithId);
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubjectName(subject.name);
    setEditName(subject.name);
    setEditTeacher(subject.teacher ?? "");
    setEditRoom(subject.room ?? "");
    setEditEmail(subject.email ?? "");
    setEditAlias(subject.alias ?? "");
  };

  const cancelEditSubject = () => {
    setEditingSubjectName(null);
    setEditName("");
    setEditTeacher("");
    setEditRoom("");
    setEditEmail("");
    setEditAlias("");
  };

  const handleSaveSubject = async (subjectName: string) => {
    if (!user || !subjectName || isSaving) return;

    const newName = editName.trim();
    if (!newName) return;

    if (
      newName !== subjectName &&
      subjects.some(
        (s) => s.name.toLowerCase() === newName.toLowerCase()
      )
    ) {
      alert("Ein Fach mit diesem Namen existiert bereits.");
      return;
    }

    try {
      setIsSaving(true);
      const originalSubject = subjects.find((s) => s.name === subjectName);
      if (!originalSubject) return;

      if (newName === subjectName) {
        const subjectDocRef = doc(db, "users", user.uid, "subjects", subjectName);
        await updateDoc(subjectDocRef, {
          teacher: editTeacher || null,
          room: editRoom || null,
          email: editEmail || null,
          alias: editAlias || null,
        });
      } else {
        const oldSubjectDocRef = doc(db, "users", user.uid, "subjects", subjectName);
        const newSubjectDocRef = doc(db, "users", user.uid, "subjects", newName);

        const newSubjectData: Subject = {
          ...originalSubject,
          name: newName,
          teacher: editTeacher || undefined,
          room: editRoom || undefined,
          email: editEmail || undefined,
          alias: editAlias || undefined,
        };

        await setDoc(newSubjectDocRef, newSubjectData);

        const oldGradesRef = collection(
          db,
          "users",
          user.uid,
          "subjects",
          subjectName,
          "grades"
        );
        const newGradesRef = collection(
          db,
          "users",
          user.uid,
          "subjects",
          newName,
          "grades"
        );

        const gradesSnapshot = await getDocs(oldGradesRef);

        const copyPromises = gradesSnapshot.docs.map((gradeDoc) =>
          setDoc(doc(newGradesRef, gradeDoc.id), gradeDoc.data())
        );
        await Promise.all(copyPromises);

        const deleteGradePromises = gradesSnapshot.docs.map((gradeDoc) =>
          deleteDoc(gradeDoc.ref)
        );
        await Promise.all(deleteGradePromises);

        await deleteDoc(oldSubjectDocRef);
      }

      await refresh();
      cancelEditSubject();
    } catch (err) {
      console.error("Fehler beim Speichern des Fachs:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (subjectName: string) => {
    setDeleteModalSubjectName(subjectName);
    setDeleteModalOpen(true);
    document.body.classList.add("scroll-disable");
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteModalSubjectName(null);
    document.body.classList.remove("scroll-disable");
  };

  const handleDeleteSubject = async (subjectName: string) => {
    if (!user || !subjectName || isDeleting) return;

    try {
      setIsDeleting(true);

      const subjectDocRef = doc(db, "users", user.uid, "subjects", subjectName);
      const gradesRef = collection(
        db,
        "users",
        user.uid,
        "subjects",
        subjectName,
        "grades"
      );
      const gradesSnapshot = await getDocs(gradesRef);

      const deletePromises = gradesSnapshot.docs.map((gradeDoc) =>
        deleteDoc(gradeDoc.ref)
      );
      await Promise.all(deletePromises);

      await deleteDoc(subjectDocRef);

      await refresh();

      if (editingSubjectName === subjectName) {
        cancelEditSubject();
      }
    } catch (err) {
      console.error("Fehler beim Löschen des Fachs:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalSubjectName) return;
    await handleDeleteSubject(deleteModalSubjectName);
    closeDeleteModal();
  };

  const formatSubjectType = (type: number) =>
    type === 1 ? "Hauptfach" : "Nebenfach";

  return (
    <div className="home-layout home-layout--home">
      {isLoading && <Loading progress={progress} label={loadingLabel} />}

      <header className="home-header">
        <BurgerMenu />
      </header>

      <main className="home-main">
        <div className="subjects-manage-wrapper">
          <header className="subjects-header-row">
            <div className="subjects-header-title">
              <h2 className="subjects-page-title">Fächerübersicht</h2>
              <p className="subjects-page-subtitle">
                Verwalte Fächer, Lehrkräfte und Räume.
              </p>
              <div className="subjects-manage-summary">
                <div className="subjects-manage-summary-card">
                  <span className="subjects-manage-summary-label">Fächer</span>
                  <span className="subjects-manage-summary-value">
                    {subjects.length}
                  </span>
                </div>
                <div className="subjects-manage-summary-card">
                  <span className="subjects-manage-summary-label">
                    Hauptfächer
                  </span>
                  <span className="subjects-manage-summary-value">
                    {mainSubjectsCount}
                  </span>
                </div>
                <div className="subjects-manage-summary-card">
                  <span className="subjects-manage-summary-label">
                    Nebenfächer
                  </span>
                  <span className="subjects-manage-summary-value">
                    {minorSubjectsCount}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {subjects.length === 0 ? (
            <p className="subjects-empty-hint">
              Du hast noch keine Fächer angelegt. Nutze unten die
              Schnellaktionen, um dein erstes Fach zu erstellen.
            </p>
          ) : (
            <section className="subjects-manage-section">
              <h3 className="subjects-manage-section-title">Alle Fächer</h3>
              <div className="subjects-manage-list">
                {sortedSubjects.map((subject) => {
                  const gradesCount =
                    (gradesBySubject[subject.name] || []).length;
                  const isEditing = editingSubjectName === subject.name;

                  return (
                    <article
                      key={subject.name}
                      className={
                        isEditing
                          ? "subject-card subject-card--editing"
                          : "subject-card"
                      }
                    >
                      <div className="subject-card-header">
                        <div className="subject-card-title-row">
                          {isEditing ? (
                            <input
                              className="form-input subject-card-name-input"
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Fachname"
                            />
                          ) : (
                            <span className="subject-card-title">
                              {subject.name}
                            </span>
                          )}
                          <span
                            className={`subject-tag ${
                              subject.type === 1
                                ? "subject-tag--main"
                                : "subject-tag--minor"
                            }`}
                          >
                            {formatSubjectType(subject.type)}
                          </span>
                        </div>
                        <div className="subject-card-counter">
                          {gradesCount}{" "}
                          {gradesCount === 1 ? "Note" : "Noten"}
                        </div>
                      </div>

                      <div className="subject-card-body">
                        {(isEditing || subject.teacher) && (
                          <div className="subject-card-field">
                            <span className="subject-card-label">
                              Lehrkraft
                            </span>
                            {isEditing ? (
                              <input
                                className="form-input"
                                type="text"
                                value={editTeacher}
                                onChange={(e) =>
                                  setEditTeacher(e.target.value)
                                }
                              />
                            ) : (
                              <span className="subject-card-value">
                                {subject.teacher}
                              </span>
                            )}
                          </div>
                        )}
                        {(isEditing || subject.room) && (
                          <div className="subject-card-field">
                            <span className="subject-card-label">Raum</span>
                            {isEditing ? (
                              <input
                                className="form-input"
                                type="text"
                                value={editRoom}
                                onChange={(e) =>
                                  setEditRoom(e.target.value)
                                }
                              />
                            ) : (
                              <span className="subject-card-value">
                                {subject.room}
                              </span>
                            )}
                          </div>
                        )}
                        {(isEditing || subject.email) && (
                          <div className="subject-card-field">
                            <span className="subject-card-label">E-Mail</span>
                            {isEditing ? (
                              <input
                                className="form-input"
                                type="email"
                                value={editEmail}
                                onChange={(e) =>
                                  setEditEmail(e.target.value)
                                }
                              />
                            ) : (
                              <span className="subject-card-value">
                                {subject.email}
                              </span>
                            )}
                          </div>
                        )}
                        {(isEditing || subject.alias) && (
                          <div className="subject-card-field">
                            <span className="subject-card-label">Kürzel</span>
                            {isEditing ? (
                              <input
                                className="form-input"
                                type="text"
                                value={editAlias}
                                onChange={(e) =>
                                  setEditAlias(e.target.value)
                                }
                              />
                            ) : (
                              <span className="subject-card-value">
                                {subject.alias}
                              </span>
                            )}
                          </div>
                        )}
                        {!isEditing &&
                          !subject.teacher &&
                          !subject.room &&
                          !subject.email &&
                          !subject.alias && (
                            <span className="subject-card-value subject-card-value--empty">
                              Keine Details hinzugefügt
                            </span>
                          )}
                      </div>

                      <div className="subject-card-footer">
                        {isEditing ? (
                          <>
                            <button
                              className="btn-small btn-small--save"
                              type="button"
                              onClick={() => handleSaveSubject(subject.name)}
                              disabled={isSaving}
                            >
                              <SaveIcon size={18} className="icon-save" />{" "}
                              {isSaving ? "Speichern..." : "Speichern"}
                            </button>
                            <button
                              className="btn-small btn-small--cancel"
                              type="button"
                              onClick={cancelEditSubject}
                              disabled={isSaving}
                            >
                              <CancelIcon size={18} className="icon-cancel" />{" "}
                              Abbrechen
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-small"
                              type="button"
                              onClick={() => startEditSubject(subject)}
                              disabled={isDeleting}
                            >
                              <EditIcon size={18} className="icon-edit" />{" "}
                              Bearbeiten
                            </button>
                            <button
                              className="btn-small btn-small--delete"
                              type="button"
                              onClick={() => openDeleteModal(subject.name)}
                              disabled={isDeleting}
                            >
                              <DeleteIcon
                                size={18}
                                className="icon-delete"
                              />{" "}
                              {isDeleting ? "Lösche..." : "Löschen"}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <BottomNav
        subjects={subjects}
        encryptionKey={encryptionKey}
        onAddGradeToState={handleAddGradeToState}
        onAddSubjectToState={handleAddSubjectToState}
        isFirstSubject={isFirstSubject}
        disableAddGrade={disableAddGrade}
        addGradeTitle={addGradeTitle}
      />

      {deleteModalOpen && (
        <div className="modal-wrapper">
          <div className="modal-background" onClick={closeDeleteModal}></div>
          <div className="modal">
            <h2 className="section-head no-padding">Fach löschen?</h2>
            <p style={{ marginTop: "12px", fontSize: "14px" }}>
              Möchtest du dieses Fach wirklich löschen? Alle zugehörigen
              Noten werden ebenfalls gelöscht. Diese Aktion kann nicht
              rückgängig gemacht werden.
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
