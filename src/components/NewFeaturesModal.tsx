import { useEffect, useState } from "react";
import closeIcon from "../assets/close.svg";
import { lockBodyScroll, unlockBodyScroll } from "../services/scrollLock";
import { navigate } from "../services/navigation";
import { BookIcon } from "./icons";
import { useAuth } from "../context/authcontext/useAuth";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "../interfaces/UserProfile";

const CURRENT_VERSION = "1.3";
const STORAGE_KEY = `nm_features_seen_v${CURRENT_VERSION}`;

export default function NewFeaturesModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = async () => {
      let seenLocal = false;
      try {
        seenLocal = window.localStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        seenLocal = false;
      }

      if (!user) {
        if (!seenLocal) {
          setVisible(true);
        }
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        const profile = snap.exists()
          ? (snap.data() as UserProfile)
          : undefined;
        const seenRemote = profile?.seenFeaturesVersion === CURRENT_VERSION;

        if (!seenLocal && !seenRemote) {
          setVisible(true);
        }
      } catch {
        if (!seenLocal) {
          setVisible(true);
        }
      }
    };

    void checkVisibility();
  }, [user]);

  useEffect(() => {
    if (visible) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
    return () => {
      unlockBodyScroll();
    };
  }, [visible]);

  const handleClose = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore storage errors
    }

    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      void updateDoc(userDocRef, {
        seenFeaturesVersion: CURRENT_VERSION,
      }).catch(() => {
        // ignore firestore write errors for this hint
      });
    }

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-background" onClick={handleClose}></div>
      <div className="modal">
        <img
          src={closeIcon}
          className="close-icon"
          onClick={handleClose}
          alt="Neuerungen schließen"
        />
        <div className="new-features-modal">
          <h2 className="section-headline">Neu in Version {CURRENT_VERSION}</h2>
          <p className="settings-help-text">
            Wir haben ein neues Feature hinzugefügt, das dir hilft, deine
            Abschlussnote besser zu planen:
          </p>
          <ul className="new-features-list">
            <li>
              <strong>Abschlussnoten-Seite:</strong> Unter{" "}
              <BookIcon size={16} className="bottom-nav-icon" /> in der
              Navigation kannst du pro Fach ein Halbjahr streichen und sehen,
              wie sich das auf deine Abschlussnote auswirkt.
            </li>
          </ul>
          <div className="new-features-actions">
            <button
              type="button"
              className="btn-primary small"
              onClick={() => {
                handleClose();
                navigate("/abschlussnote");
              }}
            >
              Abschlussnote ansehen
            </button>
            <button type="button" className="link-button" onClick={handleClose}>
              Später
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
