import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "lck-app",
  brand: {
    displayName: "LCK 순위",
    primaryColor: "#F0C674", // 골드 (1위, 페이커, 강조 컬러)
    icon: "", // 콘솔에서 업로드한 600x600 아이콘 URL을 여기 붙여넣기
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});