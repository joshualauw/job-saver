import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    body: { fontSize: "sm" },
  },
});

export const system = createSystem(defaultConfig, config);
