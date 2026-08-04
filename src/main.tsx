import React from "react";
import ReactDOM from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "red",
        fontFamily: '"Inter", "Segoe UI", Roboto, Arial, sans-serif',
        lineHeights: { md: "1.5" },
        fontSizes: {
          xs: "10px",
          sm: "12px",
          md: "14px",
          lg: "16px",
          xl: "18px",
        },
        colors: {
          red: [
            "#FFF1F1",
            "#FFE0E0",
            "#FFC9C9",
            "#F9A8A8",
            "#F08080",
            "#C62828",
            "#B71C1C",
            "#9F1818",
            "#861313",
            "#6D0F0F",
          ],
        },
      }}
    >
      <Notifications />

      <AuthProvider>
        <App />
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>
);
