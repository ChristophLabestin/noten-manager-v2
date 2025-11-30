import React, { useEffect, useMemo, useState } from "react";

type SectionId =
  | "intro"
  | "steps"
  | "calc"
  | "exams"
  | "pass"
  | "special"
  | "faq"
  | "contact";

type SearchEntry = {
  id: string;
  section: SectionId;
  title: string;
  summary: string;
  keywords: string[];
  icon: string;
};

type Section = {
  id: SectionId;
  title: string;
  subtitle?: string;
  items: { title: string; text: string }[];
};

type FAQItem = { question: string; answer: string };

const SEARCH_INDEX: SearchEntry[] = [
  {
    id: "setup",
    section: "steps",
    title: "Erste Schritte & Setup",
    summary:
      "Schulart und Jahrgang festlegen, Fächer und Prüfungsfächer einrichten, Übersicht anpassen.",
    keywords: [
      "onboarding",
      "schulart",
      "jahrgangsstufe",
      "fächer",
      "prüfungsfächer",
      "sortieren",
      "fos",
      "bos",
    ],
    icon: "🙌",
  },
  {
    id: "grades",
    section: "steps",
    title: "Noten erfassen & verknüpfen",
    summary:
      "Leistungen mit Art/Halbjahr anlegen, mit Prüfungen verknüpfen, Anzeige steuern.",
    keywords: ["noten", "leistungen", "prüfung", "halbjahr", "tabelle"],
    icon: "✏️",
  },
  {
    id: "homework",
    section: "steps",
    title: "Hausaufgaben & Erinnerungen",
    summary:
      "Listen nutzen, Erinnerungszeit ändern, Mitteilungen snoozen oder erledigen.",
    keywords: ["hausaufgaben", "erinnerung", "snooze", "fällig"],
    icon: "🔔",
  },
  {
    id: "calc",
    section: "calc",
    title: "Gewichtungen & Durchschnitte",
    summary:
      "Berechnung von Fach- und Gesamtschnitt, Wahlfächer und Halbjahresfilter.",
    keywords: ["gewichtung", "durchschnitt", "wahlfach", "gesamtschnitt"],
    icon: "ƒ",
  },
  {
    id: "exams",
    section: "exams",
    title: "Prüfungen nach BayFOBOSO",
    summary: "Gewichtungen von schriftlich/mündlich, Schnitt, Schwächenregel.",
    keywords: ["prüfung", "bayfoboso", "schwach", "abschlussnote", "fos", "bos"],
    icon: "🎓",
  },
  {
    id: "seminar",
    section: "exams",
    title: "Seminarfach nach FOBOSO",
    summary: "Aufbau, Termine und Bewertung (2× Seminararbeit) mit App-Support.",
    keywords: ["seminar", "seminararbeit", "0 punkte", "abgabe"],
    icon: "📑",
  },
  {
    id: "pass",
    section: "pass",
    title: "Bestehensregeln & Punkte",
    summary: "Grenzwerte für FOS/BOS 12/13, 0-Punkte-Regel und Abschlussnote.",
    keywords: ["bestehen", "punkte", "zulassung", "abschlussnote", "fos", "bos"],
    icon: "✅",
  },
  {
    id: "offline",
    section: "special",
    title: "Offline, Sync & Schuljahreswechsel",
    summary:
      "Offline-Modus verwenden, Synchronisation verstehen, neues Schuljahr anlegen.",
    keywords: ["offline", "synchronisieren", "schuljahr", "wechsel", "pfingstferien"],
    icon: "📡",
  },
  {
    id: "insights",
    section: "special",
    title: "Insights & Darstellung",
    summary: "Trends lesen, filtern und Animationen steuern.",
    keywords: ["insights", "filter", "halbjahr", "darstellung", "animationen"],
    icon: "📈",
  },
  {
    id: "groups",
    section: "special",
    title: "Gruppen & Teilen",
    summary: "Per Code beitreten, was wird synchronisiert?",
    keywords: ["gruppen", "teilen", "einladen", "hausaufgaben", "prüfungen"],
    icon: "👥",
  },
  {
    id: "faq",
    section: "faq",
    title: "FAQ & schnelle Antworten",
    summary: "Kurzantworten zu Durchschnitt, Offline, Sortierung und Erinnerungen.",
    keywords: ["faq", "offline", "sortieren", "erinnerung"],
    icon: "💡",
  },
  {
    id: "contact",
    section: "contact",
    title: "Support kontaktieren",
    summary: "Ticket mit Betreff, Nachricht und E-Mail senden.",
    keywords: ["kontakt", "support", "ticket", "hilfe", "email"],
    icon: "✉️",
  },
];

