import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind to localhost ONLY — the dev server is no longer exposed to the
    // public internet (no sudo/firewall needed). View the app via nginx at
    // https://myeduport.ai; for live HMR dev use an SSH tunnel:
    //   ssh -L 5173:localhost:5173 dev@5.223.72.232  →  http://localhost:5173
    host: "127.0.0.1",
    hmr: {
      // Disable the error overlay: internet scanners probe this public dev
      // server for secret files (e.g. /etc/passwd, Foundry run-latest.json),
      // and Vite's rejections were popping up as scary red overlays.
      overlay: false
    },
    fs: {
      strict: true // never serve files outside the project root
    },
    watch: {
      usePolling: false,
      interval: 100
    }
  }
});
