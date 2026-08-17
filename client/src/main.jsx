import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProcedureProvider } from "./context/ProcedureContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProcedureProvider>
          <App />
        </ProcedureProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
