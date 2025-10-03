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

  // Durchschnitt für ein einzelnes Fach
  const calculateAverageScore = (grades: Grade[]): string => {
    if (!grades || grades.length === 0) return "—";

    const total = grades.reduce(
      (acc, grade) => acc + grade.grade * grade.weight,
      0
    );
    const totalWeight = grades.reduce((acc, grade) => acc + grade.weight, 0);

    return totalWeight === 0 ? "—" : (total / totalWeight).toFixed(2);
  };

  // Gesamtdurchschnitt über alle Fächer
  const calculateOverallAverageScore = (): string => {
    let total = 0;
    let totalWeight = 0;

    for (const grades of Object.values(subjectGrades)) {
      total += grades.reduce(
        (acc, grade) => acc + grade.grade * grade.weight,
        0
      );
      totalWeight += grades.reduce((acc, grade) => acc + grade.weight, 0);
    }

    return totalWeight === 0 ? "—" : (total / totalWeight).toFixed(2);
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
                <td className="home-td">
                  {subject.name}
                  <br />
                  <span className="subject-type">
                    {subject.type === 1 ? "Hauptfach" : "Nebenfach"}
                  </span>
                </td>
                <td className="home-td grade">
                  <div
                    className={`grade-box ${
                      Number(calculateAverageScore(subjectGrades[subject.name] || [])) >= 7
                        ? "good"
                        : Number(calculateAverageScore(subjectGrades[subject.name] || [])) >= 4
                        ? "medium"
                        : "bad"
                    }`}
                  >
                    {calculateAverageScore(subjectGrades[subject.name] || [])}
                  </div>
                </td>
              </tr>
            ))}
            <tr>
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
