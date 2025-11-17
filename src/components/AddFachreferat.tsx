import { useState } from "react";
import { getAuth } from "firebase/auth";
import { Timestamp, doc, setDoc } from "firebase/firestore";
import type { Subject } from "../interfaces/Subject";
import { db } from "../firebase/firebaseConfig";
import helpIcon from "../assets/help.svg";
import { encryptString } from "../services/cryptoService";
import { BackIcon } from "./icons";
import { useGrades } from "../context/gradesContext/useGrades";

interface AddFachreferatProps {
  subjects: Subject[];
  encryptionKeyProp: CryptoKey;
}

const getGradeCategory = (points: number): "good" | "medium" | "bad" => {
  if (points >= 7) return "good";
  if (points >= 4) return "medium";
  return "bad";
};

export default function AddFachreferat({
  subjects,
  encryptionKeyProp,
}: AddFachreferatProps) {
  const { setFachreferat } = useGrades();
  const [newGradeInput, setNewGradeInput] = useState<string>("");
  const [gradeNote, setGradeNote] = useState<string>("");
  const [selectedSubjectName, setSelectedSubjectName] =
    useState<string>("");
  const [helpActive, setHelpActive] = useState<boolean>(false);
  const [infosExtended, setInfosExtended] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGradeInput(e.target.value);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGradeNote(e.target.value);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubjectName(e.target.value);
  };

  const handleAddFachreferat = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!encryptionKeyProp) {
      alert("Encryption Key fehlt!");
      return;
    }

    if (newGradeInput === "") {
      alert("Bitte Notenpunkte auswählen.");
      return;
    }

    const gradeNumber = Number(newGradeInput);
    if (!Number.isFinite(gradeNumber)) {
      alert("Bitte eine gültige Zahl eingeben.");
      return;
    }

    if (gradeNumber > 15 || gradeNumber < 0) {
      alert("Bitte eine gültige Zahl im Bereich 0–15 eingeben.");
      return;
    }

    if (!selectedSubjectName) {
      alert(
        "Bitte wähle das Fach aus, in dem du das Fachreferat gehalten hast."
      );
      return;
    }

    try {
      setIsSaving(true);

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("Kein Benutzer angemeldet.");
        return;
      }

      const notePrefix = `Fachreferat in ${selectedSubjectName}`;
      const fullNote =
        gradeNote.trim().length > 0
          ? `${notePrefix} – ${gradeNote.trim()}`
          : notePrefix;

      const encryptedGrade = await encryptString(
        gradeNumber.toString(),
        encryptionKeyProp
      );

      const now = Timestamp.fromDate(new Date());

      const fachreferatDocRef = doc(
        db,
        "users",
        user.uid,
        "fachreferat",
        "current"
      );

      await setDoc(fachreferatDocRef, {
        grade: encryptedGrade,
        subjectName: selectedSubjectName,
        note: fullNote,
        date: now,
      });

      setFachreferat({
        id: fachreferatDocRef.id,
        grade: gradeNumber,
        subjectName: selectedSubjectName,
        note: fullNote,
        date: now,
      });

      setNewGradeInput("");
      setGradeNote("");
      setSelectedSubjectName("");
    } catch (err) {
      console.error("Fehler beim Hinzufügen der Fachreferatsnote:", err);
      alert("Fehler beim Hinzufügen der Fachreferatsnote.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="add-subject-form" onSubmit={handleAddFachreferat}>
      <h2 className="section-headline">
        Fachreferatsnote hinzufügen
        <span
          className="help-icon-wrapper"
          onMouseEnter={() => setHelpActive(true)}
          onMouseLeave={() => setHelpActive(false)}
        >
          <img src={helpIcon} alt="Hilfe" />
        </span>
        <div className={`help-box ${helpActive ? "active" : ""}`}>
          <p>
            Hier kannst du die Note deines Fachreferats eintragen. Sie wird als
            zusätzliche Halbjahresleistung in die Berechnung der
            Gesamtleistung einbezogen.
          </p>
          <p>
            Das Fachreferat wird separat angezeigt und nicht als eigenes Fach in
            der Fächerübersicht gezählt.
          </p>
        </div>
      </h2>

      <div className="form-group">
        <label className="form-label">Fach des Fachreferats</label>
        <select
          className="form-input"
          value={selectedSubjectName}
          onChange={handleSubjectChange}
        >
          <option value="">- Fach auswählen -</option>
          {subjects.map((subject) => (
            <option key={subject.name} value={subject.name}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Note</label>
        <div className="grade-points-group">
          {Array.from({ length: 16 }, (_, index) => {
            const value = 15 - index;
            const stringValue = String(value);
            const isActive = newGradeInput === stringValue;
            const category = getGradeCategory(value);
            const classes = [
              "grade-point-pill",
              `grade-point-pill--${category}`,
              isActive ? "grade-point-pill--active" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <label key={value} className={classes}>
                <input
                  type="radio"
                  name="fachreferat-grade-points"
                  value={stringValue}
                  checked={isActive}
                  onChange={handleGradeChange}
                />
                {value}
              </label>
            );
          })}
        </div>
      </div>

      <div className={`form-hidden ${infosExtended ? "extended" : ""}`}>
        <div className="form-group">
          <label className="form-label">Notiz</label>
          <textarea
            className="form-input hidden-textarea"
            value={gradeNote}
            onChange={handleNoteChange}
            placeholder="Zusätzliche Infos zum Fachreferat ..."
          ></textarea>
        </div>
      </div>

      <div
        className="extend-button"
        onClick={() => setInfosExtended(!infosExtended)}
      >
        <BackIcon
          size={18}
          className={`extend-icon ${infosExtended ? "extended" : ""}`}
        />
        <p>Notiz hinzufügen</p>
      </div>

      <button className="btn-primary small" type="submit" disabled={isSaving}>
        {isSaving ? "Speichern..." : "Fachreferatsnote speichern"}
      </button>
    </form>
  );
}

