import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import BurgerMenu from "../components/BurgerMenu";
import SubjectsTable from "../components/SubjectsTable";
import BottomNav from "../components/BottomNav";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, Grade, GradeWithId } from "../interfaces/Grade";
import Loading from "../components/Loading";
import { useGrades } from "../context/gradesContext/useGrades";
import type { SubjectSortMode } from "../context/gradesContext/context";
import { decryptString } from "../services/cryptoService";
import InstallPwaModal from "../components/InstallPwaModal";

export default function Home() {
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
    updateSubjectSortPreferences,
  } = useGrades();

  const [halfYearFilter, setHalfYearFilter] =
    useState<"all" | 1 | 2>("all");

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

  const handleAddSubjectGradeToState = async (
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

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("scroll-disable");
    }
  }, []);

  const calculateGradeWeightForOverall = (
    subject: Subject,
    grade: Grade
  ): number => {
    if (!subject) return 1;
    const type = subject.type;
    if (type === 1) {
      return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1;
    }
    if (type === 0) {
      return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1;
    }
    return 1;
  };

  const filteredSubjectGrades = useMemo(
    () => {
      const result: Record<string, Grade[]> = {};

      for (const subject of subjects) {
        const gradesWithId = gradesBySubject[subject.name] || [];
        const filtered = gradesWithId
          .filter(
            (grade) =>
              halfYearFilter === "all" || grade.halfYear === halfYearFilter
          )
          .map(
            ({ grade, weight, date, note, halfYear: gradeHalfYear }) =>
              ({
                grade,
                weight,
                date,
                note,
                halfYear: gradeHalfYear,
              }) as Grade
          );

        result[subject.name] = filtered;
      }

      return result;
    },
    [subjects, gradesBySubject, halfYearFilter]
  );

  const sortedSubjects = useMemo(() => {
    if (subjects.length === 0) return [];

    const getSubjectAverage = (subject: Subject): number | null => {
      const grades = filteredSubjectGrades[subject.name] || [];
      if (!grades.length) return null;

      let total = 0;
      let totalWeight = 0;

      for (const grade of grades) {
        const weight = calculateGradeWeightForOverall(subject, grade);
        total += grade.grade * weight;
        totalWeight += weight;
      }

      if (totalWeight === 0) return null;
      return total / totalWeight;
    };

    if (subjectSortMode === "name") {
      return [...subjects].sort((a, b) =>
        a.name
          .toLowerCase()
          .localeCompare(b.name.toLowerCase(), "de")
      );
    }

    if (subjectSortMode === "average") {
      return [...subjects].sort((a, b) => {
        const avgA = getSubjectAverage(a);
        const avgB = getSubjectAverage(b);

        if (avgA === null && avgB === null) {
          return a.name
            .toLowerCase()
            .localeCompare(b.name.toLowerCase(), "de");
        }
        if (avgA === null) return 1;
        if (avgB === null) return -1;

        return avgB - avgA;
      });
    }

    if (subjectSortMode === "custom") {
      if (!subjectSortOrder.length) {
        return [...subjects].sort((a, b) =>
          a.name
            .toLowerCase()
            .localeCompare(b.name.toLowerCase(), "de")
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
          return a.name
            .toLowerCase()
            .localeCompare(b.name.toLowerCase(), "de");
        }
        if (indexA === undefined) return 1;
        if (indexB === undefined) return -1;

        return indexA - indexB;
      });
    }

    return subjects;
  }, [subjects, filteredSubjectGrades, subjectSortMode, subjectSortOrder]);

  const overallAverage = useMemo(() => {
    if (subjects.length === 0) return null;
    let total = 0;
    let totalWeight = 0;

    for (const subject of subjects) {
      const grades = filteredSubjectGrades[subject.name] || [];
      for (const grade of grades) {
        const weight = calculateGradeWeightForOverall(subject, grade);
        total += grade.grade * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight === 0) return null;
    return total / totalWeight;
  }, [subjects, filteredSubjectGrades]);

  const totalGradesCount = useMemo(
    () =>
      Object.values(filteredSubjectGrades).reduce(
        (sum, grades) => sum + grades.length,
        0
      ),
    [filteredSubjectGrades]
  );

  const formatAverage = (value: number | null): string =>
    value === null ? "-" : value.toFixed(2);

  const getGradeClass = (value: number | null): string => {
    if (value === null) return "";
    if (value >= 7) return "good";
    if (value >= 4) return "medium";
    return "bad";
  };

  const handleSortModeChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value as SubjectSortMode;
    updateSubjectSortPreferences(value, subjectSortOrder);
  };

  const handleReorderSubjects = (newOrder: string[]) => {
    updateSubjectSortPreferences("custom", newOrder);
  };

  return (
    <div className="home-layout home-layout--home">
      {isLoading && (
        <Loading progress={progress} label={loadingLabel} />
      )}

      <InstallPwaModal />

      <header className="home-header">
        <BurgerMenu />
      </header>

      <main className="home-main">
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

        <section className="home-summary">
          <div className="home-summary-card">
            <span className="home-summary-label">Gesamt</span>
            <div
              className={`subject-detail-summary-pill ${getGradeClass(
                overallAverage
              )}`}
            >
              {formatAverage(overallAverage)}
            </div>
          </div>
          <div className="home-summary-card">
            <span className="home-summary-label">Fächer</span>
            <span className="home-summary-value home-summary-value-pill">
              {subjects.length}
            </span>
          </div>
          <div className="home-summary-card">
            <span className="home-summary-label">Noten</span>
            <span className="home-summary-value home-summary-value-pill">
              {totalGradesCount}
            </span>
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-header-main">
              <h2 className="home-section-title">
                Fächer &amp; Noten
              </h2>
              <span className="home-section-subtitle">
                Tippe auf ein Fach für Details
              </span>
            </div>
            {subjects.length > 0 && (
              <div className="home-sort-select">
                <label
                  htmlFor="subject-sort-mode"
                  className="home-sort-label"
                >
                  Sortierung
                </label>
                <select
                  id="subject-sort-mode"
                  className="home-sort-select-input"
                  value={subjectSortMode}
                  onChange={handleSortModeChange}
                >
                  <option value="name">Name (A–Z)</option>
                  <option value="average">
                    Ø Note (beste zuerst)
                  </option>
                  <option value="custom">Eigene Reihenfolge</option>
                </select>
              </div>
            )}
          </div>
          <div className="home-section-body">
            <SubjectsTable
              subjects={sortedSubjects}
              subjectGrades={filteredSubjectGrades}
              enableDrag={subjectSortMode === "custom"}
              onReorder={handleReorderSubjects}
            />
          </div>
        </section>
      </main>

      <BottomNav
        subjects={subjects}
        encryptionKey={encryptionKey}
        onAddGradeToState={handleAddSubjectGradeToState}
        onAddSubjectToState={handleAddSubjectToState}
        isFirstSubject={isFirstSubject}
        disableAddGrade={disableAddGrade}
        addGradeTitle={addGradeTitle}
      />
    </div>
  );
}
