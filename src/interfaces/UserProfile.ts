export interface UserProfile {
    id: string;
    name: string;
    email: string;
    encryptionSalt: string;
    displayName?: string;
    theme?: "default" | "feminine";
    darkMode?: boolean;
    compactView?: boolean;
    subjectSortMode?: "name" | "average" | "custom";
    subjectSortOrder?: string[];
}
