import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { GoogleAnalyticsTracker } from "./googleAnalytics";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleAnalyticsTracker />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
