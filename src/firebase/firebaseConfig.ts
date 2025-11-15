import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
//  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
//  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
//  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
//  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
//  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
//  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
//};

const firebaseConfig = {
  apiKey: "AIzaSyAAO0Czb0-jNUm76BKPjJDwys3axjYuHAA",
  authDomain: "noten-manager-v2.firebaseapp.com",
  projectId: "noten-manager-v2",
  storageBucket: "noten-manager-v2.firebasestorage.app",
  messagingSenderId: "884241144377",
  appId: "1:884241144377:web:df1a7ae0d90a9876784be8",
  measurementId: "G-JQ20K9SKQ1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { auth, app, db };
