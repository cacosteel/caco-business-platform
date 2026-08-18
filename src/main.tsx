import React from "react";
import ReactDOM from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "unibaGreen",
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
          unibaGreen: [
            "#f3f9ef",
            "#e4f1dd",
            "#c9e2bc",
            "#a9d094",
            "#82bc68",
            "#5fae3d",
            "#43852c",
            "#356a24",
            "#2b551e",
            "#213f17",
          ],
        },
      }}
    >
      <Notifications />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4500,
          style: {
            border: "1px solid var(--caco-border)",
            color: "var(--caco-text-strong)",
          },
        }}
      />

      <AuthProvider>
        <App />
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>
);
