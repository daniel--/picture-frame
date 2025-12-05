import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { registerServiceWorker } from "./registerServiceWorker";

// Register service worker for PWA functionality
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
