import { useMemo } from "react";
import type { Subject } from "../interfaces/Subject";
import { useGrades } from "../context/gradesContext/useGrades";
import { navigate } from "../services/navigation";

export default function SubjectsPage() {
  const { subjects } = useGrades();

  const sortedSubjects = useMemo(
    () =>
      [...subjects].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      ),
    [subjects]
  );

  const goToSubjectPage = (subjectId: string) => {
    // Weiterleitung zur Unterseite /fach/:id
    navigate(`/fach/${subjectId}`);
  };

  return (
    <div className="home-layout">
      <h1>Fach ausw\u00e4hlen</h1>
      <div className="subjects-wrapper">
        {sortedSubjects.map((subject: Subject) => (
          <div
            key={subject.name}
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

