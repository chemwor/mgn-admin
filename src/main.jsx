import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import App from "./App";
import "./index.css";

Sentry.init({
  dsn: "https://6f53651db1573768328ad79a9fa09082@o4511095377494016.ingest.us.sentry.io/4511095389552640",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
});

posthog.init("phx_DvptD7c4F57pWF8pYfc8xzCWAZCQYNOYXABKLhpGMm0a8oB", {
  api_host: "https://us.i.posthog.com",
  capture_pageview: false,
  capture_pageleave: true,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
