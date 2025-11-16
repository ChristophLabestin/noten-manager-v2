import React from "react";
import BurgerMenu from "../components/BurgerMenu";

const Imprint: React.FC = () => {
  return (
    <>
      <BurgerMenu isSmall={true} title="Impressum" />
      <div style={{ marginTop: "20px" }}>
        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">
            Angaben gemäß § 5 TMG
          </h2>
          <p>
            <strong>Christoph Labestin</strong>
            <br />
            Ödwieser Weg 7
            <br />
            84082 Laberweinting
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Kontakt</h2>
          <p>
            E-Mail:{" "}
            <a
              href="mailto:clabestin@icloud.com"
              className="text-blue-600 underline"
            >
              clabestin@icloud.com
            </a>
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
            auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
            Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen
            oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen.
          </p>
          <p className="mt-2">
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
            Informationen nach den allgemeinen Gesetzen bleiben hiervon
            unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
            Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
            Bei Bekanntwerden entsprechender Rechtsverletzungen werde ich diese
            Inhalte umgehend entfernen.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Haftung für Links</h2>
          <p>
            Die App enthält ggf. Links zu externen Websites Dritter, auf deren
            Inhalte ich keinen Einfluss habe. Deshalb kann ich für diese
            fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
            verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
            der Seiten verantwortlich.
          </p>
          <p className="mt-2">
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist
            jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
            zumutbar. Bei Bekanntwerden von Rechtsverletzungen werde ich
            derartige Links umgehend entfernen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Urheberrecht</h2>
          <p>
            Die durch den Seitenbetreiber erstellten Inhalte und Werke in dieser
            App unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
            Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
            jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser
            App sind nur für den privaten, nicht kommerziellen Gebrauch
            gestattet.
          </p>
        </section>
      </div>
    </>
  );
};

export default Imprint;

