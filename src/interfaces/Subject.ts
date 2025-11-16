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
}
