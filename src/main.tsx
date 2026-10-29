import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { activeFestival } from "./festivals";
import "./styles/global.css";

// Apply this edition's colours as CSS variables, so a new festival can re-theme the interface.
for (const [k, v] of Object.entries(activeFestival.config.theme)) document.documentElement.style.setProperty(k, v);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
