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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "../interfaces/UserProfile";

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
    encryptionKey,
    isLoading,
    loadingLabel,
    progress,
    addSubject,
    addGrade,
    subjectSortMode,
    subjectSortOrder,
    gradesBySubject,
    fachreferat,
  } = useGrades();

  const [dropSelections, setDropSelections] = useState<
    Record<string, HalfYearDropOption>
  >({});
  const [maxDroppedHalfYears, setMaxDroppedHalfYears] = useState<number>(3);
  const [examPointsBySubject, setExamPointsBySubject] = useState<
    Record<string, number | null>
  >({});
  const [finalGradeToFixed, setFinalGradeToFixed] = useState<number>(1);

  const hasFachreferat = !!fachreferat;

  const subjectsWithoutFachreferat = useMemo(
    () => subjects.filter((s) => s.name !== "Fachreferat"),
    [subjects]
  );

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

  useEffect(() => {
    const fetchUserConfig = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;

          const gradeYear =
            profile.gradeYear === 12 || profile.gradeYear === 13
              ? profile.gradeYear
              : null;

          if (!gradeYear) {
            // Fallback: alte Einstellung oder Standardwert
            if (typeof profile.maxDroppedHalfYears === "number") {
              setMaxDroppedHalfYears(profile.maxDroppedHalfYears);
            } else {
              setMaxDroppedHalfYears(3);
            }
            return;
          }

          // Anzahl der Fächer ohne Fachreferat
          const subjectsWithoutFachreferatLocal = subjects.filter(
            (s) => s.name !== "Fachreferat"
          );

          // Anzahl einzubringender Halbjahresergebnisse
          const requiredHalfYears = gradeYear === 12 ? 17 : 16;
          const totalHalfYears = subjectsWithoutFachreferatLocal.length * 2;

          const computedMaxDropped = Math.max(
            0,
            totalHalfYears - requiredHalfYears
          );

          setMaxDroppedHalfYears(computedMaxDropped);
        }
      } catch (err) {
        console.error("[FinalGrade] Failed to load user config:", err);
      }
    };

    void fetchUserConfig();
  }, [user, subjects]);

  useEffect(() => {
    if (!encryptionKey) {
      setExamPointsBySubject({});
      return;
    }

    let cancelled = false;

    const loadExamPoints = async () => {
      const next: Record<string, number | null> = {};

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
          } catch (err) {
            console.error(
              "[FinalGrade] Failed to decrypt examPoints for subject:",
              subject.name,
              err
            );
            examPoints = null;
          }
        }

        next[subject.name] = examPoints;
      }

      if (!cancelled) {
        setExamPointsBySubject(next);
      }
    };

    void loadExamPoints();

    return () => {
      cancelled = true;
    };
  }, [subjects, encryptionKey]);

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

        if (
          willAddNewDrop &&
          maxDroppedHalfYears > 0 &&
          currentSelectedCount >= maxDroppedHalfYears
        ) {
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
      subjectsWithoutFachreferat.reduce((sum, subject) => {
        const value = dropSelections[subject.name];
        return sum + (value === 1 || value === 2 ? 1 : 0);
      }, 0),
    [subjectsWithoutFachreferat, dropSelections]
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
      subjectsWithoutFachreferat
        .map((subject) => ({
          subject,
          halfYear: dropSelections[subject.name],
        }))
        .filter(
          (
            entry
          ): entry is {
            subject: Subject;
            halfYear: Exclude<HalfYearDropOption, "none">;
          } => entry.halfYear === 1 || entry.halfYear === 2
        ),
    [subjectsWithoutFachreferat, dropSelections]
  );

  const examSubjects = useMemo(
    () =>
      subjectsWithoutFachreferat.filter(
        (subject) => subject.examSubject === true
      ),
    [subjectsWithoutFachreferat]
  );

  const subjectAverages = useMemo(() => {
    return subjectsWithoutFachreferat.map((subject) => {
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
  }, [subjectsWithoutFachreferat, filteredSubjectGrades]);

  const sortedSubjects = useMemo(() => {
    if (subjectsWithoutFachreferat.length === 0) return [];

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
      return [...subjectsWithoutFachreferat].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de")
      );
    }

    if (subjectSortMode === "name_desc") {
      return [...subjectsWithoutFachreferat].sort((a, b) =>
        b.name.toLowerCase().localeCompare(a.name.toLowerCase(), "de")
      );
    }

    if (subjectSortMode === "average") {
      return [...subjectsWithoutFachreferat].sort((a, b) => {
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
      return [...subjectsWithoutFachreferat].sort((a, b) => {
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
        return [...subjectsWithoutFachreferat].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase(), "de")
        );
      }

      const orderMap = new Map<string, number>();
      subjectSortOrder.forEach((name, index) => {
        orderMap.set(name, index);
      });

      return [...subjectsWithoutFachreferat].sort((a, b) => {
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

    return subjectsWithoutFachreferat;
  }, [
    subjectsWithoutFachreferat,
    filteredSubjectGrades,
    subjectSortMode,
    subjectSortOrder,
  ]);

  const gradesOnlyFinalAverage = useMemo(() => {
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

  const abiturFinalAverage = useMemo(() => {
    if (!examSubjects.length) return null;

    const subjectFinals: number[] = [];

    for (const subject of examSubjects) {
      const examPoints = examPointsBySubject[subject.name];
      if (examPoints === null || examPoints === undefined) continue;

      const subjectGrades = gradesBySubject[subject.name] || [];
      const dropOption = dropSelections[subject.name];

      const isHalfYear1Dropped = dropOption === 1;
      const isHalfYear2Dropped = dropOption === 2;

      const firstHalfYearAverage = isHalfYear1Dropped
        ? null
        : calculateHalfYearAverageForSubject(subjectGrades, subject.type, 1);

      const secondHalfYearAverage = isHalfYear2Dropped
        ? null
        : calculateHalfYearAverageForSubject(subjectGrades, subject.type, 2);

      const components: { value: number; weight: number }[] = [];

      if (firstHalfYearAverage !== null) {
        components.push({ value: firstHalfYearAverage, weight: 1 });
      }

      if (secondHalfYearAverage !== null) {
        components.push({ value: secondHalfYearAverage, weight: 1 });
      }

      components.push({ value: examPoints, weight: 2 });

      const totalWeight = components.reduce(
        (sum, item) => sum + item.weight,
        0
      );
      if (totalWeight === 0) continue;

      const totalValue = components.reduce(
        (sum, item) => sum + item.value * item.weight,
        0
      );

      subjectFinals.push(totalValue / totalWeight);
    }

    if (!subjectFinals.length) return null;

    const sum = subjectFinals.reduce((acc, value) => acc + value, 0);
    return sum / subjectFinals.length;
  }, [examSubjects, examPointsBySubject, gradesBySubject, dropSelections]);

  const finalAverage = abiturFinalAverage ?? gradesOnlyFinalAverage;

  const examSubjectsWithPoints = useMemo(
    () =>
      examSubjects.filter((subject) => {
        const value = examPointsBySubject[subject.name];
        return value !== null && value !== undefined;
      }),
    [examSubjects, examPointsBySubject]
  );

  const halfYearSummary = useMemo(() => {
    let totalPoints = 0;
    let count = 0;

    for (const subject of subjects) {
      // Fachreferat nicht in die HJE-Punkte einrechnen
      if (subject.name === "Fachreferat") continue;

      const subjectGrades = gradesBySubject[subject.name] || [];
      const dropOption = dropSelections[subject.name];

      const isHalfYear1Dropped = dropOption === 1;
      const isHalfYear2Dropped = dropOption === 2;

      const firstHalfYearAverage = isHalfYear1Dropped
        ? null
        : calculateHalfYearAverageForSubject(subjectGrades, subject.type, 1);

      const secondHalfYearAverage = isHalfYear2Dropped
        ? null
        : calculateHalfYearAverageForSubject(subjectGrades, subject.type, 2);

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
  }, [subjects, gradesBySubject, dropSelections]);

  const fachreferatHalfYearSummary = useMemo(
    () => {
      if (!fachreferat) {
        return { totalPoints: 0, count: 0 };
      }

      return {
        totalPoints: fachreferat.grade,
        count: 1,
      };
    },
    [fachreferat]
  );

  const fobosoSummary = useMemo(() => {
    const examCount = examSubjectsWithPoints.length;

    let examPointsDouble = 0;
    for (const subject of examSubjectsWithPoints) {
      const value = examPointsBySubject[subject.name];
      if (typeof value === "number") {
        examPointsDouble += value * 2;
      }
    }

    const halfYearCount = halfYearSummary.count;
    const halfYearPoints = halfYearSummary.totalPoints;

    const fachreferatCount = fachreferatHalfYearSummary.count;
    const fachreferatPoints = fachreferatHalfYearSummary.totalPoints;

    const units = examCount * 2 + halfYearCount + fachreferatCount;
    if (units === 0) {
      return {
        examCount,
        halfYearCount,
        examPointsDouble: 0,
        halfYearPoints: 0,
        totalPoints: 0,
        maxPoints: 0,
        grade: null as number | null,
        gradeRaw: null as number | null,
      };
    }

    const maxPoints = units * 15;
    const totalPoints = examPointsDouble + halfYearPoints + fachreferatPoints;
    const gradeRaw = 17 / 3 - (5 * totalPoints) / maxPoints;

    let grade: number;
    if (gradeRaw < 1) {
      grade = 1;
    } else {
      grade = Math.floor(gradeRaw * 10) / 10;
    }

    return {
      examCount,
      halfYearCount,
      examPointsDouble,
      halfYearPoints,
      totalPoints,
      maxPoints,
      grade,
      gradeRaw,
    };
  }, [
    examSubjectsWithPoints,
    examPointsBySubject,
    halfYearSummary,
    fachreferatHalfYearSummary,
  ]);

  const subjectFinalResults = useMemo(() => {
    if (!examSubjects.length) return [];

    const results: { subject: Subject; finalPoints: number | null }[] = [];

    for (const subject of examSubjects) {
      const examPoints = examPointsBySubject[subject.name];
      const subjectGrades = gradesBySubject[subject.name] || [];
      const dropOption = dropSelections[subject.name];

      const isHalfYear1Dropped = dropOption === 1;
      const isHalfYear2Dropped = dropOption === 2;

      const firstHalfYearAverage = isHalfYear1Dropped
        ? null
        : calculateHalfYearAverageForSubject(subjectGrades, subject.type, 1);

      const secondHalfYearAverage = isHalfYear2Dropped
        ? null
        : calculateHalfYearAverageForSubject(subjectGrades, subject.type, 2);

      const components: { value: number; weight: number }[] = [];

      if (firstHalfYearAverage !== null) {
        components.push({ value: firstHalfYearAverage, weight: 1 });
      }

      if (secondHalfYearAverage !== null) {
        components.push({ value: secondHalfYearAverage, weight: 1 });
      }

      if (typeof examPoints === "number") {
        components.push({ value: examPoints, weight: 2 });
      }

      if (!components.length) {
        results.push({ subject, finalPoints: null });
        continue;
      }

      const totalWeight = components.reduce(
        (sum, item) => sum + item.weight,
        0
      );
      const totalValue = components.reduce(
        (sum, item) => sum + item.value * item.weight,
        0
      );

      results.push({ subject, finalPoints: totalValue / totalWeight });
    }

    return results;
  }, [examSubjects, examPointsBySubject, gradesBySubject, dropSelections]);

  const hasAllExamPoints = useMemo(
    () =>
      examSubjects.length > 0 &&
      examSubjects.every((subject) => {
        const value = examPointsBySubject[subject.name];
        return typeof value === "number";
      }),
    [examSubjects, examPointsBySubject]
  );

  const examAveragePoints = useMemo(() => {
    if (!hasAllExamPoints) return null;
    if (!examSubjects.length) return null;

    let total = 0;
    let count = 0;

    for (const subject of examSubjects) {
      const value = examPointsBySubject[subject.name];
      if (typeof value === "number") {
        total += value;
        count += 1;
      }
    }

    if (count === 0) return null;
    return total / count;
  }, [hasAllExamPoints, examSubjects, examPointsBySubject]);

  const subjectsBelowFourPoints = useMemo(
    () =>
      hasAllExamPoints
        ? subjectFinalResults.reduce((sum, entry) => {
            if (entry.finalPoints !== null && entry.finalPoints < 4) {
              return sum + 1;
            }
            return sum;
          }, 0)
        : 0,
    [hasAllExamPoints, subjectFinalResults]
  );

  const examResultAtLeastFour =
    examAveragePoints === null ? null : examAveragePoints >= 4;

  const finalGradeAtLeastFour =
    hasAllExamPoints &&
    fobosoSummary.maxPoints > 0 &&
    fobosoSummary.grade !== null
      ? fobosoSummary.grade <= 4
      : null;

  const failedByHalfYearCount = halfYearSummary.count !== 17;

  const failedByMissingFachreferat = !hasFachreferat;

  const failedBySubjectPoints =
    hasAllExamPoints &&
    ((subjectsBelowFourPoints === 1 && fobosoSummary.totalPoints < 130) ||
      (subjectsBelowFourPoints >= 2 && fobosoSummary.totalPoints < 156));

  const failedByExamGrade = hasAllExamPoints && examResultAtLeastFour === false;

  const failedByFinalGrade =
    hasAllExamPoints && finalGradeAtLeastFour === false;

  const isFailed =
    failedByHalfYearCount ||
    failedByMissingFachreferat ||
    failedBySubjectPoints ||
    failedByExamGrade ||
    failedByFinalGrade;

  const isPassed =
    !isFailed &&
    hasAllExamPoints &&
    halfYearSummary.count === 17 &&
    examResultAtLeastFour === true &&
    finalGradeAtLeastFour === true;

  const passFailStatus: "open" | "passed" | "failed" = isFailed
    ? "failed"
    : isPassed
    ? "passed"
    : "open";

  const examSubjectFinals = useMemo(
    () =>
      examSubjectsWithPoints.map((subject) => {
        const examPoints = examPointsBySubject[subject.name];
        return {
          subject,
          final: typeof examPoints === "number" ? examPoints : null,
        };
      }),
    [examSubjectsWithPoints, examPointsBySubject]
  );

  const isFirstSubject = subjects.length === 0;

  const disableAddGrade = useMemo(
    () => !encryptionKey || subjects.length === 0,
    [encryptionKey, subjects.length]
  );

  const addGradeTitle = useMemo(() => {
    if (!encryptionKey) return "Lade Schl&uuml;ssel...";
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

  const limitReached =
    maxDroppedHalfYears > 0 && selectedDropCount >= maxDroppedHalfYears;

  const toggleFinalGradeToFixed = () => {
    if (finalGradeToFixed === 1) {
      setFinalGradeToFixed(2)
    } else if (finalGradeToFixed === 2) {
      setFinalGradeToFixed(1)
    }
  }

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
          <span className="home-summary-label final-grade-label">
            Abschlussnote
          </span>
          <div
            className={`subject-detail-summary-pill ${getGradeClass(
              finalAverage
            )}`}
            onClick={toggleFinalGradeToFixed}
          >
            {fobosoSummary.maxPoints > 0 && fobosoSummary.grade !== null
              ? fobosoSummary.grade.toFixed(finalGradeToFixed)
              : formatAverage(finalAverage)}
          </div>
        </div>
        {passFailStatus !== "open" && (
          <div className="home-summary-card home-summary-card--row">
            <span className="home-summary-label final-grade-label">
              Prüfungsstatus
            </span>
            <div
              className={`subject-detail-summary-pill ${
                passFailStatus === "passed" ? "good" : "bad"
              }`}
            >
              {passFailStatus === "passed" ? "Bestanden" : "Nicht bestanden"}
            </div>
          </div>
        )}
      </div>
      <section className="home-section" style={{ margin: 0 }}>
        <div className="home-summary-card">
          <div className="home-summary-card-text">
            <span className="home-summary-label final-grade-label">
              Abiturnoten
            </span>
          </div>
          {examSubjectFinals.length === 0 ? (
            <p className="info-message" style={{ marginTop: 8 }}>
              Trage deine Abiturnoten im Abitur-Bereich ein, um hier eine
              &Uuml;bersicht zu sehen.
            </p>
          ) : (
            <ul className="final-grade-dropped-list" style={{ marginTop: 8 }}>
              {examSubjectFinals.map(({ subject, final }) => (
                <li
                  key={`abitur-summary-${subject.name}`}
                  className="final-grade-dropped-item"
                >
                  <div className="final-grade-dropped-main">
                    <span className="final-grade-dropped-subject">
                      {subject.name}
                    </span>
                  </div>
                  <div
                    className={`subject-detail-summary-pill final-grade-pill final-grade-halfyear-pill ${getGradeClass(
                      final
                    )}`}
                  >
                    {formatAverage(final)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </section>
        <section className="home-section" style={{margin: 0}}>
        {fobosoSummary.maxPoints > 0 && (
          <div className="home-summary-card">
            <span className="home-summary-label final-grade-label">
              Erreichte Punkte
            </span>
            <span className="home-summary-value home-summary-value-pill">
              {Math.round(fobosoSummary.totalPoints)} /{" "}
              {fobosoSummary.maxPoints}
            </span>
            <p className="subject-detail-subheadline" style={{ margin: 0 }}>
              {`Prüfungen (zweifach): ${Math.round(
                fobosoSummary.examPointsDouble
              )} Punkte`}
            </p>
            <p className="subject-detail-subheadline" style={{ margin: 0 }}>
              {`Halbjahresergebnisse: ${Math.round(
                fobosoSummary.halfYearPoints
              )} Punkte (${fobosoSummary.halfYearCount} HJE).`}
            </p>
            {fachreferatHalfYearSummary.count > 0 && (
              <p className="subject-detail-subheadline" style={{ margin: 0 }}>
                {`Fachreferat: ${Math.round(
                  fachreferatHalfYearSummary.totalPoints
                )} Punkte (${fachreferatHalfYearSummary.count} HJE).`}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="home-summary two-columns">
        <div className="home-summary-card">
          <span className="home-summary-label">F&auml;cher</span>
          <span className="home-summary-value home-summary-value-pill">
            {subjectsWithoutFachreferat.length}
          </span>
        </div>
        <div className="home-summary-card">
          <span className="home-summary-label">Halbjahre</span>
          <span className="home-summary-value home-summary-value-pill">
            {maxDroppedHalfYears > 0
              ? `${selectedDropCount} / ${maxDroppedHalfYears}`
              : selectedDropCount}
          </span>
        </div>
      </div>

      <section
        className="home-section final-grade-dropped-section"
        style={{ marginTop: 0 }}
      >
        <div className="home-section-header">
          <div className="home-section-header-main">
            <h2 className="section-head no-padding">Gestrichene Halbjahre</h2>
            <span className="subject-detail-subheadline">
              {maxDroppedHalfYears > 0
                ? `Du kannst insgesamt bis zu ${maxDroppedHalfYears} Halbjahre streichen.`
                : "Das Streichen von Halbjahren ist derzeit deaktiviert."}
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
                const droppedAverage = calculateHalfYearAverageForSubject(
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
            <h2 className="section-head no-padding">F&auml;cher</h2>
            <span className="subject-detail-subheadline">
              Streiche die Noten des gew&auml;hlten Halbjahres.
            </span>
          </div>
        </div>
        <div className="home-section-body">
          {subjectsWithoutFachreferat.length === 0 ? (
            <p className="info-message">
              Lege zuerst F&auml;cher und Noten an, um deine Abschlussnote zu
              berechnen.
            </p>
          ) : (
            <div className="final-grade-list">
              {sortedSubjects.map((subject) => {
                const dropOption = dropSelections[subject.name] ?? "none";
                const isHalfYear1Selected = dropOption === 1;
                const isHalfYear2Selected = dropOption === 2;

                const disableHalfYear1 =
                  ((limitReached || maxDroppedHalfYears <= 0) &&
                    !isHalfYear1Selected) ||
                  isHalfYear2Selected;
                const disableHalfYear2 =
                  ((limitReached || maxDroppedHalfYears <= 0) &&
                    !isHalfYear2Selected) ||
                  isHalfYear1Selected;

                const subjectAverageEntry = subjectAverages.find(
                  (entry) => entry.subject.name === subject.name
                );
                const subjectAverage = subjectAverageEntry?.average ?? null;

                const subjectGrades = gradesBySubject[subject.name] || [];
                const firstHalfYearAverage = calculateHalfYearAverageForSubject(
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

          {maxDroppedHalfYears > 0 && limitReached && (
            <p className="info-message">
              Du hast bereits die maximal erlaubte Anzahl an gestrichenen
              Halbjahren ausgew&auml;hlt. Entferne zuerst eine Auswahl, um ein
              weiteres Halbjahr zu streichen.
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
        hasFachreferat={hasFachreferat}
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
