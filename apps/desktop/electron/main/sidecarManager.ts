import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type {
  RunnerEvent,
  SidecarExitInfo,
  SidecarInfo,
  StartRunRequest,
} from "../../src/types/runner-events";

export interface SidecarCallbacks {
  onEvent: (event: RunnerEvent, scenarioPath: string) => void;
  onStderr: (line: string) => void;
  onExit: (info: SidecarExitInfo) => void;
}

export function getSidecarBinaryName(platform = process.platform): string {
  return platform === "win32" ? "loadsmith.exe" : "loadsmith";
}

export function resolveSidecarBinary(searchRoots: string[]): SidecarInfo {
  const binName = getSidecarBinaryName();
  for (const root of searchRoots) {
    const candidates = [
      path.join(root, "resources", "bin", binName),
      path.join(root, "bin", binName),
      path.join(root, "..", "..", "engine", "bin", binName),
      path.join(root, "engine", "bin", binName),
    ];
    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return {
          found: true,
          binaryPath: resolved,
          platform: process.platform,
        };
      }
    }
  }

  return {
    found: false,
    binaryPath: null,
    platform: process.platform,
  };
}

export class SidecarManager {
  private readonly searchRoots: string[];
  private readonly callbacks: SidecarCallbacks;
  private activeChild: ChildProcessWithoutNullStreams | null = null;
  private activeRunId: string | null = null;
  private activeScenarioPath = "";
  private stoppedByUser = false;
  private forceKillTimer: NodeJS.Timeout | null = null;

  constructor(searchRoots: string[], callbacks: SidecarCallbacks) {
    this.searchRoots = searchRoots;
    this.callbacks = callbacks;
  }

  getSidecarInfo(): SidecarInfo {
    return resolveSidecarBinary(this.searchRoots);
  }

  isRunning(): boolean {
    return this.activeChild !== null;
  }

  start(req: StartRunRequest): void {
    if (this.activeChild) {
      throw new Error("Já existe uma execução em andamento. Pare a execução atual antes de iniciar outra.");
    }

    const info = this.getSidecarInfo();
    if (!info.found || !info.binaryPath) {
      throw new Error(
        `Binário do motor (${getSidecarBinaryName()}) não encontrado. Execute "npm run prepare:sidecar" na raiz do projeto.`
      );
    }

    const resolvedScenario = path.resolve(req.scenarioPath);
    if (!fs.existsSync(resolvedScenario)) {
      throw new Error(`Arquivo de cenário não encontrado: ${resolvedScenario}`);
    }

    const windowMs = Number.isFinite(req.windowMs) && req.windowMs > 0 ? Math.round(req.windowMs) : 500;
    const args = [
      "--scenario",
      resolvedScenario,
      "--mode",
      req.mode,
      "--window",
      `${windowMs}ms`,
    ];

    this.activeRunId = null;
    this.activeScenarioPath = resolvedScenario;
    this.stoppedByUser = false;

    const child = spawn(info.binaryPath, args, {
      cwd: path.dirname(resolvedScenario),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.activeChild = child;

    const stdoutRl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    stdoutRl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      try {
        const parsed = JSON.parse(trimmed) as RunnerEvent;
        if (parsed && typeof parsed.type === "string") {
          if (parsed.type === "RUN_STARTED" && typeof parsed.runId === "string") {
            this.activeRunId = parsed.runId;
          }
          this.callbacks.onEvent(parsed, this.activeScenarioPath);
        }
      } catch (err) {
        this.callbacks.onStderr(
          `[NDJSON parse warning] ${(err as Error).message}: ${trimmed.slice(0, 200)}`
        );
      }
    });

    const stderrRl = readline.createInterface({
      input: child.stderr,
      crlfDelay: Infinity,
    });

    stderrRl.on("line", (line) => {
      if (line.trim()) {
        this.callbacks.onStderr(line);
      }
    });

    child.on("error", (err) => {
      this.callbacks.onStderr(`[Sidecar spawn error] ${err.message}`);
    });

    child.on("close", (code, signal) => {
      this.clearForceKillTimer();
      stdoutRl.close();
      stderrRl.close();

      const exitInfo: SidecarExitInfo = {
        runId: this.activeRunId,
        code,
        signal: signal ? String(signal) : null,
        stoppedByUser: this.stoppedByUser,
      };

      this.activeChild = null;
      this.activeRunId = null;
      this.activeScenarioPath = "";
      this.stoppedByUser = false;

      this.callbacks.onExit(exitInfo);
    });
  }

  stop(): boolean {
    const child = this.activeChild;
    if (!child || child.killed) {
      return false;
    }

    this.stoppedByUser = true;

    // 1) Graceful cooperative STOP command via stdin (works reliably on Windows & POSIX).
    try {
      if (child.stdin && !child.stdin.destroyed && child.stdin.writable) {
        child.stdin.write("STOP\n");
      }
    } catch {
      // Ignore broken pipe errors during shutdown.
    }

    // 2) On POSIX also send SIGTERM for standard signal handling.
    if (process.platform !== "win32") {
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore if already exited.
      }
    }

    // 3) Guaranteed fallback kill timer so no orphan process remains on Windows or POSIX.
    this.clearForceKillTimer();
    const pid = child.pid;
    this.forceKillTimer = setTimeout(() => {
      if (this.activeChild !== child || !pid) {
        return;
      }
      this.forceKillTree(pid, child);
    }, 3000);

    return true;
  }

  dispose(): void {
    this.clearForceKillTimer();
    const child = this.activeChild;
    if (child && child.pid) {
      this.stoppedByUser = true;
      this.forceKillTree(child.pid, child);
      this.activeChild = null;
    }
  }

  private clearForceKillTimer(): void {
    if (this.forceKillTimer) {
      clearTimeout(this.forceKillTimer);
      this.forceKillTimer = null;
    }
  }

  private forceKillTree(pid: number, child: ChildProcessWithoutNullStreams): void {
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
        return;
      } catch {
        // Fallback to child.kill below if taskkill fails.
      }
    }
    try {
      child.kill("SIGKILL");
    } catch {
      // Process already terminated.
    }
  }
}
