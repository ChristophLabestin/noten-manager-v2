// import loadingIcon from "../assets/Rolling-1s-200px.svg"

interface LoadingProps {
  progress?: number; // 0..100
  label?: string;    // z.B. "Profil laden …"
}

export default function Loading({ progress = 0, label }: LoadingProps) {
  return (
    <div className={`loading-wrapper ${progress < 100 ? '' : 'finished'}`}>
      {/* Spinner */}
      {/* <img src={loadingIcon} alt="Laden…" className="loading-icon" /> */}
      <div className="loading-progress-bar">
        <div className="loading-progress-handle" style={{width:`${progress}%`}}></div>
      </div>

      {/* Fortschrittsbalken */}
      <div className="">
        <div
          className=""
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Prozent + Label */}
      <p className="">
        {label ? label : "Lade Daten …"} ({Math.round(progress)}%)
      </p>
    </div>
  );
}