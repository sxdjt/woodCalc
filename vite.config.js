import { defineConfig } from "vite";

// NOTE: port 1420 is the default Tauri dev server port - must match devUrl in tauri.conf.json
const TAURI_DEV_PORT = 1420;

export default defineConfig({
  server: {
    port: TAURI_DEV_PORT,
    strictPort: true,
    watch: {
      // Tell Vite to watch the Tauri source too for hot reload triggers
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // Tauri targets modern Chromium/WebKit; no need for broad transpilation
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
