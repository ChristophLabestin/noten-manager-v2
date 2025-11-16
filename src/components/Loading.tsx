interface LoadingProps {
  progress?: number; // 0..100
  label?: string;    // z.B. "Profil laden …"
}

export default function Loading({ progress, label }: LoadingProps) {
  const hasProgress =
    typeof progress === "number" && !Number.isNaN(progress);
  const clampedProgress = hasProgress
    ? Math.max(0, Math.min(100, progress))
    : 0;
  const isFinished = hasProgress && clampedProgress >= 100;
  const displayLabel =
    label || (hasProgress ? "Lade Daten …" : "Bitte kurz warten …");

  return (
    <div className={`loading-wrapper ${isFinished ? "finished" : ""}`}>
      <div className="loading-backdrop" />
      <div className="loading-card">
        <div className="loading-header">
          <div className="loading-spinner">
            <div className="loading-spinner-inner" />
          </div>
          <div className="loading-text">
            <p className="loading-title">Noten werden synchronisiert</p>
            <p className="loading-subtitle">{displayLabel}</p>
          </div>
        </div>

        {hasProgress && (
          <div className="loading-progress">
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <span className="loading-progress-label">
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
