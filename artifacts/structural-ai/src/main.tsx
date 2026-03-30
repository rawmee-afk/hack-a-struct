import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress known library-internal Three.js deprecation warnings
// (THREE.Clock and PCFSoftShadowMap) that cannot be fixed without
// patching @react-three/fiber internals.
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("THREE.Clock") ||
    msg.includes("PCFSoftShadowMap")
  ) return;
  _warn(...args);
};

createRoot(document.getElementById("root")!).render(<App />);
