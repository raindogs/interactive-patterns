import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(rootDir, "dist");
const targetAssetsDir = path.join(rootDir, "assets");

cpSync(path.join(distDir, "main.js"), path.join(rootDir, "main.js"));
cpSync(path.join(distDir, "styles.css"), path.join(rootDir, "styles.css"));

if (existsSync(targetAssetsDir)) {
  rmSync(targetAssetsDir, { recursive: true, force: true });
}

if (existsSync(path.join(distDir, "assets"))) {
  cpSync(path.join(distDir, "assets"), targetAssetsDir, { recursive: true });
}
