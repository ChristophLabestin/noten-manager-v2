import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext/useAuth";
import type { Subject } from "../interfaces/Subject";
import type { Grade } from "../interfaces/Grade";
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fachdaten
      const subjectDocRef = doc(db, "users", user.uid, "subjects", subjectId);
      const subjectDocSnap = await getDoc(subjectDocRef);

      if (!subjectDocSnap.exists()) {
        console.error("Fach nicht gefunden!");
        setLoading(false);
        return;
      }

      const subjectData = subjectDocSnap.data() as Subject;
      setActiveSubject({ ...subjectData, name: subjectDocSnap.id });

      // Noten
      const gradesRef = collection(
        db,
        "users",
        user.uid,
        "subjects",
        subjectId,
        "grades"
      );
      const gradesSnapshot = await getDocs(gradesRef);

      const gradesData: GradeWithId[] = gradesSnapshot.docs.map(
        (doc) =>
          ({
            ...doc.data(),
            date: doc.data().date,
            id: doc.id,
          } as GradeWithId)
      );

      setSubjectGrades(gradesData);
      setLoading(false);
    };

    fetchData();
  }, [user, subjectId]);

  const calculateGradeWeight = (grade: Grade): number => {
    if (!activeSubject) return 1; // Default

    const type = activeSubject.type;

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

  const calculateAverageScore = (grades: GradeWithId[]): string => {
    if (!grades || grades.length === 0) return "—";
    const total = grades.reduce(
      (acc, grade) => acc + grade.grade * calculateGradeWeight(grade),
      0
    );
    const totalWeight = grades.reduce((acc, grade) => acc + calculateGradeWeight(grade), 0);
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
    } catch (error) {
      console.error("Fehler beim Löschen der Note:", error);
    }
  };

  const handleSaveClick = async (gradeId: string) => {
    if (!user || editingIndex === null) return;
    try {
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
        grade: editedGrade.grade,
        weight: editedGrade.weight,
        date: editedGrade.date,
      });

      // State aktualisieren
      const updatedGrades = [...subjectGrades];
      updatedGrades[editingIndex] = { ...editedGrade, id: gradeId };
      setSubjectGrades(updatedGrades);
      setEditingIndex(null);
    } catch (error) {
      console.error("Fehler beim Speichern der Note:", error);
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
      if (!activeSubject) throw new Error("Kein Fach ausgewählt");

      const gradesRef = collection(
        db,
        "users",
        user.uid,
        "subjects",
        activeSubject.name,
        "grades"
      );

      const docRef = await addDoc(gradesRef, {
        ...gradeToAdd,
      });

      // State aktualisieren – neue Note direkt hinzufügen
      setSubjectGrades((prev) => [
        ...prev,
        { ...gradeToAdd, id: docRef.id }, // id vom Firestore-Dokument
      ]);

      // Input zurücksetzen
      setNewGradeInput("");
      setGradeWeight(activeSubject.type === 0 ? 1 : 2); // optional: default wiederherstellen
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Note:", error);
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
                        <option value={0}>Mündlich</option>
                        <option value={1}>Kurzarbeit</option>
                        <option value={2}>Schulaufgabe</option>
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
                        : "Schulaufgabe"}
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
        <button className="btn-primary small" onClick={handleAddGrade}>
          Hinzufügen
        </button>
      </div>
      <BackToHome />
    </div>
  );
}
