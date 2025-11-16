export type ExamType = "written" | "oral" | "presentation";

export interface Subject {
    name: string;
    type: number;
    date: Date;
    order?: number;
    teacher?: string;
    room?: string;
    email?: string;
    alias?: string;
    droppedHalfYear?: 1 | 2;
    examSubject?: boolean;
    examType?: ExamType;
    examPointsEncrypted?: string;
}
