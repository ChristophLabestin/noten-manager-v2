import type { Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

// NICHT direkt firebase/analytics importieren
let analytics: Analytics | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db: Firestore = getFirestore(app);

export const initializeAnalytics = async () => {
  if (import.meta.env.MODE !== "production") {
    return null; // in Dev niemals laden
  }
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (!analytics && (await isSupported())) {
      analytics = getAnalytics(app);
    }
  } catch (err) {
    console.warn("Analytics konnte nicht initialisiert werden:", err);
  }
  return analytics;
};

export { auth, app, db };
