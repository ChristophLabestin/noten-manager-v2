import { useEffect, useMemo, useState } from "react";
import BurgerMenu from "../components/BurgerMenu";
import SubjectsTable from "../components/SubjectsTable";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../context/authcontext/useAuth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { UserProfile } from "../interfaces/UserProfile";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, Grade } from "../interfaces/Grade";
import {
  deriveKeyFromPassword,
  decryptString,
} from "../services/cryptoService";
import Loading from "../components/Loading";

export default function Home() {
  const { user } = useAuth();

  const [, setUserProfile] = useState<UserProfile>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, Grade[]>>(
    {}
  );
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFirstSubject, setIsFirstSubject] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [halfYearFilter, setHalfYearFilter] =
    useState<"all" | 1 | 2>("all");

  const disableAddGrade = useMemo(
    () => !encryptionKey || subjects.length === 0,
    [encryptionKey, subjects.length]
  );

  const addGradeTitle = useMemo(() => {
    if (!encryptionKey) return "Lade Schlüssel…";
    if (subjects.length === 0) return "Lege zuerst ein Fach an";
    return "";
  }, [encryptionKey, subjects.length]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const setPct = (pct: number, label?: string) => {
      if (cancelled) return;
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      setProgress(clamped);
      if (label !== undefined) setLoadingLabel(label);
    };

    const run = async () => {
      setIsLoading(true);
      setPct(0, "Starte …");

      let activeKey: CryptoKey | null = null;

      try {
        // 1) Profil laden
        setPct(10, "Profil laden …");
        let salt: string | undefined;
        try {
          const userDocRef = doc(db, "users", user.uid);
          const snap = await getDoc(userDocRef);
          if (cancelled) return;
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            setUserProfile(profile);
            salt = profile.encryptionSalt;
          }
        } catch (err) {
          console.error("[Home] getDoc(users/uid) failed:", err);
        }

        // 2) Schlüssel ableiten (optional)
        if (salt) {
          setPct(20, "Schlüssel ableiten …");
          try {
            const key = await deriveKeyFromPassword(user.uid, salt);
            if (cancelled) return;
            setEncryptionKey(key);
            activeKey = key;
          } catch (err) {
            console.error("[Home] deriveKeyFromPassword failed:", err);
            activeKey = null;
          }
        } else {
          activeKey = encryptionKey;
        }

        // 3) Fächer laden
        setPct(35, "Fächer laden …");
        let subjectsSnapshot;
        try {
          const subjectsRef = collection(db, "users", user.uid, "subjects");
          subjectsSnapshot = await getDocs(subjectsRef);
          if (cancelled) return;
        } catch (err) {
          console.error("[Home] getDocs(subjects) failed:", err);
          subjectsSnapshot = undefined;
        }

        const subjectsData: Subject[] = subjectsSnapshot
          ? subjectsSnapshot.docs.map((d: QueryDocumentSnapshot) => ({
              ...(d.data() as Subject),
              name: d.id,
            }))
          : [];

        setSubjects(subjectsData);

        const noSubjects = subjectsData.length === 0;
        setIsFirstSubject(noSubjects);

        // 4) Noten sammeln
        setPct(50, "Noten ermitteln …");
        const gradeSnaps: Array<{ subjectId: string; docs: EncryptedGrade[] }> =
          [];
        let totalGrades = 0;

        if (subjectsSnapshot) {
          for (const subjectDoc of subjectsSnapshot.docs) {
            try {
              const gradesRef = collection(
                db,
                "users",
                user.uid,
                "subjects",
                subjectDoc.id,
                "grades"
              );
              const gradesSnapshot = await getDocs(gradesRef);
              if (cancelled) return;
              const encGrades = gradesSnapshot.docs.map(
                (g) => g.data() as EncryptedGrade
              );
              gradeSnaps.push({ subjectId: subjectDoc.id, docs: encGrades });
              totalGrades += encGrades.length;
            } catch (err) {
              console.error(
                `[Home] getDocs(grades:${subjectDoc.id}) failed:`,
                err
              );
              gradeSnaps.push({ subjectId: subjectDoc.id, docs: [] });
            }
          }
        }

        // 5) Falls kein Schlüssel: leere Noten setzen
        if (!activeKey) {
          const empty: Record<string, Grade[]> = {};
          for (const { subjectId } of gradeSnaps) {
            empty[subjectId] = [];
          }
          setSubjectGrades(empty);
          setPct(100, "Fertig");
          return;
        }

        // 6) Noten entschlüsseln
        const totalUnits = Math.max(1, subjectsData.length + totalGrades);
        let doneUnits = 0;
        const gradesData: Record<string, Grade[]> = {};
        setPct(60, "Noten entschlüsseln …");

        for (const { subjectId, docs } of gradeSnaps) {
          const decrypted: Grade[] = [];
          for (const enc of docs) {
            try {
              const num = Number(await decryptString(enc.grade, activeKey));
              decrypted.push({ ...enc, grade: num });
            } catch (err) {
              console.error(`[Home] decryptString(${subjectId}) failed:`, err);
            }
            doneUnits += 1;
            setPct(60 + (doneUnits / totalUnits) * 40);
            if (cancelled) return;
          }
          gradesData[subjectId] = decrypted;
          doneUnits += 1;
          setPct(60 + (doneUnits / totalUnits) * 40);
          if (cancelled) return;
        }

        setSubjectGrades(gradesData);
        setPct(100, "Fertig");
      } finally {
        setTimeout(() => {
          if (!cancelled) setIsLoading(false);
        }, 500);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleAddSubjectToState = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
  };

  const handleAddSubjectGradeToState = async (
    subjectId: string,
    grade: EncryptedGrade,
    key: CryptoKey
  ) => {
    const decryptedGradeNumber = Number(await decryptString(grade.grade, key));
    const decryptedGrade: Grade = { ...grade, grade: decryptedGradeNumber };

    setSubjectGrades((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId]
        ? [...prev[subjectId], decryptedGrade]
        : [decryptedGrade],
    }));
  };

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
      if (halfYearFilter === "all") return subjectGrades;

      const result: Record<string, Grade[]> = {};
      for (const subject of subjects) {
        const grades = subjectGrades[subject.name] || [];
        result[subject.name] = grades.filter(
          (grade) => grade.halfYear === halfYearFilter
        );
      }
      return result;
    },
    [subjectGrades, subjects, halfYearFilter]
  );

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
    value === null ? "–" : value.toFixed(2);

  const getGradeClass = (value: number | null): string => {
    if (value === null) return "";
    if (value >= 7) return "good";
    if (value >= 4) return "medium";
    return "bad";
  };

  return (
    <div className="home-layout home-layout--home">
      {isLoading && (
        <Loading progress={progress} label={loadingLabel} />
      )}

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
          <div className="home-summary-card home-summary-card--average">
            <span className="home-summary-label">Gesamt</span>
            <div
              className={`home-summary-value-pill ${getGradeClass(
                overallAverage
              )}`}
            >
              {formatAverage(overallAverage)}
            </div>
          </div>
          <div className="home-summary-card">
            <span className="home-summary-label">Fächer</span>
            <span className="home-summary-value home-summary-value-pill">{subjects.length}</span>
          </div>
          <div className="home-summary-card">
            <span className="home-summary-label">Noten</span>
            <span className="home-summary-value home-summary-value-pill">{totalGradesCount}</span>
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <h2 className="home-section-title">Fächer &amp; Noten</h2>
            <span className="home-section-subtitle">
              Tippe auf ein Fach für Details
            </span>
          </div>
          <div className="home-section-body">
            <SubjectsTable
              subjects={subjects}
              subjectGrades={filteredSubjectGrades}
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
