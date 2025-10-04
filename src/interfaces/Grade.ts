import type { Timestamp } from "firebase/firestore";

export interface EncryptedGrade {
  grade: string; // verschlüsselt
  weight: number;
  date: Timestamp;
  note?: string;
}

export interface Grade {
  grade: number; // entschlüsselt
  weight: number;
  date: Timestamp;
  note?: string;
}