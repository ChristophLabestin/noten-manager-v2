import React from "react";
import BurgerMenu from "../components/BurgerMenu";

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <BurgerMenu isSmall={true} title="Datenschutz" />
      <div style={{ marginTop: "20px" }}>
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">
            Allgemeine Hinweise
          </h2>
          <p>
            Diese Datenschutzerklärung informiert dich darüber, welche
            personenbezogenen Daten bei der Nutzung der Web-App{" "}
            <strong>Noten Manager</strong> (einschließlich der Nutzung als
            Progressive Web App / PWA) verarbeitet werden.
          </p>
        </section>

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
          <h2 className="text-2xl font-semibold mb-2">
            Art der Anwendung und Hosting (Firebase)
          </h2>
          <p>
            Der Noten Manager ist eine Online-Anwendung zur Verwaltung von
            Schulnoten. Die App kann im Browser und als PWA auf deinem Gerät
            genutzt werden.
          </p>
          <p className="mt-2">
            Die Anwendung wird über den Dienst{" "}
            <strong>Google Firebase</strong> betrieben. Anbieter ist die Google
            Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
          </p>
          <p>
            Beim Aufruf der App werden technisch notwendige Daten (z. B.
            IP-Adresse, Zeitpunkt der Anfrage, Browsertyp, Betriebssystem,
            abgerufene Ressourcen) auf Servern von Google verarbeitet, um die
            Inhalte auszuliefern und die Sicherheit der Systeme zu gewährleisten.
          </p>
          <p className="mt-2">
            Wir haben mit Google einen Vertrag zur Auftragsverarbeitung
            abgeschlossen. Eine Verarbeitung kann auch auf Servern in Drittländern
            (insbesondere den USA) stattfinden. Dabei werden nach Angaben von
            Google geeignete Garantien wie die EU-Standardvertragsklauseln
            eingesetzt.
          </p>
          <p className="mt-2">
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
            Welche Daten werden verarbeitet?
          </h2>
          <p>
            Wir verarbeiten personenbezogene Daten nur, soweit dies zur
            Bereitstellung und Nutzung des Noten Managers erforderlich ist.
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">
            Registrierungs- und Kontodaten
          </h3>
          <ul className="list-disc list-inside">
            <li>
              <strong>Name / Anzeigename</strong>
            </li>
            <li>
              <strong>E-Mail-Adresse</strong>
            </li>
            <li>
              <strong>Firebase-Nutzer-ID</strong> (technische Kennung)
            </li>
            <li>
              <strong>Verschlüsselungs-Salt</strong> für deine Noten-Daten
            </li>
          </ul>
          <p className="mt-2">
            Die Registrierung und Anmeldung erfolgt über{" "}
            <strong>Firebase Authentication</strong>. Optional kannst du dich mit
            deinem Google-Konto anmelden. In diesem Fall erhält Google
            Informationen darüber, dass du den Noten Manager nutzt.
          </p>
          <p className="mt-2">
            <strong>Zweck:</strong> Verwaltung deines Nutzerkontos und
            Bereitstellung der Funktionen des Noten Managers.
            <br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung).
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">
            Noten- und Fachdaten
          </h3>
          <p>
            Zur Erfüllung des Zwecks der App werden von dir eingegebene
            Inhalte gespeichert, z. B.:
          </p>
          <ul className="list-disc list-inside">
            <li>Fächer und Fächer-Typen</li>
            <li>Einzelne Noten (inkl. Gewichtung, Halbjahr)</li>
            <li>Abschluss- und Durchschnittsberechnungen</li>
          </ul>
          <p className="mt-2">
            Diese Daten werden in <strong>Google Firestore</strong> gespeichert.
            Vor der Speicherung werden sie mit einem aus deiner Nutzerkennung
            und einem individuellen Salt abgeleiteten Schlüssel
            (AES-GCM-Verschlüsselung) verschlüsselt. Dadurch sind die Noten in
            der Datenbank nicht im Klartext gespeichert.
          </p>
          <p className="mt-2">
            <strong>Zweck:</strong> Bereitstellung der Notenverwaltungs-Funktionen
            (Speichern, Berechnen, Anzeigen deiner Noten).
            <br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung).
          </p>

          <h3 className="text-xl font-semibold mt-4 mb-2">
            App-Einstellungen und Nutzungsdaten
          </h3>
          <p>
            Wir speichern außerdem einige Einstellungen, z. B.:
          </p>
          <ul className="list-disc list-inside">
            <li>gewähltes Farbschema (Theme)</li>
            <li>Dark-Mode-Einstellung</li>
            <li>kompakte Tabellenansicht</li>
            <li>Sortier-Einstellungen für Fächer</li>
          </ul>
          <p className="mt-2">
            Diese Daten werden deinem Nutzerprofil zugeordnet, um dir eine
            konsistente Darstellung über verschiedene Geräte hinweg zu
            ermöglichen.
          </p>
          <p className="mt-2">
            <strong>Zweck:</strong> Verbesserung der Nutzerfreundlichkeit und
            Bedienbarkeit der App.
            <br />
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse an einer nutzerfreundlichen Gestaltung).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">
            Cookies, lokale Speicherung und PWA
          </h2>
          <p>
            Der Noten Manager verwendet technisch notwendige Cookies und
            lokale Speichermöglichkeiten deines Browsers (z. B. Local Storage),
            um Einstellungen, Session-Informationen und PWA-Funktionen
            bereitzustellen.
          </p>
          <p className="mt-2">
            Darüber hinaus wird ein Service Worker eingesetzt, der statische
            Ressourcen und Seiten im Cache deines Browsers speichert, damit du
            die App auch mit eingeschränkter Internetverbindung nutzen kannst.
            Du kannst diese gespeicherten Daten jederzeit über die Einstellungen
            deines Browsers löschen.
          </p>
          <p className="mt-2">
            Derzeit werden keine Marketing- oder Tracking-Cookies eingesetzt.
            Sollte sich dies ändern, werden wir dich gesondert informieren und
            ggf. deine Einwilligung einholen.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">
            Fehlererfassung mit Sentry
          </h2>
          <p>
            Wir nutzen <strong>Sentry</strong> (Functional Software Inc., San
            Francisco, USA) zur Fehleranalyse und Überwachung der Stabilität der
            App. Im Fehlerfall können dabei insbesondere folgende Daten
            verarbeitet werden:
          </p>
          <ul className="list-disc list-inside">
            <li>verwendetes Endgerät</li>
            <li>Browsertyp und -version</li>
            <li>Betriebssystem</li>
            <li>Zeitpunkt und Art des Fehlers</li>
            <li>Referrer-URL</li>
            <li>ggf. IP-Adresse und weitere technische Metadaten</li>
          </ul>
          <p className="mt-2">
            Die Daten werden ausschließlich zur Erkennung, Analyse und
            Behebung von Fehlern sowie zur Sicherstellung der Stabilität und
            Sicherheit der App genutzt.
          </p>
          <p className="mt-2">
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse an einer sicheren und stabilen App).
          </p>
          <p className="mt-2">
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
          <h2 className="text-2xl font-semibold mb-2">
            Weitergabe an Dritte und Drittlandtransfer
          </h2>
          <p>
            Eine Weitergabe deiner Daten an Dritte erfolgt grundsätzlich nur,
            wenn dies zur Bereitstellung der App erforderlich ist, eine
            gesetzliche Verpflichtung besteht oder du eingewilligt hast.
          </p>
          <p className="mt-2">
            Dienstleister, die wir einsetzen (z. B. Google Firebase, Sentry),
            handeln auf Grundlage von Auftragsverarbeitungsverträgen und sind
            vertraglich verpflichtet, deine Daten nur nach unseren Weisungen und
            gemäß den geltenden Datenschutzvorschriften zu verarbeiten.
          </p>
          <p className="mt-2">
            Eine Übermittlung in Drittländer (insbesondere die USA) kann nicht
            ausgeschlossen werden. In diesen Fällen stützen wir die
            Datenübermittlung auf geeignete Garantien wie die
            EU-Standardvertragsklauseln.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Speicherdauer</h2>
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie dies für
            die jeweiligen Zwecke erforderlich ist oder gesetzliche
            Aufbewahrungspflichten bestehen.
          </p>
          <p className="mt-2">
            Deine Kontodaten und Noten-Daten werden grundsätzlich für die Dauer
            der Nutzung deines Kontos gespeichert. Wenn du eine Löschung deines
            Kontos wünschst, kannst du dich jederzeit über die oben genannten
            Kontaktdaten an uns wenden. Wir löschen dann dein Profil und die
            zugehörigen Daten, soweit keine gesetzlichen Aufbewahrungspflichten
            entgegenstehen.
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
            uns. Du kannst dich hierzu jederzeit per E-Mail an{" "}
            <a
              href="mailto:clabestin@icloud.com"
              className="text-blue-600 underline"
            >
              clabestin@icloud.com
            </a>{" "}
            wenden.
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
            anzupassen, insbesondere wenn wir neue Funktionen oder Dienste
            einführen oder sich die rechtlichen Rahmenbedingungen ändern.
            Die jeweils aktuelle Fassung ist jederzeit in der App unter
            &quot;Datenschutz&quot; einsehbar.
          </p>
        </section>
      </div>
    </>
  );
};

export default PrivacyPolicy;
