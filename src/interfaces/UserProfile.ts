export interface UserProfile {
    id: string;
    name: string;
    email: string;
    encryptionSalt: string;
    displayName?: string;
}