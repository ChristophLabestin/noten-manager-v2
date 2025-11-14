import type { Timestamp } from "firebase/firestore";

export interface EncryptedGrade {
  grade: string; // verschluesselt
  weight: number;
  date: Timestamp;
  note?: string;
  // 1 = 1. Halbjahr, 2 = 2. Halbjahr
  halfYear?: 1 | 2;
}

export interface Grade {
  grade: number; // entschluesselt
  weight: number;
  date: Timestamp;
  note?: string;
  // 1 = 1. Halbjahr, 2 = 2. Halbjahr
  halfYear?: 1 | 2;
}
