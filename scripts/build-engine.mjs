#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const engineDir = path.join(rootDir, "engine");
const outDir = path.join(engineDir, "bin");
const binaryName = process.platform === "win32" ? "loadsmith.exe" : "loadsmith";
const outPath = path.join(outDir, binaryName);

function resolveGoBinary() {
  const fromEnv = process.env.GO_BIN?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }

  try {
    execFileSync("go", ["version"], { stdio: "ignore" });
    return "go";
  } catch {
    // Fallback to common Windows installation directories when Go is not in PATH.
  }

  if (process.platform === "win32") {
    const candidates = [
      "E:\\go\\bin\\go.exe",
      "C:\\Program Files\\Go\\bin\\go.exe",
      "C:\\Go\\bin\\go.exe",
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Go", "bin", "go.exe"),
    ];
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error(
    "Compilador Go não encontrado no PATH. Instale o Go 1.24+ ou defina a variável de ambiente GO_BIN."
  );
}

function buildGoSlice(goBin, targetOut, extraEnv = {}) {
  execFileSync(
    goBin,
    ["build", "-trimpath", "-ldflags=-s -w", "-o", targetOut, "./cmd/loadsmith"],
    {
      cwd: engineDir,
      stdio: "inherit",
      env: {
        ...process.env,
        CGO_ENABLED: "0",
        ...extraEnv,
      },
    }
  );
}

fs.mkdirSync(outDir, { recursive: true });
const goBin = resolveGoBinary();

if (process.platform === "darwin") {
  const amd64Out = path.join(outDir, "loadsmith-darwin-amd64");
  const arm64Out = path.join(outDir, "loadsmith-darwin-arm64");
  try {
    console.log("[build-engine] Compilando motor Go Universal macOS (amd64 + arm64)...");
    buildGoSlice(goBin, amd64Out, { GOOS: "darwin", GOARCH: "amd64" });
    buildGoSlice(goBin, arm64Out, { GOOS: "darwin", GOARCH: "arm64" });
    execFileSync("lipo", ["-create", "-output", outPath, amd64Out, arm64Out], {
      stdio: "inherit",
    });
    fs.chmodSync(outPath, 0o755);
    console.log(`[build-engine] Binário Universal macOS criado com sucesso -> ${outPath}`);
  } catch (err) {
    console.warn(
      `[build-engine] Aviso ao gerar binário universal via lipo (${err.message}); compilando nativo...`
    );
    buildGoSlice(goBin, outPath);
    fs.chmodSync(outPath, 0o755);
  } finally {
    fs.rmSync(amd64Out, { force: true });
    fs.rmSync(arm64Out, { force: true });
  }
} else {
  console.log(`[build-engine] Compilando motor Go (${goBin}) -> ${outPath}`);
  buildGoSlice(goBin, outPath);
  if (process.platform !== "win32") {
    fs.chmodSync(outPath, 0o755);
  }
  console.log("[build-engine] Binário compilado com sucesso.");
}
