import { useEffect, useState } from "react";
import Icon from "./Icon";
import shareIcon from "../assets/share.svg";

const STORAGE_KEY = "nm_hide_install_pwa_hint";

const isIosSafariInBrowser = () => {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true || window.matchMedia("(display-mode: standalone)").matches;

  const isSafari =
    /safari/i.test(ua) &&
    !/crios|fxios|chrome|android/i.test(ua);

  return isIos && isSafari && !isStandalone;
};

export default function InstallPwaModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasHidden = window.localStorage.getItem(STORAGE_KEY) === "true";
    if (!hasHidden && isIosSafariInBrowser()) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="modal-wrapper">
      <div className="modal-background" onClick={handleClose}></div>
      <div className="modal">
        <button
          type="button"
          className="close-icon"
          onClick={handleClose}
          aria-label="Hinweis schließen"
        >
          ×
        </button>
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
              Tippe unten in Safari auf{" "}
              <span className="install-pwa-share-icon">
                <Icon src={shareIcon} size={18} alt="Teilen-Symbol" />
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

