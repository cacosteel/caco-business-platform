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
        primaryColor: "cacoBlue",
        primaryShade: 5,
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
          cacoBlue: [
            "#F1FBFD",
            "#DFF5F9",
            "#C3EAF2",
            "#98DCE9",
            "#68CADC",
            "#36B6CF",
            "#2B9FB8",
            "#26879D",
            "#256E7F",
            "#235B68",
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
