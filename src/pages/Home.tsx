import { useEffect, useState } from "react";
import AddSubject from "../components/AddSubject";
import BurgerMenu from "../components/BurgerMenu";
import SubjectsTable from "../components/SubjectsTable";
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
import AddGrade from "../components/AddGrade";
import {
  deriveKeyFromPassword,
  decryptString,
} from "../services/cryptoService";
import Loading from "../components/Loading";
import closeIcon from "../assets/close.svg";

export default function Home() {
  const { user } = useAuth();

  const [, setUserProfile] = useState<UserProfile>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, Grade[]>>(
    {}
  );
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>();
  const [activeModal, setActiveModal] = useState<"" | "grade" | "subject">("");
  const [isFirstSubject, setIsFirstSubject] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  // const disableAddGrade = useMemo(
  //   () => !encryptionKey || subjects.length === 0,
  //   [encryptionKey, subjects.length]
  // );

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
        // --- 1) Profil -------------------------------------------------------
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

        // --- 2) Key (optional) ----------------------------------------------
        if (salt) {
          setPct(20, "Schlüssel ableiten …");
          try {
            const key = await deriveKeyFromPassword(user.uid, salt);
            if (cancelled) return;
            setEncryptionKey(key); // für Buttons
            activeKey = key; // für sofortiges Entschlüsseln
          } catch (err) {
            console.error("[Home] deriveKeyFromPassword failed:", err);
            activeKey = null; // weiter ohne Key → leere Noten
          }
        } else {
          activeKey = encryptionKey; // evtl. schon vorhanden
        }

        // --- 3) Fächer -------------------------------------------------------
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
        if (noSubjects && activeModal === "") setActiveModal("subject");

        // --- 4) Noten sammeln -----------------------------------------------
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

        // --- 5) Ohne Key → leere Arrays setzen, fertig ----------------------
        if (!activeKey) {
          const empty: Record<string, Grade[]> = {};
          for (const { subjectId } of gradeSnaps) empty[subjectId] = [];
          setSubjectGrades(empty);
          setPct(100, "Fertig");
          return;
        }

        // --- 6) Entschlüsseln mit Progress ----------------------------------
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
          doneUnits += 1; // Fach abgeschlossen
          setPct(60 + (doneUnits / totalUnits) * 40);
          if (cancelled) return;
        }

        setSubjectGrades(gradesData);
        setPct(100, "Fertig");
        
      } finally {
        setTimeout(() => {
          if (!cancelled) setIsLoading(false);
        }, 500)
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Body-Scroll sperren, wenn Modal offen ist
  useEffect(() => {
    document.body.classList.toggle("scroll-disable", activeModal !== "");
    return () => {
      document.body.classList.remove("scroll-disable");
    };
  }, [activeModal]);

  const handleAddSubjectToState = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
    if (isFirstSubject) setActiveModal("");
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
    setActiveModal("");
  };

  const handleModal = (modal: "" | "grade" | "subject") =>
    setActiveModal(modal);

  return (
    <div className="home-layout">
      {isLoading && (
          <Loading progress={progress} label={loadingLabel} />
      )}

      <BurgerMenu />

      <SubjectsTable subjects={subjects} subjectGrades={subjectGrades} />

      {/* <div className="quick-access-wrapper">
        <h2 className="section-head no-padding">Schnelle Aktionen</h2>

        <button
          className="quick-access-button"
          onClick={() => handleModal("grade")}
          disabled={disableAddGrade}
          title={
            !encryptionKey
              ? "Lade Schlüssel…"
              : subjects.length === 0
              ? "Lege zuerst ein Fach an"
              : ""
          }
        >
          <div className="quick-access-icon">+</div>
          Note
        </button>

        <button
          className="quick-access-button"
          onClick={() => handleModal("subject")}
        >
          <div className="quick-access-icon">+</div>
          Fach
        </button>
      </div> */}

      {activeModal !== "" && (
        <div className="modal-wrapper">
          <div
            className="modal-background"
            onClick={() => handleModal("")}
          ></div>
          <div className="modal">
            {activeModal === "grade" ? (
              <AddGrade
                subjectsProp={subjects}
                onAddGrade={handleAddSubjectGradeToState}
                encryptionKeyProp={encryptionKey as CryptoKey}
              />
            ) : (
              <AddSubject
                onAddSubject={handleAddSubjectToState}
                isFirstSubject={isFirstSubject}
              />
            )}
            <img
              src={closeIcon}
              className="close-icon"
              onClick={() => handleModal("")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
