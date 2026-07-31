import React from "react";
import ReactDOM from "react-dom/client";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

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