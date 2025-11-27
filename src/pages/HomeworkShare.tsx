import "../styles/share-page.scss";
import { useEffect, useMemo } from "react";

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
  const subject =
    data?.subject && data.subject.length > 0 ? data.subject : "Kein Fach";
  const formattedDueDate = formatDate(data?.dueDate);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const ensureMetaTag = (key: "name" | "property", value: string) => {
      let meta = document.querySelector(
        `meta[${key}="${value}"]`
      ) as HTMLMetaElement | null;
      const existed = !!meta;

      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(key, value);
        document.head.appendChild(meta);
      }

      return { meta, existed };
    };

    const descriptionTag = ensureMetaTag("name", "description");
    const ogTitleTag = ensureMetaTag("property", "og:title");
    const ogDescriptionTag = ensureMetaTag("property", "og:description");

    const originalValues = {
      title: document.title,
      description: descriptionTag.meta.content,
      ogTitle: ogTitleTag.meta.content,
      ogDescription: ogDescriptionTag.meta.content,
    };

    const metaTitle = data
      ? `${data.title} | Geteilte Hausaufgabe`
      : "Geteilte Hausaufgabe | Noten Manager";
    const metaDescription = data
      ? `${subject} · Fällig: ${formattedDueDate}`
      : "Die Hausaufgaben-Details konnten nicht geladen werden.";

    const setMeta = (
      target: { meta: HTMLMetaElement; existed: boolean },
      content: string
    ) => {
      target.meta.content = content;
    };

    document.title = metaTitle;
    setMeta(descriptionTag, metaDescription);
    setMeta(ogTitleTag, metaTitle);
    setMeta(ogDescriptionTag, metaDescription);

    return () => {
      document.title = originalValues.title;

      const restoreMeta = (
        target: { meta: HTMLMetaElement; existed: boolean },
        content: string
      ) => {
        if (target.existed) {
          target.meta.content = content;
        } else {
          target.meta.remove();
        }
      };

      restoreMeta(descriptionTag, originalValues.description);
      restoreMeta(ogTitleTag, originalValues.ogTitle);
      restoreMeta(ogDescriptionTag, originalValues.ogDescription);
    };
  }, [data, formattedDueDate, subject]);

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
          <span className="value">{formattedDueDate}</span>
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
