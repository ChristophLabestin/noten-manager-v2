import { useEffect, useMemo, useState } from "react";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import Loading from "../components/Loading";
import { useGrades } from "../context/gradesContext/useGrades";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, GradeWithId } from "../interfaces/Grade";
import { db } from "../firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { decryptString, encryptString } from "../services/cryptoService";

interface ExamStateItem {
  writtenPoints: number | null;
  oralPoints: number | null;
  combinedPoints: number | null;
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

const calculateHalfYearAverageForSubject = (
  grades: GradeWithId[],
  subjectType: number,
  halfYear: 1 | 2
): number | null => {
  const filtered = grades.filter((grade) => grade.halfYear === halfYear);

  if (!filtered.length) return null;

  let total = 0;
  let totalWeight = 0;

  for (const grade of filtered) {
    const weight = calculateGradeWeightForSubject(subjectType, grade);
    total += grade.grade * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return total / totalWeight;
};

const computeExamPoints = (
  writtenPoints: number | null,
  oralPoints: number | null
): number | null => {
  if (writtenPoints === null && oralPoints === null) return null;
  if (writtenPoints !== null && oralPoints !== null) {
    return (2 * writtenPoints + oralPoints) / 3;
  }
  if (writtenPoints !== null) return writtenPoints;
  return oralPoints;
};

export default function Abitur() {
  const { user } = useAuth();
  const {
    subjects,
    encryptionKey,
    isLoading,
    loadingLabel,
    progress,
    addSubject,
    addGrade,
    updateSubject,
    gradesBySubject,
    fachreferat,
  } = useGrades();

  const hasFachreferat = !!fachreferat;

  const [examState, setExamState] = useState<ExamState>({});
  const [activeModal, setActiveModal] = useState<
    | null
    | { type: "written"; subject: Subject }
    | { type: "oral"; subject: Subject }
  >(null);

  useEffect(() => {
    if (!encryptionKey) {
      setExamState({});
      return;
    }

    let cancelled = false;

    const loadExamState = async () => {
      const nextState: ExamState = {};

      for (const subject of subjects) {
        let writtenPoints: number | null = null;
        let oralPoints: number | null = null;
        let combinedPoints: number | null = null;

        if (subject.writtenExamPointsEncrypted) {
          try {
            const decrypted = await decryptString(
              subject.writtenExamPointsEncrypted,
              encryptionKey
            );
            const num = Number(decrypted);
            writtenPoints = Number.isFinite(num) ? num : null;
          } catch {
            writtenPoints = null;
          }
        }

        if (subject.oralExamPointsEncrypted) {
          try {
            const decrypted = await decryptString(
              subject.oralExamPointsEncrypted,
              encryptionKey
            );
            const num = Number(decrypted);
            oralPoints = Number.isFinite(num) ? num : null;
          } catch {
            oralPoints = null;
          }
        }

        if (writtenPoints !== null || oralPoints !== null) {
          combinedPoints = computeExamPoints(writtenPoints, oralPoints);
        } else if (subject.examPointsEncrypted) {
          try {
            const decrypted = await decryptString(
              subject.examPointsEncrypted,
              encryptionKey
            );
            const num = Number(decrypted);
            combinedPoints = Number.isFinite(num) ? num : null;
            if (writtenPoints === null && combinedPoints !== null) {
              writtenPoints = combinedPoints;
            }
          } catch {
            combinedPoints = null;
          }
        }

        nextState[subject.name] = {
          writtenPoints,
          oralPoints,
          combinedPoints,
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

  const persistExamPoints = async (
    subject: Subject,
    writtenPoints: number | null,
    oralPoints: number | null,
    combinedPoints: number | null
  ) => {
    if (!user || !encryptionKey) return;

    const subjectDocRef = doc(db, "users", user.uid, "subjects", subject.name);

    let writtenEncrypted: string | undefined;
    let oralEncrypted: string | undefined;
    let combinedEncrypted: string | undefined;

    if (writtenPoints !== null) {
      writtenEncrypted = await encryptString(
        writtenPoints.toString(),
        encryptionKey
      );
    }

    if (oralPoints !== null) {
      oralEncrypted = await encryptString(
        oralPoints.toString(),
        encryptionKey
      );
    }

    if (combinedPoints !== null) {
      combinedEncrypted = await encryptString(
        combinedPoints.toString(),
        encryptionKey
      );
    }

    await updateDoc(subjectDocRef, {
      writtenExamPointsEncrypted: writtenEncrypted ?? null,
      oralExamPointsEncrypted: oralEncrypted ?? null,
      examPointsEncrypted: combinedEncrypted ?? null,
    });

    const updatedSubject: Subject = {
      ...subject,
      writtenExamPointsEncrypted: writtenEncrypted,
      oralExamPointsEncrypted: oralEncrypted,
      examPointsEncrypted: combinedEncrypted,
    };

    updateSubject(updatedSubject);
  };

  const updateExamState = (
    subjectName: string,
    updater: (prev: ExamStateItem | undefined) => ExamStateItem
  ) => {
    setExamState((prev) => ({
      ...prev,
      [subjectName]: updater(prev[subjectName]),
    }));
  };

  const handleWrittenPointsChange = async (
    subject: Subject,
    points: number
  ) => {
    const current = examState[subject.name];
    const oralPoints = current?.oralPoints ?? null;
    const writtenPoints = points;
    const combinedPoints = computeExamPoints(writtenPoints, oralPoints);

    updateExamState(subject.name, () => ({
      writtenPoints,
      oralPoints,
      combinedPoints,
      isSaving: true,
    }));

    try {
      await persistExamPoints(subject, writtenPoints, oralPoints, combinedPoints);
    } finally {
      updateExamState(subject.name, (prevItem) => ({
        ...(prevItem ?? {
          writtenPoints,
          oralPoints,
          combinedPoints,
        }),
        isSaving: false,
      }));
    }
  };

  const handleOralPointsChange = async (
    subject: Subject,
    points: number
  ) => {
    const current = examState[subject.name];
    const writtenPoints = current?.writtenPoints ?? null;
    const oralPoints = points;
    const combinedPoints = computeExamPoints(writtenPoints, oralPoints);

    updateExamState(subject.name, () => ({
      writtenPoints,
      oralPoints,
      combinedPoints,
      isSaving: true,
    }));

    try {
      await persistExamPoints(subject, writtenPoints, oralPoints, combinedPoints);
    } finally {
      updateExamState(subject.name, (prevItem) => ({
        ...(prevItem ?? {
          writtenPoints,
          oralPoints,
          combinedPoints,
        }),
        isSaving: false,
      }));
    }
  };

  const handleClearWrittenPoints = async (subject: Subject) => {
    const current = examState[subject.name];
    const oralPoints = current?.oralPoints ?? null;
    const writtenPoints = null;
    const combinedPoints = computeExamPoints(writtenPoints, oralPoints);

    updateExamState(subject.name, () => ({
      writtenPoints,
      oralPoints,
      combinedPoints,
      isSaving: true,
    }));

    try {
      await persistExamPoints(subject, writtenPoints, oralPoints, combinedPoints);
    } finally {
      updateExamState(subject.name, (prevItem) => ({
        ...(prevItem ?? {
          writtenPoints,
          oralPoints,
          combinedPoints,
        }),
        isSaving: false,
      }));
    }
  };

  const handleClearOralPoints = async (subject: Subject) => {
    const current = examState[subject.name];
    const writtenPoints = current?.writtenPoints ?? null;
    const oralPoints = null;
    const combinedPoints = computeExamPoints(writtenPoints, oralPoints);

    updateExamState(subject.name, () => ({
      writtenPoints,
      oralPoints,
      combinedPoints,
      isSaving: true,
    }));

    try {
      await persistExamPoints(subject, writtenPoints, oralPoints, combinedPoints);
    } finally {
      updateExamState(subject.name, (prevItem) => ({
        ...(prevItem ?? {
          writtenPoints,
          oralPoints,
          combinedPoints,
        }),
        isSaving: false,
      }));
    }
  };

  const handleClearAllExamPoints = async (subject: Subject) => {
    const writtenPoints = null;
    const oralPoints = null;
    const combinedPoints = null;

    updateExamState(subject.name, () => ({
      writtenPoints,
      oralPoints,
      combinedPoints,
      isSaving: true,
    }));

    try {
      await persistExamPoints(subject, writtenPoints, oralPoints, combinedPoints);
    } finally {
      updateExamState(subject.name, (prevItem) => ({
        ...(prevItem ?? {
          writtenPoints,
          oralPoints,
          combinedPoints,
        }),
        isSaving: false,
      }));
    }
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleOpenWrittenModal = (subject: Subject) => {
    setActiveModal({ type: "written", subject });
  };

  const handleOpenOralModal = (subject: Subject) => {
    const state = examState[subject.name];
    const hasOral =
      state?.oralPoints !== null && state?.oralPoints !== undefined;

    if (!hasOral && oralLimitReached) {
      return;
    }

    setActiveModal({ type: "oral", subject });
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

  const halfYearSummary = useMemo(
    () => {
      let totalPoints = 0;
      let count = 0;

      for (const subject of subjects) {
        // Fachreferat als eigenes Halbjahr behandeln, nicht als Fach
        if (subject.name === "Fachreferat") continue;

        const subjectGrades = gradesBySubject[subject.name] || [];
        const dropOption = subject.droppedHalfYear;

        const isHalfYear1Dropped = dropOption === 1;
        const isHalfYear2Dropped = dropOption === 2;

        const firstHalfYearAverage = isHalfYear1Dropped
          ? null
          : calculateHalfYearAverageForSubject(
              subjectGrades,
              subject.type,
              1
            );

        const secondHalfYearAverage = isHalfYear2Dropped
          ? null
          : calculateHalfYearAverageForSubject(
              subjectGrades,
              subject.type,
              2
            );

        if (firstHalfYearAverage !== null) {
          totalPoints += firstHalfYearAverage;
          count += 1;
        }

        if (secondHalfYearAverage !== null) {
          totalPoints += secondHalfYearAverage;
          count += 1;
        }
      }

      return { totalPoints, count };
    },
    [subjects, gradesBySubject]
  );

  const totalYearPoints =
    halfYearSummary.totalPoints + (fachreferat ? fachreferat.grade : 0);

  const examSubjects = useMemo(
    () => subjects.filter((subject) => subject.examSubject === true),
    [subjects]
  );

  const oralExamCount = useMemo(
    () =>
      examSubjects.reduce((sum, subject) => {
        const state = examState[subject.name];
        const hasOral =
          state?.oralPoints !== null && state?.oralPoints !== undefined;
        return sum + (hasOral ? 1 : 0);
      }, 0),
    [examSubjects, examState]
  );

  const oralLimitReached = oralExamCount >= 3;

  const totalExamPoints = useMemo(
    () =>
      examSubjects.reduce((sum, subject) => {
        const state = examState[subject.name];
        if (!state || state.combinedPoints === null) return sum;
        return sum + state.combinedPoints * 2;
      }, 0),
    [examSubjects, examState]
  );

  const maxYearPoints =
    halfYearSummary.count * 15 + (fachreferat ? 15 : 0);
  const maxExamPoints = examSubjects.length * 30;
  const totalPoints = totalYearPoints + totalExamPoints;
  const maxTotalPoints = maxYearPoints + maxExamPoints;

  const overallAverage =
    maxTotalPoints > 0 ? (totalPoints / maxTotalPoints) * 15 : null;

  const isFirstSubject = subjects.length === 0;

  const disableAddGrade = !encryptionKey || subjects.length === 0;

  const addGradeTitle = !encryptionKey
    ? "Lade Schl&uuml;ssel..."
    : subjects.length === 0
    ? "Lege zuerst ein Fach an"
    : "";

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

  return (
    <div className="home-layout final-grade-page">
      {isLoading && <Loading progress={progress} label={loadingLabel} />}

      <BurgerMenu
        isSmall
        title="Abschlusspr&uuml;fung"
        subtitle="Pr&uuml;fungsf&auml;cher &amp; Abiturnoten im Blick behalten"
      />

      <div className="home-summary single-column">
        <div className="home-summary-card home-summary-card--row">
          <span className="home-summary-label">Gesamtpunkte</span>
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
          <span className="home-summary-label">Abiturpr&uuml;fungen</span>
          <span className="home-summary-value home-summary-value-pill">
            {maxExamPoints > 0
              ? `${Math.round(totalExamPoints)} / ${maxExamPoints}`
              : "-"}
          </span>
        </div>
      </div>

      <section className="home-section" style={{margin: 0}}>
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Pr&uuml;fungsf&auml;cher</h2>
            <span className="subject-detail-subheadline">
              &Uuml;bersicht deiner Pr&uuml;fungsf&auml;cher. Die Auswahl kannst
              du in den Einstellungen anpassen.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {subjects.length === 0 ? (
            <p className="info-message">
              Lege zuerst F&auml;cher und Noten an, um deine Abiturpunkte zu
              berechnen.
            </p>
          ) : examSubjects.length === 0 ? (
            <p className="info-message">
              Du hast noch keine Pr&uuml;fungsf&auml;cher ausgew&auml;hlt. Du
              kannst sie in den Einstellungen festlegen.
            </p>
          ) : (
            <>
              <div className="final-grade-list">
                {examSubjects.map((subject) => {
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
                    </div>
                  </article>
                );
              })}
              </div>

              {oralLimitReached && (
                <p className="info-message">
                  Du hast bereits drei m&uuml;ndliche Pr&uuml;fungsnoten
                  eingetragen. Es k&ouml;nnen maximal drei m&uuml;ndliche
                  Pr&uuml;fungen ber&uuml;cksichtigt werden.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="home-section" style={{margin: 0}}>
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Abiturnoten</h2>
            <span className="subject-detail-subheadline">
              Trage die schriftliche und optional die m&uuml;ndliche Note pro
              Pr&uuml;fungsfach ein. Die Abiturnote wird berechnet als
              ((2&nbsp;&times;&nbsp;schriftlich) + m&uuml;ndlich) / 3.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {examSubjects.length === 0 ? (
            <p className="info-message">
              Lege in den Einstellungen zun&auml;chst deine Pr&uuml;fungsf&auml;cher
              fest, um Abiturnoten einzutragen.
            </p>
          ) : (
            <div className="final-grade-list">
              {examSubjects.map((subject) => {
                const state = examState[subject.name];
                const writtenPoints = state?.writtenPoints ?? null;
                const oralPoints = state?.oralPoints ?? null;
                const combinedPoints = state?.combinedPoints ?? null;

                return (
                  <article
                    key={`exam-${subject.name}`}
                    className="subject-card final-grade-card"
                  >
                    <header className="subject-card-header">
                      <h3 className="subject-card-title">
                        {subject.name} - Abiturnote
                      </h3>
                      <div
                        className={`subject-detail-summary-pill final-grade-pill ${getGradeClass(
                          combinedPoints
                        )}`}
                      >
                        {combinedPoints !== null
                          ? formatAverage(combinedPoints)
                          : "-"}
                      </div>
                    </header>
                    <div className="final-grade-card-body">
                      <div className="final-grade-halfyear-row">
                        <div className="final-grade-halfyear-main">
                          <button
                            type="button"
                            className="btn-small"
                            onClick={() => handleOpenWrittenModal(subject)}
                          >
                            {writtenPoints !== null
                              ? "Schriftliche Note anpassen"
                              : "Schriftliche Note eintragen"}
                          </button>
                        </div>
                        <span className="home-summary-label">
                          {writtenPoints !== null
                            ? `${writtenPoints} Punkte`
                            : "Nicht eingetragen"}
                        </span>
                      </div>

                      <div className="final-grade-halfyear-row">
                        <div className="final-grade-halfyear-main">
                          <button
                            type="button"
                            className="btn-small"
                            disabled={oralPoints === null && oralLimitReached}
                            onClick={() => handleOpenOralModal(subject)}
                          >
                            {oralPoints !== null
                              ? "Mündliche Note anpassen"
                              : "Mündliche Note eintragen"}
                          </button>
                        </div>
                        <span className="home-summary-label">
                          {oralPoints !== null
                            ? `${oralPoints} Punkte`
                            : "Nicht eingetragen"}
                        </span>
                      </div>

                      {(writtenPoints !== null || oralPoints !== null) && (
                        <button
                          type="button"
                          className="link-button link-button--danger link-button--danger-spacing small"
                          onClick={() => {
                            void handleClearAllExamPoints(subject);
                          }}
                        >
                          Schriftliche &amp; m&uuml;ndliche Note l&ouml;schen
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {oralLimitReached && (
        <section className="home-section" style={{margin: 0}}>
          <div className="home-section-body">
            <p className="info-message end-of-page">
              Du hast bereits drei m&uuml;ndliche Pr&uuml;fungsnoten
              eingetragen. Es k&ouml;nnen maximal drei m&uuml;ndliche
              Pr&uuml;fungen ber&uuml;cksichtigt werden.
            </p>
          </div>
        </section>
      )}

      <section className="home-section final-grade-disclaimer">
        <div className="home-section-body">
          <p className="info-message end-of-page">
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
        hasFachreferat={hasFachreferat}
      />

      {activeModal && (
        <div className="modal-wrapper">
          <div className="modal-background" onClick={closeModal}></div>
          <div className="modal">
            <div className="add-subject-form">
              <h2 className="section-headline">
                {activeModal.type === "written"
                  ? `Schriftliche Note in ${activeModal.subject.name}`
                  : `Mündliche Note in ${activeModal.subject.name}`}
              </h2>
              <div className="form-group">
                <label className="form-label">Punkte (15-0)</label>
                <div className="grade-points-group">
                  {Array.from({ length: 16 }, (_, index) => {
                    const value = 15 - index;
                    const current = examState[activeModal.subject.name];
                    const selected =
                      activeModal.type === "written"
                        ? current?.writtenPoints ?? null
                        : current?.oralPoints ?? null;
                    const isActive = selected === value;
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
                          name="exam-points-modal"
                          value={value}
                          checked={isActive}
                          onChange={() => {
                            if (activeModal.type === "written") {
                              void handleWrittenPointsChange(
                                activeModal.subject,
                                value
                              );
                            } else {
                              void handleOralPointsChange(
                                activeModal.subject,
                                value
                              );
                            }
                            closeModal();
                          }}
                        />
                        {value}
                      </label>
                    );
                  })}
                </div>
                {(() => {
                  const current = examState[activeModal.subject.name];
                  const hasValue =
                    activeModal.type === "written"
                      ? current?.writtenPoints !== null &&
                        current?.writtenPoints !== undefined
                      : current?.oralPoints !== null &&
                        current?.oralPoints !== undefined;
                  if (!hasValue) return null;
                  return (
                    <button
                      type="button"
                      className="link-button link-button--danger link-button--danger-spacing small"
                      onClick={() => {
                        if (activeModal.type === "written") {
                          void handleClearWrittenPoints(activeModal.subject);
                        } else {
                          void handleClearOralPoints(activeModal.subject);
                        }
                        closeModal();
                      }}
                    >
                      {activeModal.type === "written"
                        ? "Eingetragene schriftliche Note löschen"
                        : "Eingetragene mündliche Note löschen"}
                    </button>
                  );
                })()}
              </div>
              <button
                type="button"
                className="btn-secondary small"
                onClick={closeModal}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

















