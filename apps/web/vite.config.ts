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
export default defineConfig(() => {
  const plugins = [react(), buildSignaturePlugin()];

  return {
    server: {
      host: "::",
      port: 8080,
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
    },
  };
});
