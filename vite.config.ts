import { defineConfig } from "vite";

// biome-ignore lint/style/noDefaultExport: Vite requires a default configuration export.
export default defineConfig({
  server: {
    watch: {
      ignored: ["**/.tools/**", "**/android/**", "**/releases/**", "**/reports/**"],
    },
  },
});
