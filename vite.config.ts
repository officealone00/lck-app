import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import aitDevtools from "@apps-in-toss/devtools/unplugin";

// devtools(가짜 SDK)는 개발 모드에서만 켜요. 출시 빌드에는 들어가지 않아요.
export default defineConfig(({ mode }) => ({
  plugins: [mode === "development" && aitDevtools.vite(), react()].filter(Boolean),
}));
