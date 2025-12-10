import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";

// Get git hash at build time
// First try environment variable (for Docker builds), then try git command
function getGitHash() {
  // Check for build arg from Docker (but ignore if it's "unknown")
  if (process.env.GIT_HASH && process.env.GIT_HASH !== "unknown") {
    return process.env.GIT_HASH;
  }
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).toString().trim();
  } catch (e) {
    return "unknown";
  }
}

function getGitShortHash() {
  // Check for build arg from Docker (but ignore if it's "unknown")
  if (process.env.GIT_HASH && process.env.GIT_HASH !== "unknown") {
    return process.env.GIT_HASH.substring(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).toString().trim();
  } catch (e) {
    return "unknown";
  }
}

function getAppName() {
  return process.env.APP_NAME || "Family Photos";
}

// Plugin to inject APP_NAME into HTML at build time
function htmlAppNamePlugin(): Plugin {
  return {
    name: "html-app-name",
    transformIndexHtml(html) {
      const appName = getAppName();
      // Escape HTML entities for title and meta tags
      const escapedAppName = appName
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      const metaAppName = appName.replace(/"/g, "&quot;");

      return html
        .replace(/<title>.*?<\/title>/, `<title>${escapedAppName}</title>`)
        .replace(
          /<meta name="apple-mobile-web-app-title" content=".*?"\s*\/?>/,
          `<meta name="apple-mobile-web-app-title" content="${metaAppName}" />`
        );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "import.meta.env.VITE_GIT_HASH": JSON.stringify(getGitShortHash()),
    "import.meta.env.VITE_GIT_HASH_FULL": JSON.stringify(getGitHash()),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
    "import.meta.env.VITE_APP_NAME": JSON.stringify(getAppName()),
  },
  server: {
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 24678,
    },
  },
  plugins: [
    htmlAppNamePlugin(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      // Ensure service worker updates are checked frequently
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: false,
      },
      // Development options
      devOptions: {
        enabled: false, // Set to true if you want PWA in dev mode
        type: "module",
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: getAppName(),
        short_name: getAppName(),
        description: "A digital picture frame for family photos",
        theme_color: "#5f7be9",
        background_color: "#5f7be9",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "image",
                accept: [
                  "image/*",
                  "image/jpeg",
                  "image/jpg",
                  "image/png",
                  "image/gif",
                  "image/webp",
                ],
              },
            ],
          },
        },
      },
    }),
  ],
});
