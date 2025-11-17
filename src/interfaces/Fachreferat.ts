import type { Timestamp } from "firebase/firestore";

export interface EncryptedFachreferat {
  grade: string;
  subjectName: string;
  date: Timestamp;
  note?: string | null;
}

export interface Fachreferat {
  id: string;
  grade: number;
  subjectName: string;
  date: Timestamp;
  note?: string;
}

