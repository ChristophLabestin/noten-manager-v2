import * as Sentry from '@sentry/react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/App.scss";
import "./styles/font.scss";

Sentry.init({
  dsn: "https://4e9ab41bae65c230e341d0befcf202b9@o4510127997583360.ingest.de.sentry.io/4510128000991312",
  sendDefaultPii: true
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
