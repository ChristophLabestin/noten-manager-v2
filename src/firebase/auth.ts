import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  // updatePassword,
  // sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebaseConfig";
import { db } from "./firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

// Benutzer registrieren
export const registerUser = async (email: string, password: string, name: string) => {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      name,
      email,
      lightmode: false,
      displayTrialResult: true,
    });
  } catch (error) {
    console.error("Fehler bei der Registrierung:", error);
  }
};

// Benutzer anmelden
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential; // Gibt die UserCredential zurück
  } catch (error) {
    console.error("Fehler bei der Anmeldung:", error);
    throw error; // Wirf den Fehler weiter, um ihn an anderer Stelle behandeln zu können
  }
};

// Benutzer mit Google anmelden
export const loginUserWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Benutzerdaten in Firestore speichern
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      lightmode: false,
      displayTrialResult: true,
      // Weitere benutzerspezifische Daten hier hinzufügen, falls nötig
    }, { merge: true }); // merge: true aktualisiert die bestehenden Daten, anstatt sie zu überschreiben

    return result;
  } catch (error) {
    console.error("Fehler bei der Anmeldung mit Google:", error);
  }
};

// Benutzer abmelden
export const logoutUser = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Fehler beim Abmelden:", error);
  }
};

// Benutzer Passwort Reset
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Fehler beim Zurücksetzen des Passworts:", error);
  }
};

// // Benutzer Passwort ändern
// export const changePassword = async (password: string) => {
//   try {
//     await updatePassword(auth.currentUser, password);
//   } catch (error) {
//     console.error("Fehler beim Ändern des Passworts:", error);
//   }
// };

// // Email Verification
// export const doSendEmailVerification = async () => {
//   try {
//     await sendEmailVerification(auth.currentUser, {
//       url: `${window.location.origin}/home`,
//     });
//   } catch (error) {
//     console.error("Fehler beim Versenden der Email-Verifizierung:", error);
//   }
// };
