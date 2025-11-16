import React from "react";
import BurgerMenu from "../components/BurgerMenu";

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <BurgerMenu isSmall={true}
        title="Datenschutz"
      />
      <div style={{marginTop: "20px"}}>
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Verantwortlicher</h2>
          <p>
            Verantwortlich für die Verarbeitung personenbezogener Daten auf
            dieser Website ist:
          </p>
          <p className="mt-2">
            <strong>Christoph Labestin</strong>
            <br />
            Ödwieser Weg 7, 84082 Laberweinting
            <br />
            clabestin@icloud.com
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Hosting über Firebase</h2>
          <p>
            Unsere Website wird über den Dienst <strong>Google Firebase</strong>{" "}
            gehostet. Anbieter ist die Google Ireland Limited, Gordon House,
            Barrow Street, Dublin 4, Irland.
          </p>
          <p>
            Firebase speichert Daten auf Servern innerhalb der EU sowie in den
            USA. Wir haben mit Google einen Vertrag zur Auftragsverarbeitung
            abgeschlossen.
          </p>
          <p>
            Mehr Informationen:{" "}
            <a
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              https://firebase.google.com/support/privacy
            </a>
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">
            Datenerhebung und -verwendung
          </h2>
          <p>
            Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies
            zur Bereitstellung einer funktionsfähigen Website sowie unserer
            Inhalte und Leistungen erforderlich ist.
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">
            Personenbezogene Daten
          </h3>
          <ul className="list-disc list-inside">
            <li>
              <strong>Name und E-Mail-Adresse:</strong> Diese Daten werden bei
              Registrierung / Nutzung unseres Angebots erhoben und in{" "}
              <strong>Google Firestore</strong> gespeichert.
            </li>
            <li>
              <strong>Zweck:</strong> Nutzerverwaltung, Kommunikation und
              Nutzung unserer Dienste.
            </li>
            <li>
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung).
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-4 mb-2">
            Protokolldaten (Logging mit Sentry)
          </h3>
          <p>
            Wir nutzen <strong>Sentry</strong> (Functional Software Inc., San
            Francisco, USA) zur Fehleranalyse und -überwachung. Dabei können
            folgende Daten verarbeitet werden:
          </p>
          <ul className="list-disc list-inside">
            <li>verwendetes Endgerät</li>
            <li>Browsertyp und -version</li>
            <li>Betriebssystem</li>
            <li>Zeitpunkt des Fehlers</li>
            <li>ggf. IP-Adresse (gekürzt oder anonymisiert)</li>
          </ul>
          <p>
            Die Daten werden ausschließlich zur Fehlerbehebung genutzt.
            <br />
            Weitere Informationen:{" "}
            <a
              href="https://sentry.io/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              https://sentry.io/privacy/
            </a>
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Weitergabe an Dritte</h2>
          <p>
            Eine Weitergabe deiner Daten an Dritte erfolgt nur, wenn dies für
            die Vertragserfüllung notwendig ist oder eine gesetzliche
            Verpflichtung besteht.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Speicherdauer</h2>
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie es für
            die genannten Zwecke erforderlich ist oder gesetzliche
            Aufbewahrungspflichten bestehen.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Deine Rechte</h2>
          <ul className="list-disc list-inside">
            <li>
              Auskunft über die bei uns gespeicherten Daten (Art. 15 DSGVO)
            </li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch (Art. 21 DSGVO)</li>
          </ul>
          <p className="mt-2">
            Zur Wahrnehmung deiner Rechte genügt eine formlose Mitteilung an
            uns.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Sicherheit</h2>
          <p>
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein,
            um deine Daten vor Verlust, Missbrauch und unbefugtem Zugriff zu
            schützen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Änderungen dieser Datenschutzerklärung
          </h2>
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf
            anzupassen, um sie stets aktuell zu halten.
          </p>
        </section>
      </div>
    </>
  );
};

export default PrivacyPolicy;
