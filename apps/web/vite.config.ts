import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { VitePWA } from "vite-plugin-pwa";

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
          {
            source: "/((?!api/|@vite/|@react-refresh|__vite_ping|src/|node_modules/|assets/|public/|dist/|_next/|\\.well-known/|.*\\.[\\w]+$).*)",
            destination: "/index.html",
          },
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
  const plugins = [
    react(),
    buildSignaturePlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "logo-smartline.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "SmartLine",
        short_name: "SmartLine",
        description: "SmartLine — Operação de campo e gestão (Vegetação: Poda & Roçada).",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b1020",
        theme_color: "#0b1020",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,txt}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/vegetacao"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-vegetacao",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 10 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: mode === "development",
      },
    }),
  ];

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
      sourcemap: true,
      // Reativar minificação para demos mais leves
      minify: hasTerser ? "terser" : "esbuild",
    },
  };
});
