import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

(window as any).__BUILD__ = "2026-04-26-2005";
createRoot(document.getElementById("root")!).render(<App />);
