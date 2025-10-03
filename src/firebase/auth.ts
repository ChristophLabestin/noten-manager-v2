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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { generateSalt } from "../services/cryptoService";

// Benutzer registrieren
export const registerUser = async (
  email: string,
  password: string,
  name: string
) => {
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const salt = generateSalt();

    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      name,
      email,
      encryptionSalt: salt,
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

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let salt: string;

    if (userSnap.exists() && userSnap.data().encryptionSalt) {
      // Falls schon ein Salt existiert → diesen wiederverwenden
      salt = userSnap.data().encryptionSalt;
    } else {
      // Falls neuer User → Salt generieren
      salt = generateSalt();
    }

    await setDoc(
      userRef,
      {
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        encryptionSalt: salt,
      },
      { merge: true }
    );

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
