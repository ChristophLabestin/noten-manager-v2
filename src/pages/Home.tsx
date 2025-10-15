import { useEffect, useState } from "react";
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
import closeIcon from "../assets/close.svg"

export default function Home() {
  const { user } = useAuth();
  const [, setUserProfile] = useState<UserProfile>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<{ [key: string]: Grade[] }>({});
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<"" | "grade" | "subject">("");
  const [isFirstSubject, setIsFirstSubject] = useState<boolean>(false);

  // ---- 1) Profile + Key laden -------------------------------------------------
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const userProfileData = snap.data() as UserProfile;
          if (!cancelled) setUserProfile(userProfileData);

          if (userProfileData.encryptionSalt) {
            const key = await deriveKeyFromPassword(user.uid, userProfileData.encryptionSalt);
            if (!cancelled) setEncryptionKey(key);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---- 2) Subjects + Grades laden, sobald Key vorhanden -----------------------
  useEffect(() => {
    if (!user || !encryptionKey) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const subjectsRef = collection(db, "users", user.uid, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);

        const subjectsData: Subject[] = subjectsSnapshot.docs.map((d) => ({
          ...(d.data() as Subject),
          name: d.id,
        }));

        if (cancelled) return;
        setSubjects(subjectsData);

        const noSubjects = subjectsData.length === 0;
        setIsFirstSubject(noSubjects);

        // Öffne nur automatisch das Fach-Modal, wenn der Nutzer noch keines hat
        // UND der Nutzer nicht bereits manuell ein anderes Modal geöffnet hat.
        if (noSubjects && activeModal === "") {
          setActiveModal("subject");
        }

        const gradesData: { [key: string]: Grade[] } = {};
        for (const subjectDoc of subjectsSnapshot.docs) {
          const gradesRef = collection(db, "users", user.uid, "subjects", subjectDoc.id, "grades");
          const gradesSnapshot = await getDocs(gradesRef);

          const decryptedGrades: Grade[] = [];
          for (const docSnap of gradesSnapshot.docs) {
            const gradeData = docSnap.data() as EncryptedGrade;
            const decryptedGradeNumber = Number(await decryptString(gradeData.grade, encryptionKey));
            decryptedGrades.push({ ...gradeData, grade: decryptedGradeNumber });
          }
          gradesData[subjectDoc.id] = decryptedGrades;
        }

        if (!cancelled) setSubjectGrades(gradesData);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // bewusst activeModal NICHT in die deps, um nicht bei Klicks neu zu laden
  }, [user, encryptionKey, activeModal]);

  // ---- 3) Body-Scroll sperren, wenn ein Modal offen ist -----------------------
  useEffect(() => {
    document.body.classList.toggle("scroll-disable", activeModal !== "");
    return () => {
      document.body.classList.remove("scroll-disable");
    };
  }, [activeModal]);

  const handleAddSubjectToState = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
    // Wenn erstes Fach angelegt wurde, Modal schließen
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

  const handleModal = (modal: "" | "grade" | "subject") => {
    setActiveModal(modal);
  };

  if (isLoading && subjects.length === 0 && Object.keys(subjectGrades).length === 0) {
    return <Loading />;
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
          disabled={!encryptionKey || subjects.length === 0}
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
            <img src={closeIcon} className="close-icon" onClick={() => handleModal("")}/>
          </div>
        </div>
      )}
    </div>
  );
}
