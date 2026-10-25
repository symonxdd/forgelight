import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { queryClient } from "./api/queryClient";
import { loadRegionalFormat } from "./lib/region";
import "./stores/preferences";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Numbers and dates follow Windows' format from the first paint on.
void loadRegionalFormat().then(() =>
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  ),
);
