import { useEffect, useMemo, useRef, useState } from "react";
import AddSubject from "../components/AddSubject";
import BurgerMenu from "../components/BurgerMenu";
import SubjectsTable from "../components/SubjectsTable";
import { useAuth } from "../context/authcontext/useAuth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { UserProfile } from "../interfaces/UserProfile";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, Grade } from "../interfaces/Grade";
import AddGrade from "../components/AddGrade";
import { deriveKeyFromPassword, decryptString } from "../services/cryptoService";
import Loading from "../components/Loading";
import closeIcon from "../assets/close.svg";

/**
 * Stabiler Ladefluss ohne Re-Trigger:
 *  - Effekt hängt nur von `user` ab
 *  - lokaler `activeKey` statt State im selben Effekt
 *  - Strict-Mode-Guard gegen Doppel-Run in Dev
 *  - konsistenter Fortschritt via setPct()
 */

export default function Home() {
  const { user } = useAuth();

  const [, setUserProfile] = useState<UserProfile>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, Grade[]>>({});
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<"" | "grade" | "subject">("");
  const [isFirstSubject, setIsFirstSubject] = useState<boolean>(false);
  const [loadingLabel, setLoadingLabel] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const disableAddGrade = useMemo(() => !encryptionKey || subjects.length === 0, [encryptionKey, subjects.length]);

  // React 18 StrictMode ruft Effekte in Dev doppelt auf. Guarden:
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Strict-Mode-Guard (nur in Dev relevant)
    if (startedRef.current) return; 
    startedRef.current = true;

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

      // Lokale Referenz vermeidet Race-Conditions mit State
      let activeKey: CryptoKey | null = null;

      try {
        // 1) Profil
        setPct(10, "Profil laden …");
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (cancelled) return;

        let salt: string | undefined;
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          setUserProfile(profile);
          salt = profile.encryptionSalt;
        }

        // 2) Key (falls Salt)
        if (salt) {
          setPct(20, "Schlüssel ableiten …");
          const key = await deriveKeyFromPassword(user.uid, salt);
          if (cancelled) return;
          setEncryptionKey(key); // UI-Buttons
          activeKey = key;       // direkt zum Entschlüsseln
        } else {
          activeKey = encryptionKey; // evtl. vorhanden
        }

        // 3) Fächer
        setPct(35, "Fächer laden …");
        const subjectsRef = collection(db, "users", user.uid, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
        if (cancelled) return;

        const subjectsData: Subject[] = subjectsSnapshot.docs.map((d) => ({
          ...(d.data() as Subject),
          name: d.id,
        }));
        setSubjects(subjectsData);

        const noSubjects = subjectsData.length === 0;
        setIsFirstSubject(noSubjects);
        if (noSubjects && activeModal === "") setActiveModal("subject");

        // 4) Noten vorladen
        setPct(45, "Noten ermitteln …");
        const gradeSnaps: Array<{ subjectId: string; docs: EncryptedGrade[] }> = [];
        let totalGrades = 0;
        for (const subjectDoc of subjectsSnapshot.docs) {
          const gradesRef = collection(db, "users", user.uid, "subjects", subjectDoc.id, "grades");
          const gradesSnapshot = await getDocs(gradesRef);
          if (cancelled) return;
          const encGrades = gradesSnapshot.docs.map((g) => g.data() as EncryptedGrade);
          gradeSnaps.push({ subjectId: subjectDoc.id, docs: encGrades });
          totalGrades += encGrades.length;
        }

        // Wenn kein Key verfügbar → leere Arrays, damit die Tabelle sofort was zeigt
        if (!activeKey) {
          const empty: Record<string, Grade[]> = {};
          for (const { subjectId } of gradeSnaps) empty[subjectId] = [];
          setSubjectGrades(empty);
          setPct(100, "Fertig");
          return;
        }

        // 5) Entschlüsseln
        const totalUnits = Math.max(1, subjectsData.length + totalGrades); // pro Fach + pro Note
        let doneUnits = 0;
        const gradesData: Record<string, Grade[]> = {};
        setPct(55, "Noten entschlüsseln …");

        for (const { subjectId, docs } of gradeSnaps) {
          const decrypted: Grade[] = [];
          for (const enc of docs) {
            const num = Number(await decryptString(enc.grade, activeKey));
            decrypted.push({ ...enc, grade: num });
            doneUnits += 1;
            setPct(55 + (doneUnits / totalUnits) * 45);
            if (cancelled) return;
          }
          gradesData[subjectId] = decrypted;
          doneUnits += 1; // pro abgeschlossenem Fach
          setPct(55 + (doneUnits / totalUnits) * 45);
          if (cancelled) return;
        }

        setSubjectGrades(gradesData);
        setPct(100, "Fertig");
      } finally {
        if (!cancelled) setIsLoading(false);
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

  // Handlers
  const handleAddSubjectToState = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
    if (isFirstSubject) setActiveModal("");
  };

  const handleAddSubjectGradeToState = async (subjectId: string, grade: EncryptedGrade, key: CryptoKey) => {
    const decryptedGradeNumber = Number(await decryptString(grade.grade, key));
    const decryptedGrade: Grade = { ...grade, grade: decryptedGradeNumber };

    setSubjectGrades((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId] ? [...prev[subjectId], decryptedGrade] : [decryptedGrade],
    }));
    setActiveModal("");
  };

  const handleModal = (modal: "" | "grade" | "subject") => setActiveModal(modal);

  // Render
  if (isLoading && subjects.length === 0 && Object.keys(subjectGrades).length === 0) {
    return <Loading progress={progress} label={loadingLabel} />;
  }

  return (
    <div className="home-layout">
      <BurgerMenu />

      <SubjectsTable subjects={subjects} subjectGrades={subjectGrades} />

      <div className="quick-access-wrapper">
        <h2 className="section-head no-padding">Schnelle Aktionen</h2>

        <button
          className="quick-access-button"
          onClick={() => handleModal("grade")}
          disabled={disableAddGrade}
          title={!encryptionKey ? "Lade Schlüssel…" : subjects.length === 0 ? "Lege zuerst ein Fach an" : ""}
        >
          <div className="quick-access-icon">+</div>
          Note
        </button>

        <button className="quick-access-button" onClick={() => handleModal("subject")}>
          <div className="quick-access-icon">+</div>
          Fach
        </button>
      </div>

      {activeModal !== "" && (
        <div className="modal-wrapper">
          <div className="modal-background" onClick={() => handleModal("")}></div>
          <div className="modal">
            {activeModal === "grade" ? (
              <AddGrade
                subjectsProp={subjects}
                onAddGrade={handleAddSubjectGradeToState}
                encryptionKeyProp={encryptionKey as CryptoKey}
              />
            ) : (
              <AddSubject onAddSubject={handleAddSubjectToState} isFirstSubject={isFirstSubject} />
            )}
            <img src={closeIcon} className="close-icon" onClick={() => handleModal("")} />
          </div>
        </div>
      )}
    </div>
  );
}
