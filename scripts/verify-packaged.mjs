import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const releaseRoot = path.join(repoRoot, "apps", "desktop", "release");

function resolveUnpackedSource() {
  if (process.platform === "win32") {
    const dir = path.join(releaseRoot, "win-unpacked");
    return {
      sourceDir: dir,
      getPaths: (isolatedAppDir) => ({
        desktopBinary: path.join(isolatedAppDir, "LoadSmith.exe"),
        resourcesDir: path.join(isolatedAppDir, "resources"),
        sidecarName: "loadsmith.exe",
      }),
    };
  }

  if (process.platform === "darwin") {
    const candidates = [
      path.join(releaseRoot, "mac-arm64"),
      path.join(releaseRoot, "mac"),
      path.join(releaseRoot, "mac-universal"),
    ];
    const dir = candidates.find((d) => fs.existsSync(path.join(d, "LoadSmith.app"))) || candidates[0];
    return {
      sourceDir: dir,
      getPaths: (isolatedAppDir) => ({
        desktopBinary: path.join(isolatedAppDir, "LoadSmith.app", "Contents", "MacOS", "LoadSmith"),
        resourcesDir: path.join(isolatedAppDir, "LoadSmith.app", "Contents", "Resources"),
        sidecarName: "loadsmith",
      }),
    };
  }

  const dir = path.join(releaseRoot, "linux-unpacked");
  return {
    sourceDir: dir,
    getPaths: (isolatedAppDir) => ({
      desktopBinary: fs.existsSync(path.join(isolatedAppDir, "loadsmith"))
        ? path.join(isolatedAppDir, "loadsmith")
        : path.join(isolatedAppDir, "@loadsmithdesktop"),
      resourcesDir: path.join(isolatedAppDir, "resources"),
      sidecarName: "loadsmith",
    }),
  };
}

function logStep(label) {
  console.log(`[verify-packaged] OK: ${label}`);
}

function assertFileExists(filePath, label) {
  assert.ok(fs.existsSync(filePath), `Arquivo ausente no pacote: ${label} (${filePath})`);
  assert.ok(fs.statSync(filePath).isFile(), `Esperado arquivo válido em ${label}`);
}

function parseNdjsonEvents(stdoutText) {
  const lines = stdoutText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  assert.ok(lines.length > 0, "Nenhuma linha NDJSON emitida pelo binário empacotado.");
  return lines.map((line) => JSON.parse(line));
}

