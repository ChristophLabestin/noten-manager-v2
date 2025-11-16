import { useEffect, useMemo, useState } from "react";
import BurgerMenu from "../components/BurgerMenu";
import BottomNav from "../components/BottomNav";
import Loading from "../components/Loading";
import { useGrades } from "../context/gradesContext/useGrades";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, Grade, GradeWithId } from "../interfaces/Grade";
import { decryptString } from "../services/cryptoService";
import { db } from "../firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { navigate } from "../services/navigation";

type HalfYearDropOption = "none" | 1 | 2;

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

const formatAverage = (value: number | null): string =>
  value === null ? "-" : value.toFixed(2);

const getGradeClass = (value: number | null): string => {
  if (value === null) return "";
  if (value >= 7) return "good";
  if (value >= 4) return "medium";
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

export default function FinalGrade() {
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
    subjectSortMode,
    subjectSortOrder,
  } = useGrades();

  const [dropSelections, setDropSelections] = useState<
    Record<string, HalfYearDropOption>
  >({});

  useEffect(() => {
    setDropSelections((prev) => {
      const next: Record<string, HalfYearDropOption> = {};
      for (const subject of subjects) {
        const persisted = subject.droppedHalfYear;
        if (persisted === 1 || persisted === 2) {
          next[subject.name] = persisted;
        } else {
          next[subject.name] = prev[subject.name] ?? "none";
        }
      }
      return next;
    });
  }, [subjects]);

  const persistDroppedHalfYear = async (
    subjectName: string,
    value: HalfYearDropOption
  ) => {
    if (!user) return;

    try {
      const subjectDocRef = doc(db, "users", user.uid, "subjects", subjectName);
      await updateDoc(subjectDocRef, {
        droppedHalfYear: value === "none" ? null : value,
      });
    } catch (err) {
      console.error(
        "[FinalGrade] Failed to update droppedHalfYear for subject:",
        subjectName,
        err
      );
    }
  };

  const handleToggleHalfYear = (subjectName: string, halfYear: 1 | 2) => {
    setDropSelections((prev) => {
      const current = prev[subjectName] ?? "none";

      let next: HalfYearDropOption = current;

      if (current === halfYear) {
        next = "none";
      } else {
        const currentSelectedCount = Object.values(prev).filter(
          (value) => value === 1 || value === 2
        ).length;

        const currentlyHasDrop = current === 1 || current === 2;
        const willAddNewDrop = !currentlyHasDrop;

        if (willAddNewDrop && currentSelectedCount >= 3) {
          return prev;
        }

        next = halfYear;
      }

      void persistDroppedHalfYear(subjectName, next);

      return {
        ...prev,
        [subjectName]: next,
      };
    });
  };

  const selectedDropCount = useMemo(
    () =>
      Object.values(dropSelections).filter(
        (value) => value === 1 || value === 2
      ).length,
    [dropSelections]
  );

  const filteredSubjectGrades = useMemo(() => {
    const result: Record<string, GradeWithId[]> = {};

    for (const subject of subjects) {
      const grades = gradesBySubject[subject.name] || [];
      const dropOption = dropSelections[subject.name];

      const filtered = grades.filter((grade) => {
        if (dropOption === 1 || dropOption === 2) {
          if (grade.halfYear === dropOption) {
            return false;
          }
        }
        return true;
      });

      result[subject.name] = filtered;
    }

    return result;
  }, [subjects, gradesBySubject, dropSelections]);

  const droppedHalfYears = useMemo(
    () =>
      subjects
        .map((subject) => ({
          subject,
          halfYear: dropSelections[subject.name],
        }))
        .filter(
          (
            entry
          ): entry is { subject: Subject; halfYear: Exclude<HalfYearDropOption, "none"> } =>
            entry.halfYear === 1 || entry.halfYear === 2
        ),
    [subjects, dropSelections]
  );

  const subjectAverages = useMemo(() => {
    return subjects.map((subject) => {
      const grades = filteredSubjectGrades[subject.name] || [];

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
  }, [subjects, filteredSubjectGrades]);

  const sortedSubjects = useMemo(() => {
    if (subjects.length === 0) return [];

    const getSubjectAverageForSort = (subject: Subject): number | null => {
      const grades = filteredSubjectGrades[subject.name] || [];
      if (!grades.length) return null;

      let total = 0;
      let totalWeight = 0;

      for (const grade of grades) {
        const weight = calculateGradeWeightForSubject(subject.type, grade);
        total += grade.grade * weight;
        totalWeight += weight;
      }

      if (totalWeight === 0) return null;
      return total / totalWeight;
    };

    if (subjectSortMode === "name") {
      return [...subjects].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de")
      );
    }

    if (subjectSortMode === "name_desc") {
      return [...subjects].sort((a, b) =>
        b.name.toLowerCase().localeCompare(a.name.toLowerCase(), "de")
      );
    }

    if (subjectSortMode === "average") {
      return [...subjects].sort((a, b) => {
        const avgA = getSubjectAverageForSort(a);
        const avgB = getSubjectAverageForSort(b);

        if (avgA === null && avgB === null) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de");
        }
        if (avgA === null) return 1;
        if (avgB === null) return -1;

        return avgB - avgA;
      });
    }

    if (subjectSortMode === "average_worst") {
      return [...subjects].sort((a, b) => {
        const avgA = getSubjectAverageForSort(a);
        const avgB = getSubjectAverageForSort(b);

        if (avgA === null && avgB === null) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de");
        }
        if (avgA === null) return -1;
        if (avgB === null) return 1;

        return avgA - avgB;
      });
    }

    if (subjectSortMode === "custom") {
      if (!subjectSortOrder.length) {
        return [...subjects].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de")
        );
      }

      const orderMap = new Map<string, number>();
      subjectSortOrder.forEach((name, index) => {
        orderMap.set(name, index);
      });

      return [...subjects].sort((a, b) => {
        const indexA = orderMap.get(a.name);
        const indexB = orderMap.get(b.name);

        if (indexA === undefined && indexB === undefined) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de");
        }
        if (indexA === undefined) return 1;
        if (indexB === undefined) return -1;

        return indexA - indexB;
      });
    }

    return subjects;
  }, [subjects, filteredSubjectGrades, subjectSortMode, subjectSortOrder]);

  const finalAverage = useMemo(() => {
    if (subjects.length === 0) return null;

    let total = 0;
    let totalWeight = 0;

    for (const subject of subjects) {
      const grades = filteredSubjectGrades[subject.name] || [];
      for (const grade of grades) {
        const weight = calculateGradeWeightForSubject(subject.type, grade);
        total += grade.grade * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return null;
    return total / totalWeight;
  }, [subjects, filteredSubjectGrades]);

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

  return (
    <div className="home-layout final-grade-page">
      {isLoading && <Loading progress={progress} label={loadingLabel} />}

      <BurgerMenu
        isSmall
        title="Abschlussnote"
        subtitle="Halbjahre streichen und Abschlussnote berechnen"
      />
      <div className="home-summary single-column">
        <div className="home-summary-card home-summary-card--row">
          <span className="home-summary-label final-grade-label">Abschlussnote</span>
          <div
            className={`subject-detail-summary-pill ${getGradeClass(
              finalAverage
            )}`}
          >
            {formatAverage(finalAverage)}
          </div>
        </div>
        <div className="home-summary-card home-summary-card--row">
          <div className="home-summary-card-text">
            <span className="home-summary-label">Abitur (FOS/BOS)</span>
            <span className="subject-detail-subheadline">
              Prüfungsfächer wählen und Abiturpunkte berechnen.
            </span>
          </div>
          <button
            type="button"
            className="btn-primary small"
            onClick={() => navigate("/abitur")}
          >
            Abitur-Rechner
          </button>
        </div>
      </div>

      <div className="home-summary two-columns">
        <div className="home-summary-card">
          <span className="home-summary-label">Fächer</span>
          <span className="home-summary-value home-summary-value-pill">
            {subjects.length}
          </span>
        </div>
        <div className="home-summary-card">
          <span className="home-summary-label">Halbjahre</span>
          <span className="home-summary-value home-summary-value-pill">
            {selectedDropCount} / 3
          </span>
        </div>
      </div>

      <section className="home-section final-grade-dropped-section">
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Gestrichene Halbjahre</h2>
            <span className="subject-detail-subheadline">
              Maximal drei Halbjahre können gestrichen werden.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {droppedHalfYears.length === 0 ? (
            <p className="info-message">
              Du hast noch kein Halbjahr gestrichen.
            </p>
          ) : (
            <ul className="final-grade-dropped-list">
              {droppedHalfYears.map(({ subject, halfYear }) => {
                const subjectGrades = gradesBySubject[subject.name] || [];
                const droppedAverage =
                  calculateHalfYearAverageForSubject(
                    subjectGrades,
                    subject.type,
                    halfYear
                  );

                return (
                  <li
                    key={`${subject.name}-${halfYear}`}
                    className="final-grade-dropped-item"
                  >
                    <div className="final-grade-dropped-main">
                      <span className="final-grade-dropped-subject">
                        {subject.name}
                      </span>
                      <span className="final-grade-dropped-halfyear-tag">
                        {halfYear === 1 ? "1. Halbjahr" : "2. Halbjahr"}
                      </span>
                    </div>
                    <div
                      className={`subject-detail-summary-pill final-grade-pill final-grade-halfyear-pill final-grade-halfyear-pill--dropped ${getGradeClass(
                        droppedAverage
                      )}`}
                    >
                      {formatAverage(droppedAverage)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="home-section" style={{ marginTop: 0 }}>
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Fächer</h2>
            <span className="subject-detail-subheadline">
              Streiche die Noten des gewählten Halbjahres.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {subjects.length === 0 ? (
            <p className="info-message">
              Lege zuerst Fächer und Noten an, um deine Abschlussnote zu
              berechnen.
            </p>
          ) : (
            <div className="final-grade-list">
              {sortedSubjects.map((subject) => {
                const dropOption = dropSelections[subject.name] ?? "none";
                const isHalfYear1Selected = dropOption === 1;
                const isHalfYear2Selected = dropOption === 2;

                const disableHalfYear1 =
                  (selectedDropCount >= 3 && !isHalfYear1Selected) ||
                  isHalfYear2Selected;
                const disableHalfYear2 =
                  (selectedDropCount >= 3 && !isHalfYear2Selected) ||
                  isHalfYear1Selected;

                const subjectAverageEntry = subjectAverages.find(
                  (entry) => entry.subject.name === subject.name
                );
                const subjectAverage = subjectAverageEntry?.average ?? null;

                const subjectGrades = gradesBySubject[subject.name] || [];
                const firstHalfYearAverage =
                  calculateHalfYearAverageForSubject(
                    subjectGrades,
                    subject.type,
                    1
                  );
                const secondHalfYearAverage =
                  calculateHalfYearAverageForSubject(
                    subjectGrades,
                    subject.type,
                    2
                  );

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
                          Fach-Durchschnitt
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
                              isHalfYear1Selected ? "settings-switch--on" : ""
                            } ${
                              disableHalfYear1
                                ? "final-grade-switch--disabled"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isHalfYear1Selected}
                              disabled={disableHalfYear1}
                              onChange={() =>
                                handleToggleHalfYear(subject.name, 1)
                              }
                            />
                            <span className="settings-switch-slider" />
                          </label>
                          <span className="home-summary-label">
                            1. Halbjahr
                          </span>
                        </div>
                        <div
                          className={`subject-detail-summary-pill final-grade-pill final-grade-halfyear-pill ${
                            isHalfYear1Selected
                              ? "final-grade-halfyear-pill--dropped"
                              : ""
                          } ${getGradeClass(firstHalfYearAverage)}`}
                        >
                          {formatAverage(firstHalfYearAverage)}
                        </div>
                      </div>

                      <div className="final-grade-halfyear-row">
                        <div className="final-grade-halfyear-main">
                          <label
                            className={`settings-switch final-grade-switch ${
                              isHalfYear2Selected ? "settings-switch--on" : ""
                            } ${
                              disableHalfYear2
                                ? "final-grade-switch--disabled"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isHalfYear2Selected}
                              disabled={disableHalfYear2}
                              onChange={() =>
                                handleToggleHalfYear(subject.name, 2)
                              }
                            />
                            <span className="settings-switch-slider" />
                          </label>
                          <span className="home-summary-label">
                            2. Halbjahr
                          </span>
                        </div>
                        <div
                          className={`subject-detail-summary-pill final-grade-pill final-grade-halfyear-pill ${
                            isHalfYear2Selected
                              ? "final-grade-halfyear-pill--dropped"
                              : ""
                          } ${getGradeClass(secondHalfYearAverage)}`}
                        >
                          {formatAverage(secondHalfYearAverage)}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {selectedDropCount >= 3 && (
            <p className="info-message">
              Du hast bereits drei Fächer mit gestrichenem Halbjahr ausgewählt.
              Entferne zuerst eine Auswahl, um ein weiteres Halbjahr zu
              streichen.
            </p>
          )}
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

      <section className="home-section final-grade-disclaimer">
        <div className="home-section-body">
          <p className="info-message">
            Hinweis: Das Streichen von Halbjahren in dieser Ansicht dient nur
            dir selbst als Orientierung und Merkhilfe. Es werden keine Daten an
            deine Schule oder andere Dritte &uuml;bermittelt. Offizielle
            Entscheidungen &uuml;ber gestrichene Halbjahren musst du
            gegebenenfalls separat bei deiner Schule beantragen bzw. mitteilen.
          </p>
        </div>
      </section>
    </div>
  );
}
