import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { hideSplash } from "./lib/splash";

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash after first paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideSplash();
  });
});
