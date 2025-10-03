import { getAuth } from "firebase/auth";
import { doc, setDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { db } from "../firebase/firebaseConfig";
import type { Subject } from "../interfaces/Subject";
import helpIcon from "../assets/help.svg";

interface AddSubjectProps {
  onAddSubject: (subject: Subject) => void;
}

export default function AddSubject({ onAddSubject }: AddSubjectProps) {
  const [subjectName, setSubjectName] = useState<string>("");
  const [subjectType, setSubjectType] = useState<number>(1);
  const [helpActive, setHelpActive] = useState<boolean>(false);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubjectName(e.target.value);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubjectType(Number(e.target.value));
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const subjectsRef = collection(db, "users", user.uid, "subjects");
      const subjectDocRef = doc(subjectsRef, subjectName); // ID = Fachname

      const newSubject: Subject = {
        name: subjectName,
        type: subjectType,
        date: new Date(),
      };

      await setDoc(subjectDocRef, newSubject);

      // Neu hinzugefügtes Fach direkt in den Home-State pushen
      onAddSubject(newSubject);

      setSubjectName("");
      setSubjectType(1);
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Fachs:", error);
    }
  };

  return (
    <>
      <form className="add-subject-form" onSubmit={handleAddSubject}>
        <h2 className="section-headline">
          Fach hinzufügen
          <img
            src={helpIcon}
            onMouseEnter={() => setHelpActive(true)}
            onMouseLeave={() => setHelpActive(false)}
          />
          <div className={`help-box ${helpActive ? "active" : ""}`}>
            <p>Hier kannst du ein Fach hinzufügen. Der Typ wird unterschieden zwischen Haupt- und Nebenfach.</p>
            <p>
              In einem Hauptfach wird mindestens 1 Schulaufgabe pro Halbjahr
              geschrieben.
            </p>
            <p>
              In einem Nebenfach werden keine Schulaufgaben geschrieben sondern
              nur Kurzarbeiten.
            </p>
            <p>Diese Einstellung lässt sich später nicht mehr ändern!</p>
          </div>
        </h2>
        <div className="form-two-columns">
          <div className="form-group">
            <label className="form-label">Name:</label>
            <input
              className="form-input"
              type="text"
              value={subjectName}
              onChange={handleSubjectChange}
              placeholder="Mathe"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Fach Typ:</label>
            <select
              className="form-input"
              value={subjectType}
              onChange={handleTypeChange}
            >
              <option value={1}>Hauptfach</option>
              <option value={0}>Nebenfach</option>
            </select>
          </div>
        </div>
        <button className="btn-primary small" type="submit">
          hinzufügen
        </button>
      </form>
    </>
  );
}
