import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss(),],
  test: {
    environment: "jsdom",
    exclude: ["node_modules", ".next"],
  },
});
