#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const binaryName = process.platform === "win32" ? "loadsmith.exe" : "loadsmith";
const sourcePath = path.join(rootDir, "engine", "bin", binaryName);
const targetDir = path.join(rootDir, "apps", "desktop", "resources", "bin");
const targetPath = path.join(targetDir, binaryName);

if (!fs.existsSync(sourcePath)) {
  console.log("[sync-sidecar] Binário ainda não encontrado; executando build-engine.mjs...");
  execFileSync(process.execPath, [path.join(__dirname, "build-engine.mjs")], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Binário do motor não encontrado em ${sourcePath}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);

if (process.platform !== "win32") {
  fs.chmodSync(targetPath, 0o755);
}

console.log(`[sync-sidecar] Sidecar sincronizado: ${targetPath}`);
