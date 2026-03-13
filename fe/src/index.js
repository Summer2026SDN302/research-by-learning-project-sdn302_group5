import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";

// Clear any stale auth data left over from a DB reset
localStorage.removeItem('accessToken');
localStorage.removeItem('user');

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
