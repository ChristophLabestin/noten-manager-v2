import { useEffect, useState } from "react";
import { ShareIcon } from "./icons";
import closeIcon from "../assets/close.svg";
import { lockBodyScroll, unlockBodyScroll } from "../services/scrollLock";
import { useAuth } from "../context/authcontext/useAuth";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "../interfaces/UserProfile";

const STORAGE_KEY = "nm_hide_install_pwa_hint";

const isMobileBrowserInWindow = () => {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const isMobile = /iphone|ipad|ipod|android/i.test(ua);
  const isStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true || window.matchMedia("(display-mode: standalone)").matches;

  return isMobile && !isStandalone;
};

export default function InstallPwaModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = async () => {
      const shouldShowForDevice = isMobileBrowserInWindow();
      if (!shouldShowForDevice) return;

      let hasHiddenLocal = false;
      try {
        hasHiddenLocal = window.localStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        hasHiddenLocal = false;
      }

      if (!user) {
        if (!hasHiddenLocal) {
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
        const hasHiddenRemote = profile?.hideInstallPwaHint === true;

        if (!hasHiddenLocal && !hasHiddenRemote) {
          setVisible(true);
        }
      } catch {
        if (!hasHiddenLocal) {
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
      // ignore storage errors (e.g. private mode)
    }

    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      void updateDoc(userDocRef, {
        hideInstallPwaHint: true,
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
          alt="Hinweis schließen"
        />
        <div className="install-pwa-modal">
          <h2 className="section-headline">
            App zum Home-Bildschirm hinzufügen
          </h2>
          <p>
            Für die beste Nutzung von Noten Manager kannst du die App als
            Verknüpfung auf deinem Home-Bildschirm speichern. So startet sie
            im Vollbild wie eine native App.
          </p>
          <ol className="install-pwa-steps">
            <li>
              Tippe in deinem Browser auf{" "}
              <span className="install-pwa-share-icon">
                <ShareIcon size={18} />
              </span>{" "}
              <span>Teilen</span>.
            </li>
            <li>Wähle anschließend „Zum Home-Bildschirm“. </li>
            <li>Bestätige mit „Hinzufügen“.</li>
          </ol>
          <p className="install-pwa-note">
            Hinweis: Dieser Dialog wird nicht mehr angezeigt, wenn du ihn
            schließt.
          </p>
        </div>
      </div>
    </div>
  );
}
