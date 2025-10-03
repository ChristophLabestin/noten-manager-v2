import { useState, useEffect } from "react";
import type { Subject } from "../interfaces/Subject";
import { getAuth } from "firebase/auth";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import type { Grade } from "../interfaces/Grade";
import helpIcon from "../assets/help.svg";

interface AddGradeProps {
  subjectsProp: Subject[]; // Fächer aus Home
  onAddGrade: (subjectId: string, grade: Grade) => void; // Callback für neue Note
}

export default function AddGrade({ subjectsProp, onAddGrade }: AddGradeProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [newGradeInput, setNewGradeInput] = useState<string>(""); // Input als String
  const [gradeWeight, setGradeWeight] = useState<number>(0);
  const [helpActive, setHelpActive] = useState<boolean>(false);

  // Update lokale Subjects, wenn props sich ändern
  useEffect(() => {
    setSubjects(subjectsProp);
  }, [subjectsProp]);

  const findSubjectType = (subjectId: string) => {
    const subject = subjects.find((s) => s.name === subjectId);
    if (subject) return subject.type;
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubjectId(e.target.value);
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGradeInput(e.target.value);
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGradeWeight(Number(e.target.value));
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();

    // String in Zahl konvertieren
    const gradeNumber = Number(newGradeInput);
    if (isNaN(gradeNumber)) {
      alert("Bitte eine gültige Zahl eingeben");
      return;
    }

    const gradeToAdd: Grade = {
      grade: gradeNumber,
      weight: gradeWeight,
      date: Timestamp.fromDate(new Date()),
    };

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Kein Benutzer angemeldet");
      if (!selectedSubjectId) throw new Error("Kein Fach ausgewählt");

      const gradesRef = collection(
        db,
        "users",
        user.uid,
        "subjects",
        selectedSubjectId,
        "grades"
      );

      await addDoc(gradesRef, {
        ...gradeToAdd,
      });

      // Callback an Home
      onAddGrade(selectedSubjectId, gradeToAdd);

      // Input zurücksetzen
      setNewGradeInput("");
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Note:", error);
    }
  };

  return (
    <form className="add-subject-form" onSubmit={handleAddGrade}>
      <h2 className="section-headline">
        Note hinzufügen
        <img
          src={helpIcon}
          onMouseEnter={() => setHelpActive(true)}
          onMouseLeave={() => setHelpActive(false)}
        />
        <div className={`help-box ${helpActive ? "active" : ""}`}>
          <p>Hier kannst du eine Note hinzufügen für ein Fach deiner Wahl.</p>
          <p>Die Notenpunkte können maximal 15 betragen und minimal 0.</p>
          <p>
            Die Art ist abhängig von dem ausgewählten Fach. Wenn dein Fach als
            ein Nebenfach erstellt wurde, dann kannst du hier nur "Mündlich" und
            "Kurzarbeit" auswählen. Bei einem Hauptfach erscheint die Option
            "Schulaufgabe" zusätzlich.
          </p>
          <p>
            Berechnung der Gewichtung:
            <br />
            -- bei Hauptfach: Schulaufgabe 2x, Kurzarbeit 1x, Mündlich 1x
            <br />
            -- bei Nebenfach: Kurzarbeit 2x, Mündlich 1x
          </p>
        </div>
      </h2>
      <div className="form-group">
        <label className="form-label">Fach:</label>
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
      <div className="form-two-columns">
        <div className="form-group">
          <label className="form-label">Note:</label>
          <input
            className="form-input"
            type="number"
            value={newGradeInput}
            onChange={handleGradeChange}
            placeholder="15"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Art:</label>
          <select
            className="form-input"
            value={gradeWeight}
            onChange={handleWeightChange}
          >
            {findSubjectType(selectedSubjectId) === 0 ? (
              <>
                <option value={1}>Kurzarbeit</option>
                <option value={0}>Mündlich</option>
              </>
            ) : (
              <>
                <option value={2}>Schulaufgabe</option>
                <option value={1}>Kurzarbeit</option>
                <option value={0}>Mündlich</option>
              </>
            )}
          </select>
        </div>
      </div>
      <button className="btn-primary small" type="submit">
        Hinzufügen
      </button>
    </form>
  );
}
