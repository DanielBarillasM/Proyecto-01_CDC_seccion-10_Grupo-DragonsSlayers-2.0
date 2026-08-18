import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",

  plugins: [react()],

  resolve: {
    alias: {
      assert: "assert/",
      util: "util/"
    }
  },

  server: {
    port: 3000,
    host: "0.0.0.0"
  },

  preview: {
    port: 3000,
    host: "0.0.0.0"
  }
});