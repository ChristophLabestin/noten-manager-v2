import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  } catch (err) {
    throw new Error(
      "Fehler bei der Registrierung: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
};

// Benutzer anmelden
export const loginUser = async (
  email: string,
  password: string,
  rememberMe: boolean
) => {
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (err) {
    throw new Error(
      "Fehler bei der Anmeldung: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
};

// Benutzer mit Google anmelden
export const loginUserWithGoogle = async (rememberMe: boolean) => {
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

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
        name: user.displayName || "",
        email: user.email || "",
        encryptionSalt: salt,
      },
      { merge: true }
    );

    return result;
  } catch (err) {
    throw new Error(
      "Fehler bei der Anmeldung mit Google: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
};

// Benutzer abmelden
export const logoutUser = async () => {
  try {
    await auth.signOut();
  } catch (err) {
    throw new Error(
      "Fehler beim Abmelden: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
};

// Benutzer Passwort Reset
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    throw new Error(
      "Fehler beim Zurücksetzen des Passworts: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
};

// // Benutzer Passwort ändern
// export const changePassword = async (password: string) => {
//   try {
//     await updatePassword(auth.currentUser, password);
//   } catch (err) {
//     throw new Error("Fehler beim Ändern des Passworts: " + (err instanceof Error ? err.message : String(err)));
//   }
// };

// // Email Verification
// export const doSendEmailVerification = async () => {
//   try {
//     await sendEmailVerification(auth.currentUser, {
//       url: `${window.location.origin}/home`,
//     });
//   } catch (err) {
//     throw new Error("Fehler beim Versenden der Email-Verifizierung: " + (err instanceof Error ? err.message : String(err)));
//   }
// };
