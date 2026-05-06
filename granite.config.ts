import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "lck-app",
  brand: {
    displayName: "LCK 순위",
    primaryColor: "#F0C674",
    icon: "https://static.toss.im/appsintoss/24163/515aca25-30fb-48b7-bc95-0e21c9ca5584.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
    webViewProps: {
      navigationBar: {
        withBackButton: false,
      },
    },
  },
  permissions: [],
  outdir: "dist",
});