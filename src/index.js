import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { auth } from "./firebase";
import { setPersistence, browserLocalPersistence } from "firebase/auth";

async function init() {
  await setPersistence(auth, browserLocalPersistence);
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<React.StrictMode><App /></React.StrictMode>);
}

init().catch((error) => {
  console.error("Failed to initialize auth persistence:", error);
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<React.StrictMode><App /></React.StrictMode>);
});
