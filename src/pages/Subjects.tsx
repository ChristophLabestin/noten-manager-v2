import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { Grade } from "../interfaces/Grade";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [, setSubjectGrades] = useState<{
    [key: string]: Grade[];
  }>({});

  useEffect(() => {
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
    fetchData();
  }, [user]);

  const sortSubjects = (subjects: Subject[]): Subject[] => {
    return [...subjects].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  };

  const goToSubjectPage = (subjectId: string) => {
    // Weiterleitung zur Unterseite /fach/:id
    window.location.href = `/fach/${subjectId}`;
  };

  return (
    <div className="home-layout">
      <h1>Fach auswählen</h1>
      <div className="subjects-wrapper">
        {sortSubjects(subjects).map((subject) => (
          <div
            className="subject-box"
            onClick={() => goToSubjectPage(subject.name)}
          >
            {subject.name} <br />
            <span className="subject-type">
              {subject.type === 1 ? "Hauptfach" : "Nebenfach"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