function runBinaryAsync(binaryPath, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

async function startTempApiServer() {
  const receivedRequests = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const auth = req.headers.authorization || "";
      if (auth !== "Bearer clean-room-secret") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }

      const rawBody = Buffer.concat(chunks).toString("utf8");
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
        return;
      }

      receivedRequests.push(parsedBody);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, received: parsedBody }));
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  assert.ok(addr && typeof addr === "object", "Não foi possível obter porta do servidor local.");

  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    receivedRequests,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function main() {
  const target = resolveUnpackedSource();
  assert.ok(
    fs.existsSync(target.sourceDir),
    `Diretório empacotado não encontrado: ${target.sourceDir}. Execute o empacotamento antes.`
  );

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-clean-verify-"));
  const isolatedAppDir = path.join(tempRoot, "app");
  const isolatedWorkspaceDir = path.join(tempRoot, "workspace");
  let server = null;

  try {
    fs.cpSync(target.sourceDir, isolatedAppDir, { recursive: true, verbatimSymlinks: true });
    logStep(`Pacote copiado para diretório limpo fora do monorepo (${isolatedAppDir})`);

    const { desktopBinary, resourcesDir, sidecarName } = target.getPaths(isolatedAppDir);
    const sidecarPath = path.join(resourcesDir, "bin", sidecarName);
    const resourcesWasmPath = path.join(resourcesDir, "sql-wasm.wasm");
    const unpackedWasmPath = path.join(
      resourcesDir,
      "app.asar.unpacked",
      "node_modules",
      "sql.js",
      "dist",
      "sql-wasm.wasm"
    );

    assertFileExists(desktopBinary, "executável desktop");
    assertFileExists(path.join(resourcesDir, "app.asar"), "app.asar");
    assertFileExists(sidecarPath, "binário sidecar Go");
    assertFileExists(path.join(resourcesDir, "icon.ico"), "ícone .ico");
    assertFileExists(path.join(resourcesDir, "icon.png"), "ícone .png");
    assertFileExists(resourcesWasmPath, "resources/sql-wasm.wasm");
    assertFileExists(unpackedWasmPath, "app.asar.unpacked sql-wasm.wasm");

    if (process.platform !== "win32") {
      fs.chmodSync(sidecarPath, 0o755);
    }

    const wasmHeader = fs.readFileSync(resourcesWasmPath).subarray(0, 4);
    assert.deepEqual(
      Array.from(wasmHeader),
      [0x00, 0x61, 0x73, 0x6d],
      "sql-wasm.wasm empacotado não possui cabeçalho WebAssembly válido."
    );
    logStep("Todos os recursos críticos (ASAR, sidecar, ícones e WASM válido) verificados");

    server = await startTempApiServer();
    fs.mkdirSync(isolatedWorkspaceDir, { recursive: true });

    fs.writeFileSync(
      path.join(isolatedWorkspaceDir, ".env"),
      "API_SECRET=clean-room-secret\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(isolatedWorkspaceDir, "users.csv"),
      "email,sku\nana@clean.local,SKU-1\nbruno@clean.local,SKU-2\n",
      "utf8"
    );
    const scenarioPath = path.join(isolatedWorkspaceDir, "clean-check.yaml");
    fs.writeFileSync(
      scenarioPath,
      `name: "Clean Room Verification"
baseUrl: "${server.baseUrl}"

dataFile:
  path: "./users.csv"
  mode: "round-robin"

steps:
  - id: submit_order
    name: "Enviar Pedido com .env e CSV"
    method: POST
    path: "/orders"
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer {{env.API_SECRET}}"
    body:
      email: "{{email}}"
      sku: "{{sku}}"
    assert:
      status: 201

load:
  vus: 3
  rampUp: "50ms"
  duration: "450ms"
  thinkTimeMs: 25

thresholds:
  p95Ms: 2000
  maxErrorRatePct: 0
`,
      "utf8"
    );

    const cleanEnv =
      process.platform === "win32"
        ? { SystemRoot: process.env.SystemRoot || "C:\\Windows", PATH: "" }
        : { PATH: "" };

    const smokeRun = await runBinaryAsync(
      sidecarPath,
      ["--scenario", scenarioPath, "--mode", "smoke", "--iterations", "2"],
      {
        cwd: isolatedWorkspaceDir,
        env: cleanEnv,
      }
    );

    assert.equal(
      smokeRun.status,
      0,
      `Smoke test no binário isolado falhou (status=${smokeRun.status}): ${smokeRun.stderr}`
    );
    const smokeEvents = parseNdjsonEvents(smokeRun.stdout);
    assert.equal(smokeEvents[0].type, "RUN_STARTED");
    const smokeFinished = smokeEvents[smokeEvents.length - 1];
    assert.equal(smokeFinished.type, "RUN_FINISHED");
    assert.equal(smokeFinished.passedThresholds, true);
    assert.equal(smokeFinished.totalRequests, 2);
    assert.equal(smokeFinished.totalErrors, 0);
    assert.equal(server.receivedRequests.length, 2);
    assert.deepEqual(server.receivedRequests[0], { email: "ana@clean.local", sku: "SKU-1" });
    assert.deepEqual(server.receivedRequests[1], { email: "bruno@clean.local", sku: "SKU-2" });
    logStep("Sidecar isolado (PATH vazio) executou modo SMOKE com .env + CSV (2/2 OK)");

    const loadRun = await runBinaryAsync(
      sidecarPath,
      ["--scenario", scenarioPath, "--mode", "load", "--window", "150ms"],
      {
        cwd: isolatedWorkspaceDir,
        env: cleanEnv,
      }
    );

    assert.equal(
      loadRun.status,
      0,
      `Load test no binário isolado falhou (status=${loadRun.status}): ${loadRun.stderr}`
    );
    const loadEvents = parseNdjsonEvents(loadRun.stdout);
    const loadTicks = loadEvents.filter((ev) => ev.type === "METRIC_TICK");
    const loadFinished = loadEvents[loadEvents.length - 1];
    assert.ok(loadTicks.length >= 1, "Esperado ao menos 1 METRIC_TICK no modo load.");
    assert.equal(loadFinished.type, "RUN_FINISHED");
    assert.equal(loadFinished.passedThresholds, true);
    assert.equal(loadFinished.totalErrors, 0);
    assert.ok(loadFinished.totalRequests >= 3, `Esperado >=3 requisições no load, obtido ${loadFinished.totalRequests}`);
    logStep(
      `Sidecar isolado (PATH vazio) executou modo LOAD (${loadFinished.totalRequests} reqs, 0 erros, ${loadTicks.length} ticks)`
    );

    console.log("\n[verify-packaged] Validação completa fora do repositório concluída com sucesso.");
  } finally {
    if (server) {
      await server.close();
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("[verify-packaged] FALHA:", err);
  process.exit(1);
});