const SECTIONS: Section[] = [
  {
    id: "intro",
    title: "Help Center",
    subtitle: "Antworten, Regeln und Support (FOS/BOS)",
    items: [
      {
        title: "Worum geht’s?",
        text: "Verständliche Erklärungen zur Bedienung, Berechnungen und Abschluss-Regeln nach BayFOBOSO.",
      },
      {
        title: "Schwerpunkte",
        text: "FOS/BOS, Berechnung, Workflows, Prüfungen, Offline/Sync und Support.",
      },
    ],
  },
  {
    id: "steps",
    title: "Erste Schritte",
    subtitle: "So nutzt du den Noten Manager",
    items: [
      {
        title: "Schulart, Jahrgang, Fächer",
        text: "Im Onboarding oder unter Einstellungen ▸ Schuljahr Schulart/Jahrgang setzen und Fächer sowie Prüfungsfächer wählen.",
      },
      {
        title: "Noten erfassen",
        text: "In Fach- oder Detailansicht Leistungen mit Art, Halbjahr und optionaler Prüfungsverknüpfung anlegen.",
      },
      {
        title: "Hausaufgaben & Prüfungen",
        text: "Listen über die Toolbar öffnen. Erinnerungen/Uhrzeit unter Einstellungen ▸ Hausaufgaben-Erinnerung anpassen.",
      },
      {
        title: "Darstellung & Sortierung",
        text: "Nach Durchschnitt, Name oder eigener Reihenfolge sortieren. Kompakte Tabellen und Animationen unter Darstellung & Animationen steuern.",
      },
    ],
  },
  {
    id: "calc",
    title: "Berechnungen",
    subtitle: "So werden Noten und Durchschnitte ermittelt",
    items: [
      {
        title: "Fach-Durchschnitt",
        text: "Hauptfach: Schulaufgaben doppelt, Kurzarbeiten/mündlich einfach. Nebenfach: Kurzarbeiten doppelt, mündlich/Extemporale einfach. Wahlfach: erscheint im Detail, zählt nicht in den Gesamtschnitt.",
      },
      {
        title: "Gesamtdurchschnitt",
        text: "Alle Noten eines Fachs gemäß obiger Gewichtung. Fachreferat zählt einfach. Praktikum (FOS 11/12) als eigenes Fach einfach. Halbjahresfilter berücksichtigt nur das gewählte Halbjahr.",
      },
    ],
  },
  {
    id: "exams",
    title: "Abschluss & Prüfungen",
    subtitle: "Berechnung für Abschlussnote und Prüfungen",
    items: [
      {
        title: "Prüfungen nach BayFOBOSO",
        text: "FOS 12: Deutsch, Englisch, Mathe, Profilfach je 3×. BOS 12 sowie FOS/BOS 13: vier Prüfungen je 2×. Schriftlich doppelt so stark wie mündlich. Höchstens zwei Prüfungen unter 4 Punkten; 0 Punkte zählt doppelt (12/13: keine 0 erlaubt, höchstens zwei Prüfungen 1–3 Punkte).",
      },
      {
        title: "Abschlussnote nach BayFOBOSO",
        text: "FOS 12: 25 HJE (inkl. 11. Klasse) + Fachreferat + zwei Praxisnoten. BOS 12: 17 HJE + Fachreferat. FOS/BOS 13: 16 HJE + Seminarfach (doppelt). Max. ein gestrichenes Halbjahr je Fach.",
      },
      {
        title: "Seminarfach (FOBOSO)",
        text: "Bewertung: individuelle Leistung + Präsentation einfach, Seminararbeit doppelt; 0 Punkte in einer Teilleistung ⇒ Seminar 0 Punkte, keine Zulassung. Abgabe 2. Unterrichtswoche, Präsentation danach.",
      },
    ],
  },
  {
    id: "pass",
    title: "Bestehen nach FOBOSO",
    subtitle: "Wesentliche Kriterien",
    items: [
      {
        title: "FOS 12 (Fachabi)",
        text: "25 HJE + 2 Praxis + Fachreferat + 4 Prüfungen (je 3×). Höchstens zwei Prüfungen < 4 (0 Punkte doppelt). Mind. 200 Punkte bei einem schwachen Prüfungsfach, 240 bei zwei; Abschlussnote ≥ 4,0.",
      },
      {
        title: "BOS 12 (Fachabi)",
        text: "17 HJE + Fachreferat + 4 Prüfungen (je 2×). Höchstens zwei Prüfungen < 4 (0 Punkte doppelt). Mind. 130 Punkte bei einem schwachen Prüfungsfach, 156 bei zwei; Abschlussnote ≥ 4,0.",
      },
      {
        title: "FOS/BOS 13 (Abi)",
        text: "16 HJE + Seminarfach (doppelt) + 4 Prüfungen (je 2×). Keine 0-Punkte-Prüfung erlaubt; höchstens zwei Prüfungen 1–3 Punkte. Mind. 130 bzw. 156 Punkte. Mit zweiter Fremdsprache Max 420 Punkte, Schwellen 140/168.",
      },
      {
        title: "In der App",
        text: "Punktesumme, Prüfungsdurchschnitt (≥ 4,0), Fachreferat, Praxisnoten und Seminar (inkl. 0-Punkte-Regel). Zweite Fremdsprache bitte aktuell manuell berücksichtigen.",
      },
    ],
  },
  {
    id: "special",
    title: "Spezielle Funktionen",
    subtitle: "Offline, Ferien-Hinweis, Insights & mehr",
    items: [
      {
        title: "Offline-Modus",
        text: "Bis 3 Tage nach letztem Online-Stand weiterarbeiten. Aktivierung unter Einstellungen ▸ Offline-Modus oder bei fehlender Verbindung; Sync beim nächsten Online-Start.",
      },
      {
        title: "Erinnerungen",
        text: "Standard: 1 Tag vor Fälligkeit zur konfigurierten Uhrzeit (abschaltbar). Eigene Erinnerungen pro Hausaufgabe/Klausur bleiben aktiv; Snooze oder Erledigen direkt aus der Mitteilung.",
      },
      {
        title: "Ferien-Hinweis",
        text: "Karte auf Startseite, wenn in Bayern binnen 7 Tagen Ferien starten. Schaltbar unter Darstellung & Animationen.",
      },
      {
        title: "Schuljahres-Wechsel",
        text: "Ab Pfingstferien (Jg. 12) fragt die App nach dem nächsten Schuljahr. Wechsel/Neuanlage jederzeit unter Einstellungen ▸ Schuljahr.",
      },
      {
        title: "Insights",
        text: "Tab zeigt Trends, Schnittentwicklung, Hotspots. Filter nach Halbjahr oder Fachtypen.",
      },
      {
        title: "Animationen & Darstellung",
        text: "Animationen, Ferien-Hinweis und Design-Thema in Darstellung & Animationen steuern.",
      },
      {
        title: "Gruppen & Teilen",
        text: "Gruppen erstellen oder per Code beitreten. Gruppen-Hausaufgaben/-Termine erscheinen automatisch; Erinnerungen/Erledigt-Status sind pro Nutzer.",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ & Tipps",
    subtitle: "Schnelle Antworten",
    items: [], // rendered separately from FAQ_ITEMS
  },
  {
    id: "contact",
    title: "Kontakt & Support",
    subtitle: "Ticket direkt senden",
    items: [
      {
        title: "Anliegen schildern",
        text: "Betreff, Nachricht und deine E-Mail angeben. Wir melden uns per Mail.",
      },
    ],
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Warum sehe ich keinen Durchschnitt?",
    answer:
      "Stelle sicher, dass Noten erfasst sind und das Fach kein Wahlfach ist. Wahlfächer erscheinen im Fach-Detail, zählen aber nicht in den Gesamtschnitt.",
  },
  {
    question: "Wie nutze ich den Offline-Modus?",
    answer:
      "Warst du in den letzten 3 Tagen online, kannst du mit dem letzten Stand offline weiterarbeiten. Aktivieren unter Einstellungen ▸ Offline-Modus oder über den Hinweis; Änderungen werden beim nächsten Online-Start synchronisiert.",
  },
  {
    question: "Kann ich Halbjahre streichen?",
    answer:
      "Streichen in der Ansicht „Abschlussnote“. Sortierung der Fächer in der Übersicht über „Sortieren“ oder Drag & Drop im eigenen Sortiermodus.",
  },
  {
    question: "Wie ändere ich die Erinnerung für Hausaufgaben?",
    answer:
      "Unter Einstellungen ▸ Hausaufgaben-Erinnerung die Uhrzeit setzen. Es werden nur offene Aufgaben mit Datum erinnert.",
  },
  {
    question: "Wie teile ich Daten mit Mitschülerinnen und Mitschülern?",
    answer:
      "Unter Einstellungen ▸ Gruppen eine Gruppe anlegen oder per Code beitreten. Prüfungen und Hausaufgaben werden in der Gruppe synchronisiert.",
  },
  {
    question: "Was bedeutet der Ferien-Hinweis auf der Startseite?",
    answer:
      "Er zeigt Ferien in Bayern, die innerhalb der nächsten 7 Tage beginnen. Schaltbar unter Darstellung & Animationen.",
  },
];

const QUICK_IDS = new Set(["setup", "calc", "exams", "pass", "faq", "contact"]);
const SUPPORT_ENDPOINT = "/api/support-ticket"; // <- adjust to your backend route

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const splitTokens = (value: string) =>
  normalize(value)
    .split(/[\s,.;:!?/\\-]+/)
    .filter(Boolean);

const HelpCenter: React.FC = () => {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const tokens = useMemo(() => splitTokens(query), [query]);

  const searchResults = useMemo(() => {
    if (!tokens.length) return [];
    const score = (entry: SearchEntry) => {
      const lowerTitle = normalize(entry.title);
      const lowerSummary = normalize(entry.summary);
      const lowerAll = normalize(entry.title + " " + entry.summary + " " + entry.keywords.join(" "));
      let s = 0;
      tokens.forEach((t) => {
        if (lowerTitle.includes(t)) s += 6;
        if (lowerTitle.startsWith(t)) s += 2;
        if (lowerSummary.includes(t)) s += 2;
        if (lowerAll.includes(t)) s += 3;
      });
      return s;
    };
    return SEARCH_INDEX.map((e) => ({ entry: e, score: score(e) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => (a.score === b.score ? a.entry.title.localeCompare(b.entry.title) : b.score - a.score))
      .map((e) => e.entry);
  }, [tokens]);

  const quickSuggestions = useMemo(
    () => SEARCH_INDEX.filter((e) => QUICK_IDS.has(e.id)),
    []
  );

  const scrollTo = (id: SectionId) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const highlight = (text: string) => {
    if (!tokens.length) return text;
    const parts = text.split(new RegExp(`(${tokens.join("|")})`, "gi"));
    return parts.map((part, idx) =>
      tokens.some((t) => normalize(part) === t) ? (
        <mark key={idx}>{part}</mark>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || message.trim().length < 10) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(SUPPORT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          email: email.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
      setSubject("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError("Ticket konnte nicht angelegt werden. Bitte später erneut versuchen.");
      console.error(err);
    }
  };

  useEffect(() => {
    // Prefill email from logged-in user if you can; left empty here.
  }, []);

  return (
    <div className="help-root">
      <style>{styles}</style>
      <div className="hero">
        <div>
          <p className="eyebrow">Support</p>
          <h1>Help Center</h1>
          <p className="lead">
            Antworten, Regeln und Support speziell für FOS/BOS. Berechnung, Workflows,
            Prüfungen, Offline/Sync und mehr.
          </p>
          <div className="badges">
            <span className="badge">FOS / BOS</span>
            <span className="badge">Berechnung</span>
            <span className="badge">Workflows</span>
          </div>
        </div>
        <div className="card search-card" id="search">
          <h2>Schnell finden</h2>
          <p className="sub">Suche nach Themen oder springe direkt zu einem Abschnitt.</p>
          <div className="search-row">
            <span role="img" aria-label="search">
              🔍
            </span>
            <input
              placeholder='z. B. "Prüfungen" oder "Offline"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="ghost" onClick={() => setQuery("")}>
                ×
              </button>
            )}
          </div>
          {!tokens.length && (
            <div className="quick">
              <p className="label">Schnellzugriff</p>
              <div className="chips">
                {quickSuggestions.map((q) => (
                  <button
                    key={q.id}
                    className="chip"
                    onClick={() => {
                      setQuery(q.title);
                      scrollTo(q.section);
                    }}
                  >
                    <span className="icon">{q.icon}</span>
                    <div>
                      <div className="chip-title">{q.title}</div>
                      <div className="chip-sub">{sectionTitle(q.section)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!!tokens.length && (
            <div className="results">
              {searchResults.length === 0 ? (
                <div className="empty">
                  <strong>Keine Treffer gefunden.</strong>
                  <p>Probiere andere Begriffe oder öffne FAQ und Support.</p>
                  <div className="chips">
                    <button className="chip" onClick={() => scrollTo("faq")}>
                      💡 FAQ öffnen
                    </button>
                    <button className="chip primary" onClick={() => scrollTo("contact")}>
                      ✉️ Support
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="label">{searchResults.length} Treffer</p>
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      className="result-row"
                      onClick={() => scrollTo(r.section)}
                    >
                      <div className="icon-bubble">{r.icon}</div>
                      <div className="result-text">
                        <div className="result-title">{highlight(r.title)}</div>
                        <div className="result-summary">{highlight(r.summary)}</div>
                        <span className="pill">{sectionTitle(r.section)}</span>
                      </div>
                      <span className="arrow">↗</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="stack">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="card">
            <div className="card-head">
              <div>
                <p className="eyebrow">{sectionTitle(section.id)}</p>
                <h3>{section.title}</h3>
                {section.subtitle && <p className="sub">{section.subtitle}</p>}
              </div>
            </div>
            {section.id !== "faq" && section.id !== "contact" && (
              <ul className="list">
                {section.items.map((item, idx) => (
                  <li key={idx}>
                    <div className="item-title">{highlight(item.title)}</div>
                    <p className="item-text">{highlight(item.text)}</p>
                  </li>
                ))}
              </ul>
            )}

            {section.id === "faq" && (
              <ul className="faq">
                {FAQ_ITEMS.map((f, idx) => (
                  <li key={idx}>
                    <div className="item-title">{highlight(f.question)}</div>
                    <p className="item-text">{highlight(f.answer)}</p>
                  </li>
                ))}
              </ul>
            )}

            {section.id === "contact" && (
              <form className="form" onSubmit={handleSubmit}>
                <label>
                  Betreff
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="z. B. Frage zur Abschlussnote"
                    required
                    minLength={3}
                  />
                </label>
                <label>
                  Nachricht
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Bitte möglichst konkret beschreiben…"
                    rows={5}
                    required
                    minLength={10}
                  />
                </label>
                <label>
                  E-Mail für Rückmeldung
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-Mail-Adresse"
                  />
                  <small>Falls leer, verwende die Konto-E-Mail.</small>
                </label>

                {error && <p className="error">{error}</p>}
                {status === "success" && (
                  <p className="success">Dein Ticket wurde angelegt. Wir melden uns bei dir.</p>
                )}

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    status === "sending" ||
                    subject.trim().length < 3 ||
                    message.trim().length < 10
                  }
                >
                  {status === "sending" ? "Wird gesendet…" : "Ticket absenden"}
                </button>
              </form>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

const sectionTitle = (id: SectionId): string => {
  switch (id) {
    case "intro":
      return "Einführung";
    case "steps":
      return "Erste Schritte";
    case "calc":
      return "Berechnungen";
    case "exams":
      return "Prüfungen";
    case "pass":
      return "Bestehen";
    case "special":
      return "Spezielle Funktionen";
    case "faq":
      return "FAQ";
    case "contact":
      return "Kontakt & Support";
  }
};

const styles = `
:root {
  --bg: #0b1021;
  --card: rgba(255,255,255,0.06);
  --stroke: rgba(255,255,255,0.08);
  --text: #f8fafc;
  --muted: #cbd5e1;
  --indigo: #818cf8;
  --blue: #38bdf8;
  --green: #4ade80;
  --orange: #fb923c;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: "Inter", system-ui, -apple-system, sans-serif; }
.help-root { max-width: 1080px; margin: 0 auto; padding: 24px 18px 64px; }
.hero { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items: start; }
.card { background: var(--card); border: 1px solid var(--stroke); border-radius: 16px; padding: 18px; backdrop-filter: blur(10px); }
.card + .card { margin-top: 14px; }
.card-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.text-button { color: var(--muted); border: none; background: transparent; cursor: pointer; }
.lead { color: var(--muted); max-width: 640px; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: var(--muted); margin: 0 0 4px; }
.badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.badge { padding: 6px 10px; border-radius: 999px; background: rgba(129,140,248,0.18); color: var(--text); font-size: 13px; }
.search-card input { width: 100%; border: none; outline: none; background: transparent; color: var(--text); }
.search-row { display: flex; gap: 10px; align-items: center; padding: 12px 14px; border: 1px solid var(--stroke); border-radius: 12px; background: rgba(255,255,255,0.04); }
.ghost { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; }
.quick .chips, .results .chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--stroke); background: rgba(255,255,255,0.04); color: var(--text); cursor: pointer; }
.chip.primary { background: var(--indigo); border-color: var(--indigo); color: #0b1021; }
.chip-title { font-weight: 600; }
.chip-sub { color: var(--muted); font-size: 12px; }
.icon { font-size: 18px; }
.label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
.results { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.result-row { border: 1px solid var(--stroke); background: rgba(255,255,255,0.03); border-radius: 12px; padding: 12px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; text-align: left; color: inherit; cursor: pointer; }
.icon-bubble { width: 42px; height: 42px; display: grid; place-items: center; background: rgba(255,255,255,0.06); border-radius: 12px; }
.result-title { font-weight: 600; }
.result-summary { color: var(--muted); font-size: 14px; margin-top: 4px; }
.pill { display: inline-flex; padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,0.08); color: var(--muted); font-size: 12px; margin-top: 6px; }
.arrow { color: var(--indigo); font-size: 18px; }
.empty { border: 1px dashed var(--stroke); border-radius: 12px; padding: 12px; color: var(--muted); }
.stack { display: flex; flex-direction: column; gap: 16px; margin-top: 18px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.item-title { font-weight: 600; margin-bottom: 4px; }
.item-text { margin: 0; color: var(--muted); line-height: 1.5; }
.faq { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.form { display: grid; gap: 12px; }
.form input, .form textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--stroke); background: rgba(255,255,255,0.05); color: var(--text); }
.form label { display: grid; gap: 6px; font-weight: 600; color: var(--text); }
.form small { color: var(--muted); }
.primary-btn { padding: 12px 16px; border: none; border-radius: 12px; background: linear-gradient(120deg, var(--indigo), var(--blue)); color: #0b1021; font-weight: 700; cursor: pointer; }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #f87171; }
.success { color: #4ade80; }
.mark { background: #facc15; color: #0b1021; }
@media (max-width: 640px) {
  .card-head { flex-direction: column; align-items: flex-start; }
  .hero { grid-template-columns: 1fr; }
}
`;

export default HelpCenter;