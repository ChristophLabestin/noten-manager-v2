import type { Grade } from "../interfaces/Grade";
import type { Subject } from "../interfaces/Subject";

interface SubjectsTableProps {
  subjects: Subject[];
  subjectGrades: { [key: string]: Grade[] }; // kommt direkt aus Home
}

export default function SubjectsTable({
  subjects,
  subjectGrades,
}: SubjectsTableProps) {
  const sortSubjects = (subjects: Subject[]): Subject[] => {
    return [...subjects].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  };

  const calculateGradeWeight = (subject: Subject, grade: Grade): number => {
    if (!subject) return 1; // Default

    const type = subject.type;

    if (type === 1) {
      // Hauptfach
      return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1;
    }

    if (type === 0) {
      // Nebenfach
      return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1;
    }

    return 1; // Default
  };

  const calculateAverageScore = (
    subject: Subject,
    grades: Grade[]
  ): number | null => {
    if (!grades || grades.length === 0) return null;

    const total = grades.reduce(
      (acc, grade) => acc + grade.grade * calculateGradeWeight(subject, grade),
      0
    );
    const totalWeight = grades.reduce(
      (acc, grade) => acc + calculateGradeWeight(subject, grade),
      0
    );

    if (totalWeight === 0) return null;
    return total / totalWeight;
  };

  const formatAverage = (value: number | null): string =>
    value === null ? "–" : value.toFixed(2);

  const getGradeClass = (value: number | null): string => {
    if (value === null) return "";
    if (value >= 7) return "good";
    if (value >= 4) return "medium";
    return "bad";
  };

  const goToSubjectPage = (subjectId: string) => {
    window.location.href = `/fach/${subjectId}`;
  };

  return (
    <div className="subjects-list">
      {sortSubjects(subjects).map((subject) => {
        const grades = subjectGrades[subject.name] || [];
        const avg = calculateAverageScore(subject, grades);
        const gradesCount = grades.length;

        return (
          <button
            key={subject.name}
            type="button"
            className="subject-row"
            onClick={() => goToSubjectPage(subject.name)}
          >
            <div className="subject-row-main">
              <div className="subject-row-name">{subject.name}</div>
              <div className="subject-row-meta">
                <span
                  className={`subject-tag ${
                    subject.type === 1
                      ? "subject-tag--main"
                      : "subject-tag--minor"
                  }`}
                >
                  {subject.type === 1 ? "Hauptfach" : "Nebenfach"}
                </span>
                <span className="subject-row-count">
                  {gradesCount} {gradesCount === 1 ? "Note" : "Noten"}
                </span>
              </div>
            </div>
            <div className="subject-row-grade">
              <div className={`grade-box ${getGradeClass(avg)}`}>
                {formatAverage(avg)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
