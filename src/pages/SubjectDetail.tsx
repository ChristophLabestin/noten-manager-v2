import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { EncryptedGrade, Grade } from "../interfaces/Grade";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import editIcon from "../assets/edit.svg";
import deleteIcon from "../assets/delete.svg";
import saveIcon from "../assets/save.svg";
import cancelIcon from "../assets/cancel.svg";
import BackToHome from "../components/BackToHome";
import { getAuth } from "firebase/auth";
import {
  decryptString,
  deriveKeyFromPassword,
  encryptString,
} from "../services/cryptoService";

interface SubjectDetailPageProps {
  subjectId: string;
}

interface GradeWithId extends Grade {
  id: string;
}

export default function SubjectDetailPage({
  subjectId,
}: SubjectDetailPageProps) {
  const { user } = useAuth();
  const [activeSubject, setActiveSubject] = useState<Subject>();
  const [subjectGrades, setSubjectGrades] = useState<GradeWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGradeInput, setNewGradeInput] = useState<string>(""); // Input als String
  const [gradeWeight, setGradeWeight] = useState<number>(0);

  // State für editierbare Note
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedGrade, setEditedGrade] = useState<Grade>({
    grade: 0,
    weight: 1,
    date: Timestamp.fromDate(new Date()),
  });

  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    const fetchKeyAndData = async () => {
      if (!user) return;

      try {
        // User-Dokument
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("UserDoc fehlt");

        const { encryptionSalt } = userSnap.data();
        if (!encryptionSalt) throw new Error("Encryption Salt fehlt");

        // Key ableiten
        const key = await deriveKeyFromPassword(user.uid, encryptionSalt);
        setEncryptionKey(key);

        // Fachdaten
        const subjectDocRef = doc(db, "users", user.uid, "subjects", subjectId);
        const subjectDocSnap = await getDoc(subjectDocRef);
        if (!subjectDocSnap.exists()) {
          setLoading(false);
          throw new Error("Fach nicht gefunden!");
        }
        const subjectData = subjectDocSnap.data() as Subject;
        setActiveSubject({ ...subjectData, name: subjectDocSnap.id });

        // Noten aus Firestore holen
        const gradesRef = collection(
          db,
          "users",
          user.uid,
          "subjects",
          subjectId,
          "grades"
        );
        const gradesSnapshot = await getDocs(gradesRef);

        const gradesData: GradeWithId[] = [];
        for (const gradeDoc of gradesSnapshot.docs) {
          const encryptedGrade = gradeDoc.data() as EncryptedGrade;
          // Note entschlüsseln
          const decryptedGradeStr = await decryptString(
            encryptedGrade.grade,
            key
          );
          gradesData.push({
            id: gradeDoc.id,
            grade: Number(decryptedGradeStr),
            weight: encryptedGrade.weight,
            date: encryptedGrade.date,
          });
        }

        setSubjectGrades(gradesData);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        throw new Error(
          "Fehler beim Laden der Fachdaten: " +
            (err instanceof Error ? err.message : String(err))
        );
      }
    };

    fetchKeyAndData();
  }, [user, subjectId]);

  const calculateGradeWeight = (grade: Grade): number => {
    if (!activeSubject) return 1; // Default

    const type = activeSubject.type;

    if (type === 1) {
      // Hauptfach
      return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1; // 2 bleibt 2, 1 oder 0 wird zu 1
    }

    if (type === 0) {
      // Nebenfach
      return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1; // 1 wird 2, 0 wird 1
    }

    return 1; // Default
  };

  const calculateAverageScore = (grades: GradeWithId[]): string => {
    if (!grades || grades.length === 0) return "—";
    const total = grades.reduce(
      (acc, grade) => acc + grade.grade * calculateGradeWeight(grade),
      0
    );
    const totalWeight = grades.reduce(
      (acc, grade) => acc + calculateGradeWeight(grade),
      0
    );
    return totalWeight === 0 ? "—" : (total / totalWeight).toFixed(2);
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditedGrade({ ...subjectGrades[index] }); // aktuelle Werte laden
  };

  const handleDeleteClick = async (gradeId: string) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "users", user.uid, "subjects", subjectId, "grades", gradeId)
      );
      setSubjectGrades(subjectGrades.filter((g) => g.id !== gradeId));
    } catch (err) {
      throw new Error(
        "Fehler beim Löschen der Note: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleSaveClick = async (gradeId: string) => {
    if (!user || editingIndex === null || !encryptionKey) return;
    try {
      // Note verschlüsseln bevor speichern
      const encryptedGradeStr = await encryptString(
        editedGrade.grade.toString(),
        encryptionKey
      );
      const gradeDocRef = doc(
        db,
        "users",
        user.uid,
        "subjects",
        subjectId,
        "grades",
        gradeId
      );
      await updateDoc(gradeDocRef, {
        grade: encryptedGradeStr,
        weight: editedGrade.weight,
        date: editedGrade.date,
      });

      const updatedGrades = [...subjectGrades];
      updatedGrades[editingIndex] = { ...editedGrade, id: gradeId };
      setSubjectGrades(updatedGrades);
      setEditingIndex(null);
    } catch (err) {
      throw new Error(
        "Fehler beim Speichern der Note: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGradeInput(e.target.value);
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGradeWeight(Number(e.target.value));
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptionKey || !activeSubject) return;

    const gradeNumber = Number(newGradeInput);
    if (isNaN(gradeNumber)) {
      alert("Bitte eine gültige Zahl eingeben");
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Kein Benutzer angemeldet");
      if (!activeSubject) throw new Error("Kein Fach ausgewählt");

      const encryptedGradeStr = await encryptString(
        gradeNumber.toString(),
        encryptionKey
      );

      const gradeToAdd: EncryptedGrade = {
        grade: encryptedGradeStr,
        weight: gradeWeight,
        date: Timestamp.fromDate(new Date()),
      };

      const gradesRef = collection(
        db,
        "users",
        user.uid,
        "subjects",
        activeSubject.name,
        "grades"
      );
      const docRef = await addDoc(gradesRef, gradeToAdd);

      // State aktualisieren – Note gleich entschlüsseln für Anzeige
      setSubjectGrades((prev) => [
        ...prev,
        {
          id: docRef.id,
          grade: gradeNumber,
          weight: gradeWeight,
          date: gradeToAdd.date,
        },
      ]);

      setNewGradeInput("");
      setGradeWeight(activeSubject.type === 0 ? 1 : 2);
    } catch (err) {
      throw new Error(
        "Fehler beim Hinzufügen der Note: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  if (loading) return <p>Lade Fachdaten...</p>;
  if (!activeSubject) return <p>Fach nicht gefunden!</p>;

  return (
    <div className="home-layout">
      <div className="subject-detail-head">
        <div>
          <h1>{activeSubject.name}</h1>
          <h2 className="subject-detail-subheadline">
            {activeSubject.type === 0 ? "Nebenfach" : "Hauptfach"}
          </h2>
        </div>
        <div className="subject-detail-grade">
          <div
            className={`grade-box ${
              Number(calculateAverageScore(subjectGrades)) >= 7
                ? "good"
                : Number(calculateAverageScore(subjectGrades)) >= 4
                ? "medium"
                : "bad"
            }`}
          >
            {calculateAverageScore(subjectGrades)}
          </div>
        </div>
      </div>

      {subjectGrades.length === 0 ? (
        <p>Keine Noten vorhanden</p>
      ) : (
        <div className="table-wrapper">
          <table className="grades-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Note</th>
                <th>Art</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {subjectGrades.map((grade, index) => (
                <tr key={grade.id}>
                  {editingIndex === index ? (
                    <>
                      <td>{grade.date.toDate().toLocaleDateString()}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input small"
                          value={editedGrade.grade}
                          style={{ minWidth: "50px" }}
                          min={0}
                          max={15}
                          onChange={(e) =>
                            setEditedGrade({
                              ...editedGrade,
                              grade: Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={editedGrade.weight}
                          className="form-input small"
                          style={{ minWidth: "130px" }}
                          onChange={(e) =>
                            setEditedGrade({
                              ...editedGrade,
                              weight: Number(e.target.value),
                            })
                          }
                        >
                          {activeSubject.type === 0 ? (
                            <>
                              <option value={3}>Fachreferat</option>
                              <option value={1}>Kurzarbeit</option>
                              <option value={0}>Mündlich</option>
                            </>
                          ) : (
                            <>
                              <option value={3}>Fachreferat</option>
                              <option value={2}>Schulaufgabe</option>
                              <option value={1}>Kurzarbeit</option>
                              <option value={0}>Mündlich</option>
                            </>
                          )}
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => handleSaveClick(grade.id)}
                        >
                          <img src={saveIcon}></img>
                        </button>
                        <button
                          className="btn-small"
                          onClick={() => setEditingIndex(null)}
                        >
                          <img src={cancelIcon}></img>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{grade.date.toDate().toLocaleDateString()}</td>
                      <td>{grade.grade}</td>
                      <td>
                        {grade.weight === 0
                          ? "Mündlich"
                          : grade.weight === 1
                          ? "Kurzarbeit"
                          : grade.weight === 2
                          ? "Schulaufgabe"
                          : "Fachreferat"}
                      </td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => handleEditClick(index)}
                        >
                          <img src={editIcon}></img>
                        </button>
                        <button
                          className="btn-small"
                          onClick={() => handleDeleteClick(grade.id)}
                        >
                          <img src={deleteIcon}></img>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="add-grade-row">
        <div className="form-two-columns">
          <div className="form-group">
            <label className="form-label">Note:</label>
            <input
              className="form-input"
              type="number"
              value={newGradeInput}
              onChange={handleGradeChange}
              placeholder="15"
              min={0}
              max={15}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Art:</label>
            <select
              className="form-input"
              value={gradeWeight}
              onChange={handleWeightChange}
            >
              {activeSubject.type === 0 ? (
                <>
                  <option value={3}>Fachreferat</option>
                  <option value={1}>Kurzarbeit</option>
                  <option value={0}>Mündlich</option>
                </>
              ) : (
                <>
                  <option value={3}>Fachreferat</option>
                  <option value={2}>Schulaufgabe</option>
                  <option value={1}>Kurzarbeit</option>
                  <option value={0}>Mündlich</option>
                </>
              )}
            </select>
          </div>
        </div>
        <button className="btn-primary small" onClick={handleAddGrade}>
          Hinzufügen
        </button>
      </div>
      <BackToHome />
    </div>
  );
}
