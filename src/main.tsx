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
        primaryColor: "orange",
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
          orange: [
            "#FFF4EB",
            "#FFE4CC",
            "#FFD3AD",
            "#FFC18C",
            "#FFAF6B",
            "#F58220",
            "#E5761C",
            "#C96418",
            "#A95314",
            "#8A430F",
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
