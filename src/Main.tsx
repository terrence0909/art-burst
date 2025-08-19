// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import awsConfig from "./awsConfig";

// Configure Amplify with error handling
try {
  Amplify.configure(awsConfig);
  console.log("AWS Amplify configured successfully");
} catch (error) {
  console.error("Error configuring Amplify:", error);
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);