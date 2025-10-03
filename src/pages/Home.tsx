import { useEffect, useState } from "react";
import AddSubject from "../components/AddSubject";
import BurgerMenu from "../components/BurgerMenu";
import SubjectsTable from "../components/SubjectsTable";
import { useAuth } from "../context/authcontext/useAuth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { UserProfile } from "../interfaces/UserProfile";
import type { Subject } from "../interfaces/Subject";
import type { Grade } from "../interfaces/Grade";
import AddGrade from "../components/AddGrade";
import Logout from "../components/Logout";

export default function Home() {
  const { user } = useAuth();
  const [, setUserProfile] = useState<UserProfile>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<{
    [key: string]: Grade[];
  }>({});

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userProfileData = userDocSnap.data() as UserProfile;
          setUserProfile(userProfileData);
        } else {
          console.log("Keine Benutzerdaten gefunden.");
        }
      }
    };

    const fetchData = async () => {
      if (user) {
        const subjectsRef = collection(db, "users", user.uid, "subjects");
        const subjectsSnapshot = await getDocs(subjectsRef);
        const subjectsData: Subject[] = [];

        for (const subjectDoc of subjectsSnapshot.docs) {
          const subjectData = subjectDoc.data() as Subject;
          subjectsData.push({ ...subjectData, name: subjectDoc.id });
        }

        setSubjects(subjectsData);

        // Für jede subjectId die Noten holen
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
          gradesData[subjectDoc.id] = gradesSnapshot.docs.map(
            (doc) => doc.data() as Grade
          );
        }

        setSubjectGrades(gradesData);
      }
    };

    fetchUserProfile();
    fetchData();
  }, [user]);

  const handleAddSubjectToState = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
  };

  const handleAddSubjectGradeToState = (subjectId: string, grade: Grade) => {
    setSubjectGrades((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId] ? [...prev[subjectId], grade] : [grade],
    }));
  };

  return (
    <div className="home-layout">
      <BurgerMenu />
      <SubjectsTable subjects={subjects} subjectGrades={subjectGrades} />
      <AddGrade
        subjectsProp={subjects}
        onAddGrade={handleAddSubjectGradeToState}
      />
      <AddSubject onAddSubject={handleAddSubjectToState} />
      <Logout/>
    </div>
  );
}
