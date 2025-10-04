import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
} from "react-beautiful-dnd";
import { doc, updateDoc } from "firebase/firestore";
import type { Grade } from "../interfaces/Grade";
import type { Subject } from "../interfaces/Subject";
import { db } from "../firebase/firebaseConfig";

interface SubjectsTableProps {
  subjects: Subject[];
  subjectGrades: { [key: string]: Grade[] };
  userId: string;
}

export default function SubjectsTable({
  subjects,
  subjectGrades,
  userId,
}: SubjectsTableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [sortedSubjects, setSortedSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    setSortedSubjects(
      [...subjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );
  }, [subjects]);

  const calculateGradeWeight = (subject: Subject, grade: Grade): number => {
    if (!subject) return 1;
    const type = subject.type;
    if (type === 1) return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1;
    if (type === 0) return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1;
    return 1;
  };

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

  const calculateOverallAverageScore = (): string => {
    let total = 0;
    let totalWeight = 0;
    for (const subject of sortedSubjects) {
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
    if (!isEditing) window.location.href = `/fach/${subjectId}`;
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(sortedSubjects);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setSortedSubjects(reordered);

    for (let index = 0; index < reordered.length; index++) {
      const subject = reordered[index];
      const ref = doc(db, "users", userId, "subjects", subject.name);
      await updateDoc(ref, { order: index });
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Fertig" : "Sortierung bearbeiten"}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <table className="home-table">
          <thead className="home-thead">
            <tr className="home-tr">
              <th className="home-th">Fach</th>
              <th className="home-th">Durchschnitt</th>
            </tr>
          </thead>
          <Droppable
            droppableId="subjects"
            type="subject"
            isDropDisabled={isEditing}
            isCombineEnabled={false}
            ignoreContainerClipping={false}
          >
            {(provided: DroppableProvided) => (
              <tbody
                className="home-tbody"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {sortedSubjects.map((subject, index) => (
                  <Draggable
                    key={subject.name}
                    draggableId={subject.name}
                    index={index}
                    isDragDisabled={!isEditing}
                  >
                    {(
                      provided: DraggableProvided,
                      snapshot: DraggableStateSnapshot
                    ) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`home-tr ${
                          snapshot.isDragging ? "dragging" : ""
                        }`}
                        style={{
                          cursor: isEditing ? "grab" : "pointer",
                          ...provided.draggableProps.style,
                        }}
                        onClick={() => goToSubjectPage(subject.name)}
                      >
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
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
            )}
          </Droppable>
        </table>
      </DragDropContext>
    </div>
  );
}
