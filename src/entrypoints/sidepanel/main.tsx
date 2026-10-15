import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { syncColorModeWithSystem } from "@/theme/color-mode";
import { system } from "@/theme/system";

import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
});

syncColorModeWithSystem();

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ChakraProvider>
  </StrictMode>,
);
