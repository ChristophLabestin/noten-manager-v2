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
import Logout from "../components/Logout";
import {
  deriveKeyFromPassword,
  decryptString,
} from "../services/cryptoService";
import Loading from "../components/Loading";

export default function Home() {
  const { user } = useAuth();
  const [, setUserProfile] = useState<UserProfile>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<{
    [key: string]: Grade[];
  }>({});
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userProfileData = userDocSnap.data() as UserProfile;
          setUserProfile(userProfileData);

          // Key ableiten
          if (userProfileData.encryptionSalt) {
            const key = await deriveKeyFromPassword(
              user.uid,
              userProfileData.encryptionSalt
            );
            setEncryptionKey(key);
          }
        }
      }
    };

    const fetchData = async () => {
      if (user && encryptionKey) {
        const subjectsRef = collection(db, "users", user.uid, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
        const subjectsData: Subject[] = [];

        for (const subjectDoc of subjectsSnapshot.docs) {
          const subjectData = subjectDoc.data() as Subject;
          subjectsData.push({ ...subjectData, name: subjectDoc.id });
        }

        setSubjects(subjectsData);

        const gradesData: { [key: string]: Grade[] } = {};

        for (const subjectDoc of subjectsSnapshot.docs) {
          const gradesRef = collection(
            db,
            "users",
            user.uid,
            "subjects",
            subjectDoc.id,
            "grades"
          );
          const gradesSnapshot = await getDocs(gradesRef);

          // Entschlüsseln
          const decryptedGrades: Grade[] = [];
          for (const docSnap of gradesSnapshot.docs) {
            const gradeData = docSnap.data() as EncryptedGrade;
            const decryptedGradeNumber = Number(
              await decryptString(gradeData.grade, encryptionKey)
            );
            decryptedGrades.push({
              ...gradeData,
              grade: decryptedGradeNumber,
            });
          }

          gradesData[subjectDoc.id] = decryptedGrades;
        }

        setSubjectGrades(gradesData);
      }
    };

    setIsLoading(true);
    fetchUserProfile();
    if (user && encryptionKey) {
      fetchData();
    }
    setIsLoading(false);
  }, [user, encryptionKey]);

  const handleAddSubjectToState = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
  };

  const handleAddSubjectGradeToState = async (
    subjectId: string,
    grade: EncryptedGrade,
    encryptionKey: CryptoKey
  ) => {
    const decryptedGradeNumber = Number(
      await decryptString(grade.grade, encryptionKey)
    );

    const decryptedGrade: Grade = {
      ...grade,
      grade: decryptedGradeNumber,
    };

    setSubjectGrades((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId]
        ? [...prev[subjectId], decryptedGrade]
        : [decryptedGrade],
    }));
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="home-layout">
      <BurgerMenu />
      <SubjectsTable subjects={subjects} subjectGrades={subjectGrades} />
      <AddGrade
        subjectsProp={subjects}
        onAddGrade={handleAddSubjectGradeToState}
        encryptionKeyProp={encryptionKey!}
      />
      <AddSubject onAddSubject={handleAddSubjectToState} />
      <Logout />
    </div>
  );
}
