import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "node:module";
import { dirname } from "node:path";

function buildSignaturePlugin() {
  return {
    name: "build-signature",
    generateBundle() {
      const stamp = `${process.env.VITE_BUILD_SIGNATURE || "SmartLine™ Build"} • ${new Date().toISOString()}`;
      this.emitFile({
        type: "asset",
        fileName: "build-signature.txt",
        source: stamp,
      });

      // Emit a minimal vercel.json so deploying the built dist works as SPA
      const vercelConfig = {
        version: 2,
        rewrites: [
          { source: "/(.*)", destination: "/index.html" },
        ],
        headers: [
          {
            source: "/logo-smartline.png",
            headers: [
              { key: "Cache-Control", value: "public,max-age=31536000,immutable" },
            ],
          },
          {
            source: "/smartline-og.png",
            headers: [
              { key: "Cache-Control", value: "public,max-age=604800" },
            ],
          },
        ],
      };
      this.emitFile({
        type: "asset",
        fileName: "vercel.json",
        source: JSON.stringify(vercelConfig, null, 2),
      });
    },
    transformIndexHtml(html: string) {
      const stamp = `${process.env.VITE_BUILD_SIGNATURE || "SmartLine™ Build"}`;
      return html.replace("</head>", `<meta name="build-signature" content="${stamp}">\n</head>`);
    },
  };
}

const require = createRequire(import.meta.url);
let reactRouterDir: string | undefined;
try {
  // Resolve the actual installed path for react-router to help Rollup
  reactRouterDir = dirname(require.resolve("react-router/package.json"));
} catch {
  reactRouterDir = undefined;
}

const hasTerser = (() => {
  try {
    require.resolve("terser");
    return true;
  } catch {
    return false;
  }
})();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react(), buildSignaturePlugin()];

  return {
    server: {
      host: "::",
      // Use Vite default dev port to avoid clashing with API
      port: 5173,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        ...(reactRouterDir ? { "react-router": reactRouterDir } : {}),
      },
      dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
    },
    build: {
      minify: hasTerser ? "terser" : "esbuild",
      sourcemap: mode === "development",
    },
  };
});
