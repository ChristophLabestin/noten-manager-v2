import { getAuth } from "firebase/auth";
import { doc, setDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { db } from "../firebase/firebaseConfig";
import type { Subject } from "../interfaces/Subject";
import helpIcon from "../assets/help.svg";
import { BackIcon } from "./icons";

interface AddSubjectProps {
  onAddSubject: (subject: Subject) => void;
}

export default function AddSubject({
  onAddSubject,
}: AddSubjectProps) {
  const [subjectName, setSubjectName] = useState<string>("");
  const [subjectType, setSubjectType] = useState<number>(1);
  const [teacherName, setTeacherName] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [helpActive, setHelpActive] = useState<boolean>(false);
  const [infosExtended, setInfosExtended] = useState<boolean>(false);
  const [teacherEmail, setTeacherEmail] = useState<string>("");
  const [teacherAlias, setTeacherAlias] = useState<string>("");

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubjectName(e.target.value);
  };
  const handleTeacherNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeacherName(e.target.value);
  };
  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomName(e.target.value);
  };
  const handleTeacherEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeacherEmail(e.target.value);
  };
  const handleTeacherAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeacherAlias(e.target.value);
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
        teacher: teacherName,
        room: roomName,
        email: teacherEmail,
        alias: teacherAlias,
      };

      await setDoc(subjectDocRef, newSubject);

      // Neu hinzugefügtes Fach direkt in den Home-State pushen
      onAddSubject(newSubject);

      setSubjectName("");
      setSubjectType(1);
      setTeacherName("");
      setRoomName("");
      setTeacherEmail("");
      setTeacherAlias("");
    } catch (err) {
      throw new Error(
        "Fehler beim Hinzufügen des Fachs: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  return (
    <>
      <form className="add-subject-form" onSubmit={handleAddSubject}>
        <h2 className="section-headline">
          Fach hinzufügen
          <span
            className="help-icon-wrapper"
            onMouseEnter={() => setHelpActive(true)}
            onMouseLeave={() => setHelpActive(false)}
          >
            <img src={helpIcon} alt="Hilfe" />
          </span>
          <div className={`help-box ${helpActive ? "active" : ""}`}>
            <p>
              Hier kannst du ein Fach hinzufügen. Der Typ wird unterschieden
              zwischen Haupt- und Nebenfach.
            </p>
            <p>
              In einem Hauptfach wird mindestens 1 Schulaufgabe pro Halbjahr
              geschrieben.
            </p>
            <p>
              In einem Nebenfach werden keine Schulaufgaben geschrieben,
              sondern nur Kurzarbeiten.
            </p>
            <p>Diese Einstellung lässt sich später nicht mehr ändern!</p>
          </div>
        </h2>
        <div className="form-two-columns">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              type="text"
              value={subjectName}
              onChange={handleSubjectChange}
              placeholder="Mathe"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Fachtyp</label>
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
        <div className={`form-hidden ${infosExtended ? "extended" : ""}`}>
          <div className="form-two-columns">
            <div className="form-group">
              <label className="form-label">Lehrer</label>
              <input
                className="form-input"
                type="text"
                value={teacherName}
                onChange={handleTeacherNameChange}
                placeholder="Herr Mustermann"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Raum</label>
              <input
                className="form-input"
                type="text"
                value={roomName}
                onChange={handleRoomChange}
                placeholder="K100"
              />
            </div>
          </div>
          <div className="form-two-columns">
            <div className="form-group">
              <label className="form-label">E-Mail</label>
              <input
                className="form-input"
                type="text"
                value={teacherEmail}
                onChange={handleTeacherEmailChange}
                placeholder="mustermann@gmail.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Kürzel</label>
              <input
                className="form-input"
                type="text"
                value={teacherAlias}
                onChange={handleTeacherAliasChange}
                placeholder="MUS"
              />
            </div>
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
          <p>Zusätzliche Infos hinzufügen</p>
        </div>
        <button className="btn-primary small" type="submit">
          Hinzufügen
        </button>
      </form>
    </>
  );
}
