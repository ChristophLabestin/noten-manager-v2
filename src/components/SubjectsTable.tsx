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
  // Hilfsfunktion: sortiere Fächer alphabetisch
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
      return grade.weight === 2 ? 2 : 1; // 2 bleibt 2, 1 oder 0 wird zu 1
    }

    if (type === 0) {
      // Nebenfach
      return grade.weight === 1 ? 2 : 1; // 1 wird 2, 0 wird 1
    }

    return 1; // Default
  };

  // Durchschnitt für ein einzelnes Fach
  const calculateAverageScore = (subject: Subject, grades: Grade[]): string => {
    if (!grades || grades.length === 0) return "—";

    const total = grades.reduce(
      (acc, grade) => acc + grade.grade * calculateGradeWeight(subject, grade),
      0
    );
    const totalWeight = grades.reduce(
      (acc, grade) => acc + calculateGradeWeight(subject, grade),
      0
    );

    return totalWeight === 0 ? "—" : (total / totalWeight).toFixed(2);
  };

  // Gesamtdurchschnitt über alle Fächer
  const calculateOverallAverageScore = (): string => {
    let total = 0;
    let totalWeight = 0;

    for (const subject of subjects) {
      const grades = subjectGrades[subject.name] || [];
      for (const grade of grades) {
        const weight = calculateGradeWeight(subject, grade);
        total += grade.grade * weight;
        totalWeight += weight;
      }
    }

    return totalWeight === 0 ? "—" : (total / totalWeight).toFixed(2);
  };

  const goToSubjectPage = (subjectId: string) => {
    // Weiterleitung zur Unterseite /fach/:id
    window.location.href = `/fach/${subjectId}`;
  };

  return (
    <div>
      <div className="table-wrapper">
        <table className="home-table">
          <thead className="home-thead">
            <tr className="home-tr">
              <th className="home-th">Fach</th>
              <th className="home-th">Durchschnitt</th>
            </tr>
          </thead>
          <tbody className="home-tbody">
            {sortSubjects(subjects).map((subject) => (
              <tr key={subject.name} className="home-tr">
                <td
                  className="home-td"
                  style={{ cursor: "pointer" }}
                  onClick={() => goToSubjectPage(subject.name)}
                >
                  {subject.name}
                  <br />
                  <span className="subject-type">
                    {subject.type === 1 ? "Hauptfach" : "Nebenfach"}
                  </span>
                </td>
                <td className="home-td grade">
                  <div
                    className={`grade-box ${
                      Number(
                        calculateAverageScore(
                          subject,
                          subjectGrades[subject.name] || []
                        )
                      ) >= 7
                        ? "good"
                        : Number(
                            calculateAverageScore(
                              subject,
                              subjectGrades[subject.name] || []
                            )
                          ) >= 4
                        ? "medium"
                        : "bad"
                    }`}
                  >
                    {calculateAverageScore(
                      subject,
                      subjectGrades[subject.name] || []
                    )}
                  </div>
                </td>
              </tr>
            ))}
            <tr className="total-score-row">
              <td className="home-td bold">Gesamt</td>
              <td className="home-td grade bold">
                <div
                  className={`grade-box ${
                    Number(calculateOverallAverageScore()) >= 7
                      ? "good"
                      : Number(calculateOverallAverageScore()) >= 4
                      ? "medium"
                      : "bad"
                  }`}
                >
                  {calculateOverallAverageScore()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Punkte-Tabelle unten */}
      {/* <div className="grade-distribution-wrapper">
        Noten-Punkte-Verteilung
        <div className="grade-distribution-table">
          <div className="grade">1</div>
          <div className="grade">2</div>
          <div className="grade">3</div>
          <div className="grade">4</div>
          <div className="grade">5</div>
          <div className="grade">6</div>
          <div className="point">15</div>
          <div className="point">14</div>
          <div className="point">13</div>
          <div className="point">12</div>
          <div className="point">11</div>
          <div className="point">10</div>
          <div className="point">9</div>
          <div className="point">8</div>
          <div className="point">7</div>
          <div className="point">6</div>
          <div className="point">5</div>
          <div className="point">4</div>
          <div className="point">3</div>
          <div className="point">2</div>
          <div className="point">1</div>
          <div className="point">0</div>
        </div>
      </div> */}
    </div>
  );
}
