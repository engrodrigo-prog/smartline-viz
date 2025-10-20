import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
let reactRouterDir: string | undefined;
try {
  // Resolve the actual installed path for react-router to help Rollup
  reactRouterDir = dirname(require.resolve("react-router/package.json"));
} catch {
  reactRouterDir = undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(reactRouterDir ? { "react-router": reactRouterDir } : {}),
    },
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
}));
