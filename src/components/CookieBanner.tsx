import React, { useState } from "react";
import { useCookieConsent } from "../context/cookieContext/useCookieConsent";
// import { initializeAnalytics } from "../firebase/firebaseConfig";

const CookieBanner: React.FC = () => {
  const { setConsent, bannerVisible } = useCookieConsent();
  const [moreInfo, setMoreInfo] = useState(false);

  const handleAccept = () => {
    setConsent(true);
    // initializeAnalytics(); // Initialize analytics on acceptance
  };

  const handleDecline = () => {
    setConsent(false); // Declining sets banner visibility to false
  };

  const handleMoreInfo = () => {
    setMoreInfo(!moreInfo);
  };

  if (!bannerVisible) return null; // Hide banner if user has made a choice

  return (
    <div className="cookie-banner-wrapper">
      <div className={`cookie-banner ${moreInfo ? "more-info" : ""}`}>
        <h2 className="display-6">Cookie-Einverständnis</h2>
        {moreInfo ? (
          <div className="cookie-more-info-wrapper">
            <h2 className="display-6">
              Warum verwenden wir Cookies?
            </h2>
            <h3>Notwendige Cookies</h3>
            <p>
              Diese Cookies sind für das einwandfreie Funktionieren der Website
              unerlässlich. Sie ermöglichen grundlegende Funktionen wie die
              Seitennavigation und den Zugriff auf sichere Bereiche. Ohne diese
              Cookies kann die Website möglicherweise nicht wie vorgesehen
              funktionieren.
            </p>
            <h3>Leistungs-Cookies</h3>
            <p>
              Diese Cookies sammeln anonyme Informationen darüber, wie Besucher
              unsere Website nutzen, z. B. welche Seiten am häufigsten besucht
              werden und ob Besucher Fehlermeldungen erhalten. Diese Daten
              helfen uns, die Leistung und Benutzerfreundlichkeit unserer
              Website zu verbessern.
            </p>
            <h3>Funktionale Cookies</h3>
            <p>
              Diese Cookies ermöglichen es der Website, sich an Ihre Auswahl zu
              erinnern, wie z. B. Ihre bevorzugte Sprache oder Ihren Standort,
              und bieten erweiterte, personalisierte Funktionen.
            </p>
            <h3>Marketing-Cookies</h3>
            <p>
              Marketing-Cookies helfen uns, gezielte Inhalte und Werbeanzeigen
              bereitzustellen, die für Sie relevant sein könnten. Diese Cookies
              speichern Informationen über Ihren Besuch auf unserer Website und
              können mit anderen Datenquellen kombiniert werden, um Ihr Profil
              zu erstellen.
            </p>
            <h3>Google Analytics</h3>
            <p>
              Wir verwenden Google Analytics, um das Besucherverhalten auf
              unserer Website zu analysieren. Google Analytics sammelt
              Informationen anonym und berichtet Website-Trends, ohne einzelne
              Besucher zu identifizieren. Weitere Informationen finden Sie in{" "}
              <a
                href="https://policies.google.com/privacy"
                className="hyperlink"
              >
                Googles Datenschutzerklärung
              </a>
              .
            </p>
            <h2 className="display-6">Ihre Auswahlmöglichkeiten</h2>
            <h3>Akzeptieren</h3>
            <p>
              Wenn Sie auf „Akzeptieren“ klicken, stimmen Sie der Verwendung
              aller oben beschriebenen Cookies zu. So können wir Ihnen ein
              optimales Benutzererlebnis bieten.
            </p>
            <h3>Ablehnen</h3>
            <p>
              Wenn Sie auf „Ablehnen“ klicken, verwenden wir nur die notwendigen
              Cookies, um die Kernfunktionalität unserer Website
              sicherzustellen. Diese Auswahl wirkt sich nicht auf Ihre Nutzung
              der Website aus, kann jedoch bestimmte Funktionen und
              Personalisierungsoptionen einschränken.
            </p>
            <h2>Weitere Informationen</h2>
            <p>
              Weitere Informationen darüber, wie wir Ihre Daten verwenden und
              wie Sie Ihre Cookie-Einstellungen jederzeit ändern können, finden
              Sie in unserer{" "}
              <a href="/datenschutz" className="hyperlink">
                Datenschutzerklärung
              </a>
              .
            </p>
          </div>
        ) : (
          <p>
            Wir verwenden Cookies und ähnliche Technologien, um Ihr Erlebnis auf
            unserer Website zu verbessern, die Leistung der Seite zu analysieren
            und Ihnen personalisierte Inhalte sowie Werbung anzuzeigen. Sie
            haben die Möglichkeit, auszuwählen, welche Cookies Sie akzeptieren
            möchten. Bitte lesen Sie die Informationen auf unserer{" "}
            <a href="/datenschutz" className="hyperlink">
              Datenschutzerklärung
            </a>{" "}
            sorgfältig durch oder wählen Sie unten „Mehr Infos“, um eine
            informierte Entscheidung zu treffen:
          </p>
        )}
        <div className="btn-wrapper cookie">
          <button onClick={handleAccept} className="cookie-accept">
            Akzeptieren
          </button>
          <button onClick={handleDecline} className="cookie-decline">
            Ablehnen
          </button>
          <button onClick={handleMoreInfo} className="cookie-more-info">
            {moreInfo ? (
              "Schließen"
            ) : (
              <>
                <span>Mehr Infos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
