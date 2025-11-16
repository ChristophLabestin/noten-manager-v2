import { createContext } from "react";
import type { Subject } from "../../interfaces/Subject";
import type { GradeWithId } from "../../interfaces/Grade";

export type SubjectSortMode =
  | "name"
  | "name_desc"
  | "average"
  | "average_worst"
  | "custom";

export interface GradesContextType {
  subjects: Subject[];
  gradesBySubject: Record<string, GradeWithId[]>;
  encryptionKey: CryptoKey | null;
  isLoading: boolean;
  loadingLabel: string;
  progress: number;
  compactView: boolean;
   subjectSortMode: SubjectSortMode;
   subjectSortOrder: string[];
  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  addGrade: (subjectId: string, grade: GradeWithId) => void;
  updateGrade: (subjectId: string, grade: GradeWithId) => void;
  deleteGrade: (subjectId: string, gradeId: string) => void;
  refresh: () => Promise<void>;
  updateSubjectSortPreferences: (
    mode: SubjectSortMode,
    order: string[]
  ) => void;
}

export const GradesContext = createContext<GradesContextType | undefined>(
  undefined
);
