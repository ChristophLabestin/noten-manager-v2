import { useEffect, useMemo, useState } from "react";
import { Timestamp, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/authcontext/useAuth";
import { useGrades } from "../context/gradesContext/useGrades";
import type { EncryptedGrade, GradeWithId } from "../interfaces/Grade";
import type { Subject } from "../interfaces/Subject";
import { db } from "../firebase/firebaseConfig";
import { decryptString, encryptString } from "../services/cryptoService";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import Loading from "../components/Loading";

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
    gradesBySubject,
    encryptionKey,
    isLoading,
    loadingLabel,
    progress,
    addSubject,
    addGrade,
    updateGrade,
  } = useGrades();

  const fachreferatSubject = useMemo(
    () => subjects.find((s) => s.name === FACHREFERAT_NAME),
    [subjects]
  );

  const fachreferatGrades = gradesBySubject[FACHREFERAT_NAME] || [];
  const existingGrade: GradeWithId | null =
    fachreferatGrades.length > 0 ? fachreferatGrades[0] : null;

  const [gradeValue, setGradeValue] = useState<string>(
    existingGrade ? String(existingGrade.grade) : ""
  );
  const [halfYear, setHalfYear] = useState<1 | 2>(
    (existingGrade?.halfYear as 1 | 2 | undefined) ?? 1
  );
  const [note, setNote] = useState<string>(existingGrade?.note ?? "");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (existingGrade) {
      setGradeValue(String(existingGrade.grade));
      setHalfYear((existingGrade.halfYear as 1 | 2 | undefined) ?? 1);
      setNote(existingGrade.note ?? "");
    }
  }, [existingGrade]);

  const isFirstSubject = subjects.filter((s) => s.name !== FACHREFERAT_NAME).length === 0;

  const disableAddGrade = useMemo(
    () =>
      !encryptionKey ||
      subjects.filter((s) => s.name !== FACHREFERAT_NAME).length === 0,
    [encryptionKey, subjects]
  );

  const addGradeTitle = useMemo(() => {
    if (!encryptionKey) return "Lade SchlǬssel...";
    if (subjects.filter((s) => s.name !== FACHREFERAT_NAME).length === 0)
      return "Lege zuerst ein Fach an";
    return "";
  }, [encryptionKey, subjects]);

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
    if (!user || !encryptionKey || !fachreferatSubject || !existingGrade) {
      return;
    }

    if (gradeValue === "") {
      alert("Bitte Notenpunkte auswählen.");
      return;
    }

    const gradeNumber = Number(gradeValue);
    if (!Number.isFinite(gradeNumber) || gradeNumber < 0 || gradeNumber > 15) {
      alert("Bitte eine gültige Punktzahl zwischen 0 und 15 eingeben.");
      return;
    }

    try {
      setIsSaving(true);

      const encryptedGradeStr = await encryptString(
        gradeNumber.toString(),
        encryptionKey
      );

      const gradeDocRef = doc(
        db,
        "users",
        user.uid,
        "subjects",
        fachreferatSubject.name,
        "grades",
        existingGrade.id
      );

      await updateDoc(gradeDocRef, {
        grade: encryptedGradeStr,
        weight: 3,
        date: existingGrade.date ?? Timestamp.fromDate(new Date()),
        note: note || null,
        halfYear,
      });

      const updatedGrade: GradeWithId = {
        ...existingGrade,
        grade: gradeNumber,
        weight: 3,
        note: note || undefined,
        halfYear,
      };

      updateGrade(fachreferatSubject.name, updatedGrade);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(
        "Fehler beim Speichern der Fachreferatsnote: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const currentGradeNumber = existingGrade ? existingGrade.grade : null;
  const gradeClass = getGradeClass(currentGradeNumber);

  return (
    <div className="subject-detail-page">
      {isLoading && <Loading progress={progress} label={loadingLabel} />}

      <header className="subject-detail-header">
        <BurgerMenu isSmall title="Fachreferat" />
      </header>

      <div className="subject-detail-content">
        <div className="subject-detail-main">
          <section className="home-summary two-columns subject-detail-summary">
            <div className="home-summary-card">
              <span className="home-summary-label">Fachreferat</span>
              <div
                className={`subject-detail-summary-pill ${gradeClass}`}
              >
                {currentGradeNumber === null
                  ? "-"
                  : currentGradeNumber.toFixed(1)}
              </div>
            </div>
            <div className="home-summary-card">
              <span className="home-summary-label">Halbjahr</span>
              <span className="subject-detail-summary-value home-summary-value-pill">
                {existingGrade?.halfYear === 2 ? "2. Hj" : "1. Hj"}
              </span>
            </div>
          </section>

          <section className="home-section subject-detail-grades-section">
            <div className="home-section-header-main">
              <h2 className="section-head no-padding">
                Fachreferatsnote bearbeiten
              </h2>
              <p className="subject-detail-subheadline">
                Du kannst hier die Punkte, das Halbjahr und die Notiz des
                Fachreferats anpassen. Es kann nur ein Fachreferat
                eingetragen werden.
              </p>
            </div>

            {!existingGrade ? (
              <p className="info-message">
                Du hast noch keine Fachreferatsnote eingetragen. Nutze die
                Aktion &quot;Fachreferat&quot; unten, um eine Note
                hinzuzufügen.
              </p>
            ) : (
              <div className="subject-detail-grades-list">
                <div className="subject-detail-grade-card editing">
                  <div className="subject-detail-grade-main">
                    <div className="subject-detail-grade-header">
                      <div className="subject-detail-grade-meta">
                        <div className="subject-detail-grade-type-row">
                          <div className="subject-detail-grade-type">
                            Fachreferat
                          </div>
                          <div className="subject-detail-grade-halfyear">
                            <select
                              className="form-input small"
                              value={halfYear}
                              onChange={(e) =>
                                setHalfYear(
                                  Number(e.target.value) as 1 | 2
                                )
                              }
                            >
                              <option value={1}>1. Hj</option>
                              <option value={2}>2. Hj</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`subject-detail-summary-pill ${getGradeClass(
                          gradeValue === "" ? null : Number(gradeValue)
                        )}`}
                      >
                        {gradeValue === "" ? "-" : gradeValue}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label className="form-label">
                        Punkte (0-15)
                      </label>
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

                    <button
                      className="btn-primary small"
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? "Speichern..." : "Änderungen speichern"}
                    </button>
                  </div>
                </div>
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
        hasFachreferat={true}
      />
    </div>
  );
}
