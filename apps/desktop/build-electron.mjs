import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, "dist-electron");

fs.rmSync(outDir, { recursive: true, force: true });

await Promise.all([
  build({
    entryPoints: [path.join(__dirname, "electron", "main", "index.ts")],
    outfile: path.join(outDir, "main", "index.js"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron", "sql.js"],
    sourcemap: true,
  }),
  build({
    entryPoints: [path.join(__dirname, "electron", "preload", "index.ts")],
    outfile: path.join(outDir, "preload", "index.js"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
    sourcemap: true,
  }),
]);

console.log("[build-electron] Electron main & preload compilados em dist-electron/");
