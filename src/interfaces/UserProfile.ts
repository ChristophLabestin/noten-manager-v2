export interface UserProfile {
    id: string;
    name: string;
    email: string;
    encryptionSalt: string;
    displayName?: string;
    theme?: "default" | "feminine";
    darkMode?: boolean;
    compactView?: boolean;
    subjectSortMode?: "name" | "name_desc" | "average" | "average_worst" | "custom";
    subjectSortOrder?: string[];
    hideInstallPwaHint?: boolean;
    seenFeaturesVersion?: string;
}
