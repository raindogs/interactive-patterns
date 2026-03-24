import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: rootDir,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: false,
    lib: {
      entry: path.resolve(rootDir, "src/main.js"),
      name: "SentrixLightFluidStudy",
      formats: ["iife"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "styles.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
