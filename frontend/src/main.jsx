import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

// Set theme from localStorage before React renders
const savedTheme = localStorage.getItem("chat-theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
