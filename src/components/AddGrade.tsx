import { useState, useEffect } from "react";
import type { Subject } from "../interfaces/Subject";
import { getAuth } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Grade } from "../interfaces/Grade";

interface AddGradeProps {
  subjectsProp: Subject[]; // kommt direkt aus Home
}

export default function AddGrade({ subjectsProp }: AddGradeProps) {
  // State für ausgewähltes Fach (als Dokument-ID)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  // State für neue Note
  const [newGrade, setNewGrade] = useState<Grade>({
    grade: 0,
    weight: 1,
    date: new Date(),
  });
  // Lokaler State für Subjects, wird bei Änderungen in props aktualisiert
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    setSubjects(subjectsProp);
  }, [subjectsProp]);

  // Handler für Fachauswahl
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubjectId(e.target.value);
  };

  // Handler für Noteingabe
  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGrade({
      ...newGrade,
      grade: Number(e.target.value),
    });
  };

  // Note hinzufügen
  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Kein Benutzer angemeldet");
      }

      if (!selectedSubjectId) {
        throw new Error("Kein Fach ausgewählt");
      }

      // Pfad: users/{userId}/subjects/{subjectId}/grades
      const gradesRef = collection(
        db,
        "users",
        user.uid,
        "subjects",
        selectedSubjectId,
        "grades"
      );

      await addDoc(gradesRef, {
        grade: newGrade.grade,
        weight: newGrade.weight,
        date: newGrade.date,
        createdAt: new Date(),
      });

      console.log("Note erfolgreich hinzugefügt!");

      // Input zurücksetzen
      setNewGrade({
        grade: 0,
        weight: 1,
        date: new Date(),
      });
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Note:", error);
    }
  };

  return (
    <form className="add-subject-form" onSubmit={handleAddGrade}>
      <div className="form-group">
        <label className="form-label">Fach auswählen:</label>
        <select
          className="form-input"
          value={selectedSubjectId}
          onChange={handleSubjectChange}
        >
          <option value="">-- Fach auswählen --</option>
          {subjects.map((subject) => (
            <option key={subject.name} value={subject.name}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Note hinzufügen:</label>
        <input
          className="form-input"
          type="number"
          value={newGrade.grade}
          onChange={handleGradeChange}
          placeholder="15"
        />
      </div>

      <button className="btn-primary small" type="submit">
        Hinzufügen
      </button>
    </form>
  );
}
