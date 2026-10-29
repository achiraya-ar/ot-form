import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/sarabun/400.css";
import "@fontsource/sarabun/500.css";
import "@fontsource/sarabun/600.css";
import "@fontsource/sarabun/700.css";
import "./styles.css";
import App from "./App";
import { AppProvider } from "./lib/store";
import { ToastProvider } from "./components/ui";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppProvider>
  </React.StrictMode>,
);
