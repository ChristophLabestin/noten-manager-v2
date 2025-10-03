import type { Timestamp } from "firebase/firestore";

export interface Grade {
    grade: number;
    weight: number;
    date: Timestamp;
}