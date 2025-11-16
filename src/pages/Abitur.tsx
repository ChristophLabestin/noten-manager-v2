import { useEffect, useMemo, useState } from "react";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import Loading from "../components/Loading";
import { useGrades } from "../context/gradesContext/useGrades";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { GradeWithId } from "../interfaces/Grade";
import { db } from "../firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { decryptString, encryptString } from "../services/cryptoService";

type ExamType = "written" | "oral" | "presentation";

interface ExamStateItem {
  examSubject: boolean;
  examType: ExamType;
  examPoints: number | null;
  isSaving: boolean;
}

type ExamState = Record<string, ExamStateItem>;

const calculateGradeWeightForSubject = (
  subjectType: number,
  grade: GradeWithId
): number => {
  if (subjectType === 1) {
    return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1;
  }
  if (subjectType === 0) {
    return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1;
  }
  return 1;
};

const formatAverage = (value: number | null): string =>
  value === null ? "-" : value.toFixed(2);

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

export default function Abitur() {
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
    updateSubject,
  } = useGrades();

  const [examState, setExamState] = useState<ExamState>({});

  useEffect(() => {
    if (!encryptionKey) return;

    let cancelled = false;

    const loadExamState = async () => {
      const nextState: ExamState = {};

      for (const subject of subjects) {
        let examPoints: number | null = null;
        if (subject.examPointsEncrypted) {
          try {
            const decrypted = await decryptString(
              subject.examPointsEncrypted,
              encryptionKey
            );
            const num = Number(decrypted);
            examPoints = Number.isFinite(num) ? num : null;
          } catch {
            examPoints = null;
          }
        }

        nextState[subject.name] = {
          examSubject: subject.examSubject === true,
          examType: (subject.examType as ExamType) ?? "written",
          examPoints,
          isSaving: false,
        };
      }

      if (!cancelled) {
        setExamState(nextState);
      }
    };

    void loadExamState();

    return () => {
      cancelled = true;
    };
  }, [subjects, encryptionKey]);

  const handleToggleExamSubject = async (subject: Subject) => {
    if (!user) return;

    const current = examState[subject.name];
    const nextExamSubject = !(current?.examSubject ?? false);
    const nextExamType: ExamType = current?.examType ?? "written";

    setExamState((prev) => ({
      ...prev,
      [subject.name]: {
        examSubject: nextExamSubject,
        examType: nextExamType,
        examPoints: current?.examPoints ?? null,
        isSaving: true,
      },
    }));

    try {
      const subjectDocRef = doc(db, "users", user.uid, "subjects", subject.name);
      await updateDoc(subjectDocRef, {
        examSubject: nextExamSubject,
        examType: nextExamType,
      });

      const updatedSubject: Subject = {
        ...subject,
        examSubject: nextExamSubject,
        examType: nextExamType,
      };
      updateSubject(updatedSubject);
    } catch (err) {
      console.error(
        "[Abitur] Failed to update examSubject for subject:",
        subject.name,
        err
      );
    } finally {
      setExamState((prev) => ({
        ...prev,
        [subject.name]: {
          ...(prev[subject.name] ?? {
            examSubject: nextExamSubject,
            examType: nextExamType,
            examPoints: current?.examPoints ?? null,
          }),
          isSaving: false,
        },
      }));
    }
  };

  const handleExamTypeChange = async (subject: Subject, examType: ExamType) => {
    if (!user) return;

    const current = examState[subject.name];

    setExamState((prev) => ({
      ...prev,
      [subject.name]: {
        examSubject: current?.examSubject ?? false,
        examType,
        examPoints: current?.examPoints ?? null,
        isSaving: true,
      },
    }));

    try {
      const subjectDocRef = doc(db, "users", user.uid, "subjects", subject.name);
      await updateDoc(subjectDocRef, {
        examType,
      });

      const updatedSubject: Subject = {
        ...subject,
        examType,
      };
      updateSubject(updatedSubject);
    } catch (err) {
      console.error(
        "[Abitur] Failed to update examType for subject:",
        subject.name,
        err
      );
    } finally {
      setExamState((prev) => ({
        ...prev,
        [subject.name]: {
          ...(prev[subject.name] ?? {
            examSubject: current?.examSubject ?? false,
            examType,
            examPoints: current?.examPoints ?? null,
          }),
          isSaving: false,
        },
      }));
    }
  };

  const handleExamPointsChange = async (
    subject: Subject,
    points: number
  ) => {
    if (!user || !encryptionKey) return;

    const current = examState[subject.name];

    setExamState((prev) => ({
      ...prev,
      [subject.name]: {
        examSubject: current?.examSubject ?? false,
        examType: (current?.examType as ExamType) ?? "written",
        examPoints: points,
        isSaving: true,
      },
    }));

    try {
      const encrypted = await encryptString(points.toString(), encryptionKey);
      const subjectDocRef = doc(db, "users", user.uid, "subjects", subject.name);
      await updateDoc(subjectDocRef, {
        examPointsEncrypted: encrypted,
      });

      const updatedSubject: Subject = {
        ...subject,
        examPointsEncrypted: encrypted,
      };
      updateSubject(updatedSubject);
    } catch (err) {
      console.error(
        "[Abitur] Failed to update examPoints for subject:",
        subject.name,
        err
      );
    } finally {
      setExamState((prev) => ({
        ...prev,
        [subject.name]: {
          ...(prev[subject.name] ?? {
            examSubject: current?.examSubject ?? false,
            examType: (current?.examType as ExamType) ?? "written",
            examPoints: points,
          }),
          isSaving: false,
        },
      }));
    }
  };

  const subjectAverages = useMemo(() => {
    return subjects.map((subject) => {
      const grades = gradesBySubject[subject.name] || [];

      if (!grades.length) {
        return { subject, average: null as number | null };
      }

      let total = 0;
      let totalWeight = 0;

      for (const grade of grades) {
        const weight = calculateGradeWeightForSubject(subject.type, grade);
        total += grade.grade * weight;
        totalWeight += weight;
      }

      if (totalWeight === 0) {
        return { subject, average: null as number | null };
      }

      return { subject, average: total / totalWeight };
    });
  }, [subjects, gradesBySubject]);

  const totalYearPoints = useMemo(
    () =>
      subjectAverages.reduce((sum, entry) => {
        if (entry.average === null) return sum;
        return sum + entry.average;
      }, 0),
    [subjectAverages]
  );

  const yearSubjectsCount = useMemo(
    () =>
      subjectAverages.filter((entry) => entry.average !== null).length,
    [subjectAverages]
  );

  const examSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) => examState[subject.name]?.examSubject === true
      ),
    [subjects, examState]
  );

  const totalExamPoints = useMemo(
    () =>
      examSubjects.reduce((sum, subject) => {
        const state = examState[subject.name];
        if (!state || state.examPoints === null) return sum;
        return sum + state.examPoints;
      }, 0),
    [examSubjects, examState]
  );

  const maxYearPoints = yearSubjectsCount * 15;
  const maxExamPoints = examSubjects.length * 15;
  const totalPoints = totalYearPoints + totalExamPoints;
  const maxTotalPoints = maxYearPoints + maxExamPoints;

  const overallAverage =
    maxTotalPoints > 0 ? (totalPoints / maxTotalPoints) * 15 : null;

  const isFirstSubject = subjects.length === 0;

  const disableAddGrade = !encryptionKey || subjects.length === 0;

  const addGradeTitle = !encryptionKey
    ? "Lade Schlüssel..."
    : subjects.length === 0
    ? "Lege zuerst ein Fach an"
    : "";

  const handleAddSubjectToState = (newSubject: Subject) => {
    addSubject(newSubject);
  };

  const handleAddGradeToState = (
    subjectId: string,
    gradeId: string,
    grade: GradeWithId
  ) => {
    addGrade(subjectId, grade);
  };

  return (
    <div className="home-layout final-grade-page">
      {isLoading && <Loading progress={progress} label={loadingLabel} />}

      <BurgerMenu
        isSmall
        title="Abitur (FOS/BOS)"
        subtitle="Prüfungsfächer wählen und Punkte berechnen"
      />

      <div className="home-summary single-column">
        <div className="home-summary-card home-summary-card--row">
          <span className="home-summary-label">Gesamtpunkte (Orientierung)</span>
          <div
            className={`subject-detail-summary-pill ${getGradeClass(
              overallAverage
            )}`}
          >
            {maxTotalPoints > 0
              ? `${Math.round(totalPoints)} / ${Math.round(maxTotalPoints)}`
              : "-"}
          </div>
        </div>
      </div>

      <div className="home-summary two-columns">
        <div className="home-summary-card">
          <span className="home-summary-label">Jahresleistungen</span>
          <span className="home-summary-value home-summary-value-pill">
            {maxYearPoints > 0
              ? `${Math.round(totalYearPoints)} / ${maxYearPoints}`
              : "-"}
          </span>
        </div>
        <div className="home-summary-card">
          <span className="home-summary-label">Abiturprüfungen</span>
          <span className="home-summary-value home-summary-value-pill">
            {maxExamPoints > 0
              ? `${Math.round(totalExamPoints)} / ${maxExamPoints}`
              : "-"}
          </span>
        </div>
      </div>

      <section className="home-section">
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Prüfungsfächer</h2>
            <span className="subject-detail-subheadline">
              Wähle die Fächer, in denen du deine Abschlussprüfung schreibst.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {subjects.length === 0 ? (
            <p className="info-message">
              Lege zuerst Fächer und Noten an, um deine Abiturpunkte zu
              berechnen.
            </p>
          ) : (
            <div className="final-grade-list">
              {subjects.map((subject) => {
                const state = examState[subject.name];
                const isExamSubject = state?.examSubject ?? false;
                const examType = state?.examType ?? "written";

                const subjectAverageEntry = subjectAverages.find(
                  (entry) => entry.subject.name === subject.name
                );
                const subjectAverage = subjectAverageEntry?.average ?? null;

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
                      <div className="final-grade-average">
                        <span className="home-summary-label">
                          Jahresdurchschnitt
                        </span>
                        <div
                          className={`subject-detail-summary-pill final-grade-pill ${getGradeClass(
                            subjectAverage
                          )}`}
                        >
                          {formatAverage(subjectAverage)}
                        </div>
                      </div>

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
                            Prüfungsfach
                          </span>
                        </div>
                        <div className="final-grade-halfyear-main">
                          <select
                            className="form-input small"
                            value={examType}
                            onChange={(event) =>
                              handleExamTypeChange(
                                subject,
                                event.target.value as ExamType
                              )
                            }
                          >
                            <option value="written">Schriftlich</option>
                            <option value="oral">Mündlich</option>
                            <option value="presentation">
                              Präsentation / Kolloquium
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Abiturnoten</h2>
            <span className="subject-detail-subheadline">
              Trage die erreichten Punkte in den Prüfungsfächern ein.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {examSubjects.length === 0 ? (
            <p className="info-message">
              Wähle oben mindestens ein Prüfungsfach aus, um Abiturnoten
              einzutragen.
            </p>
          ) : (
            <div className="final-grade-list">
              {examSubjects.map((subject) => {
                const state = examState[subject.name];
                const selectedPoints = state?.examPoints;

                return (
                  <article
                    key={`exam-${subject.name}`}
                    className="subject-card final-grade-card"
                  >
                    <header className="subject-card-header">
                      <h3 className="subject-card-title">
                        {subject.name} – Abiturnote
                      </h3>
                    </header>
                    <div className="final-grade-card-body">
                      <div className="form-group">
                        <label className="form-label">
                          Punkte (0–15)
                        </label>
                        <div className="grade-points-group">
                          {Array.from({ length: 16 }, (_, index) => {
                            const value = 15 - index;
                            const isActive = selectedPoints === value;
                            const category = getGradeCategory(value);
                            const classes = [
                              "grade-point-pill",
                              `grade-point-pill--${category}`,
                              isActive ? "grade-point-pill--active" : "",
                            ]
                              .filter(Boolean)
                              .join(" ");
                            return (
                              <label
                                key={value}
                                className={classes}
                              >
                                <input
                                  type="radio"
                                  name={`exam-points-${subject.name}`}
                                  value={value}
                                  checked={isActive}
                                  onChange={() =>
                                    handleExamPointsChange(subject, value)
                                  }
                                />
                                {value}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="home-section final-grade-disclaimer">
        <div className="home-section-body">
          <p className="info-message">
            Hinweis: Die hier berechneten Punkte dienen dir als Orientierung
            f&uuml;r dein Abitur an der FOS/BOS in Bayern. Es handelt sich nicht
            um eine offizielle Berechnung nach FOBOSO. F&uuml;r verbindliche
            Ausk&uuml;nfte wende dich bitte an deine Schule.
          </p>
        </div>
      </section>

      <BottomNav
        subjects={subjects}
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

