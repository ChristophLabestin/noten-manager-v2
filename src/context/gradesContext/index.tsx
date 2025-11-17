import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import type { UserProfile } from "../../interfaces/UserProfile";
import type { Subject } from "../../interfaces/Subject";
import type { EncryptedGrade, GradeWithId } from "../../interfaces/Grade";
import type {
  EncryptedFachreferat,
  Fachreferat,
} from "../../interfaces/Fachreferat";
import {
  decryptString,
  deriveKeyFromPassword,
} from "../../services/cryptoService";
import { useAuth } from "../authcontext/useAuth";
import {
  GradesContext,
  type GradesContextType,
  type SubjectSortMode,
} from "./context";

export function GradesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradesBySubject, setGradesBySubject] = useState<
    Record<string, GradeWithId[]>
  >({});
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [compactView, setCompactView] = useState<boolean>(false);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [subjectSortMode, setSubjectSortMode] =
    useState<SubjectSortMode>("name");
  const [subjectSortOrder, setSubjectSortOrder] = useState<string[]>([]);
  const [fachreferat, setFachreferat] = useState<Fachreferat | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubjects([]);
      setGradesBySubject({});
      setEncryptionKey(null);
      setAnimationsEnabled(true);
      setIsLoading(false);
      setLoadingLabel("");
      setProgress(0);
      setCompactView(false);
      setSubjectSortMode("name");
      setSubjectSortOrder([]);
      setFachreferat(null);
      if (typeof document !== "undefined") {
        document.body.classList.remove("no-animations");
      }
      return;
    }

    const setPct = (pct: number, label?: string) => {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      setProgress(clamped);
      if (label !== undefined) setLoadingLabel(label);
    };

    setIsLoading(true);
    setPct(0, "Starte …");

    try {
      let activeKey: CryptoKey | null = null;

      // 1) Profil laden
      setPct(10, "Profil laden …");
      let salt: string | undefined;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          salt = profile.encryptionSalt;
          setCompactView(profile.compactView ?? false);
          const animationsPref =
            typeof profile.animationsEnabled === "boolean"
              ? profile.animationsEnabled
              : true;
          setAnimationsEnabled(animationsPref);
          if (typeof document !== "undefined") {
            document.body.classList.toggle("no-animations", !animationsPref);
          }
          const mode = profile.subjectSortMode;
          if (
            mode === "name" ||
            mode === "name_desc" ||
            mode === "average" ||
            mode === "average_worst" ||
            mode === "custom"
          ) {
            setSubjectSortMode(mode);
          } else {
            setSubjectSortMode("name");
          }
          if (Array.isArray(profile.subjectSortOrder)) {
            setSubjectSortOrder(profile.subjectSortOrder);
          } else {
            setSubjectSortOrder([]);
          }
        }
      } catch (err) {
        console.error("[GradesProvider] getDoc(users/uid) failed:", err);
      }

      // 2) Schlüssel ableiten (optional)
      if (salt) {
        setPct(20, "Schlüssel ableiten …");
        try {
          const key = await deriveKeyFromPassword(user.uid, salt);
          setEncryptionKey(key);
          activeKey = key;
        } catch (err) {
          console.error("[GradesProvider] deriveKeyFromPassword failed:", err);
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
      } catch (err) {
        console.error("[GradesProvider] getDocs(subjects) failed:", err);
        subjectsSnapshot = undefined;
      }

      const subjectsData: Subject[] = subjectsSnapshot
        ? subjectsSnapshot.docs.map((d: QueryDocumentSnapshot) => ({
            ...(d.data() as Subject),
            name: d.id,
          }))
        : [];

      setSubjects(subjectsData);

      // 4) Noten sammeln
      setPct(50, "Noten ermitteln …");
      const gradeSnaps: Array<{
        subjectId: string;
        docs: { id: string; data: EncryptedGrade }[];
      }> = [];
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
            const encGrades = gradesSnapshot.docs.map((g) => ({
              id: g.id,
              data: g.data() as EncryptedGrade,
            }));
            gradeSnaps.push({ subjectId: subjectDoc.id, docs: encGrades });
            totalGrades += encGrades.length;
          } catch (err) {
            console.error(
              `[GradesProvider] getDocs(grades:${subjectDoc.id}) failed:`,
              err
            );
            gradeSnaps.push({ subjectId: subjectDoc.id, docs: [] });
          }
        }
      }

      // 5) Falls kein Schlüssel: leere Noten setzen
      if (!activeKey) {
        const empty: Record<string, GradeWithId[]> = {};
        for (const { subjectId } of gradeSnaps) {
          empty[subjectId] = [];
        }
        setGradesBySubject(empty);
        setFachreferat(null);
        setPct(100, "Fertig");
        return;
      }

      // 6) Noten entschlüsseln
      const totalUnits = Math.max(1, subjectsData.length + totalGrades);
      let doneUnits = 0;
      const gradesData: Record<string, GradeWithId[]> = {};
      setPct(60, "Noten entschlüsseln …");

      for (const { subjectId, docs } of gradeSnaps) {
        const decrypted: GradeWithId[] = [];
        for (const { id, data } of docs) {
          try {
            const num = Number(await decryptString(data.grade, activeKey));
            decrypted.push({ id, ...data, grade: num });
          } catch (err) {
            console.error(
              `[GradesProvider] decryptString(${subjectId}) failed:`,
              err
            );
          }
          doneUnits += 1;
          setPct(60 + (doneUnits / totalUnits) * 40);
        }
        gradesData[subjectId] = decrypted;
        doneUnits += 1;
        setPct(60 + (doneUnits / totalUnits) * 40);
      }

      setGradesBySubject(gradesData);

      // 7) Fachreferat laden (separate Collection)
      try {
        const fachreferatDocRef = doc(
          db,
          "users",
          user.uid,
          "fachreferat",
          "current"
        );
        const fachreferatSnap = await getDoc(fachreferatDocRef);
        if (fachreferatSnap.exists()) {
          const data = fachreferatSnap.data() as EncryptedFachreferat;
          try {
            const num = Number(
              await decryptString(data.grade, activeKey as CryptoKey)
            );
            if (Number.isFinite(num)) {
              setFachreferat({
                id: fachreferatSnap.id,
                grade: num,
                subjectName: data.subjectName,
                note: data.note ?? undefined,
                date: data.date,
              });
            } else {
              setFachreferat(null);
            }
          } catch (err) {
            console.error(
              "[GradesProvider] decryptString(fachreferat) failed:",
              err
            );
            setFachreferat(null);
          }
        } else {
          setFachreferat(null);
        }
      } catch (err) {
        console.error(
          "[GradesProvider] getDoc(users/uid/fachreferat/current) failed:",
          err
        );
        setFachreferat(null);
      }

      setPct(100, "Fertig");
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [user, encryptionKey]);

  useEffect(() => {
    if (user && !hasLoadedOnce) {
      void (async () => {
        await refresh();
        setHasLoadedOnce(true);
      })();
    }
    if (!user) {
      setHasLoadedOnce(false);
    }
  }, [user, hasLoadedOnce, refresh]);

  const addSubject = (subject: Subject) => {
    setSubjects((prev) => [...prev, subject]);
  };

  const updateSubject = (subject: Subject) => {
    setSubjects((prev) =>
      prev.map((s) => (s.name === subject.name ? subject : s))
    );
  };

  const addGrade = (subjectId: string, grade: GradeWithId) => {
    setGradesBySubject((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId]
        ? [...prev[subjectId], grade]
        : [grade],
    }));
  };

  const updateGrade = (subjectId: string, grade: GradeWithId) => {
    setGradesBySubject((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).map((g) =>
        g.id === grade.id ? grade : g
      ),
    }));
  };

  const deleteGrade = (subjectId: string, gradeId: string) => {
    setGradesBySubject((prev) => ({
      ...prev,
      [subjectId]: (prev[subjectId] || []).filter(
        (g) => g.id !== gradeId
      ),
    }));
  };

  const updateSubjectSortPreferences = (
    mode: SubjectSortMode,
    order: string[]
  ) => {
    setSubjectSortMode(mode);
    setSubjectSortOrder(order);

    if (!user) return;

    void (async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          subjectSortMode: mode,
          subjectSortOrder: order,
        });
      } catch (err) {
        console.error(
          "[GradesProvider] updateSubjectSortPreferences failed:",
          err
        );
      }
    })();
  };

  const value: GradesContextType = {
    subjects,
    gradesBySubject,
    encryptionKey,
    isLoading,
    loadingLabel,
    progress,
    compactView,
    animationsEnabled,
    subjectSortMode,
    subjectSortOrder,
    fachreferat,
    addSubject,
    updateSubject,
    addGrade,
    updateGrade,
    deleteGrade,
    refresh,
    updateSubjectSortPreferences,
    setFachreferat,
  };

  return (
    <GradesContext.Provider value={value}>{children}</GradesContext.Provider>
  );
}
