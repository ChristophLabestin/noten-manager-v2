import "../styles/share-page.css";
import { useMemo } from "react";

type ParsedHomeworkLink = {
  title: string;
  subject?: string;
  dueDate?: Date;
};

const formatDate = (date?: Date) => {
  if (!date) return "Kein Fälligkeitsdatum";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "full" }).format(date);
};

const parseLink = (): ParsedHomeworkLink | null => {
  const params = new URLSearchParams(window.location.search);
  const rawTitle = params.get("title")?.trim();
  if (!rawTitle) return null;

  const subject = params.get("subject")?.trim() || undefined;
  const rawDue = params.get("due")?.trim();
  let dueDate: Date | undefined;
  if (rawDue) {
    const parsed = new Date(rawDue);
    if (!isNaN(parsed.getTime())) {
      dueDate = parsed;
    }
  }

  return { title: rawTitle, subject, dueDate };
};

const HomeworkSharePage = () => {
  const data = useMemo(parseLink, []);

  if (!data) {
    return (
      <div className="share-page">
        <div className="share-card">
          <h1>Link ungültig</h1>
          <p>Die Hausaufgaben-Details konnten nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  const subject = data.subject && data.subject.length > 0 ? data.subject : "Kein Fach";

  return (
    <div className="share-page">
      <div className="share-card">
        <div className="pill">Geteilte Hausaufgabe</div>
        <h1>{data.title}</h1>
        <div className="meta">
          <span className="label">Fach</span>
          <span className="value">{subject}</span>
        </div>
        <div className="meta">
          <span className="label">Fälligkeit</span>
          <span className="value">{formatDate(data.dueDate)}</span>
        </div>

        <div className="cta">
          <a className="btn-primary" href="https://noten-manager-v2.web.app">
            Noten Manager öffnen
          </a>
          <p className="hint">
            Wenn du die App installiert hast, öffnet der Link die Aufgabe direkt in der App.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeworkSharePage;
