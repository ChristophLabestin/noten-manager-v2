import React from "react";
import loadingIcon from "../assets/Rolling-1s-200px.svg";

interface LoadingProps {
  progress?: number; // 0..100
  label?: string;    // z.B. "Profil laden …"
}

export default function Loading({ progress = 0, label }: LoadingProps) {
  return (
    <div className="loading-wrapper flex flex-col items-center justify-center min-h-screen text-center">
      {/* Spinner */}
      <img src={loadingIcon} alt="Laden…" className="loading-icon w-24 h-24 mb-4 animate-spin" />

      {/* Fortschrittsbalken */}
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Prozent + Label */}
      <p className="text-sm text-gray-700">
        {label ? label : "Lade Daten …"} ({Math.round(progress)}%)
      </p>
    </div>
  );
}
