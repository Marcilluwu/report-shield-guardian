
// ✅ Importar polyfills PRIMERO, antes que cualquier otra cosa
import './polyfills';

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);