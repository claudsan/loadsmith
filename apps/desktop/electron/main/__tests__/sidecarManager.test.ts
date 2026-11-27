import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RunnerEvent, SidecarExitInfo } from "../../../src/types/runner-events";
import { SidecarManager } from "../sidecarManager";

describe("SidecarManager (Go sidecar integration)", () => {
  const tempDirs: string[] = [];
  const servers: http.Server[] = [];

  afterEach(async () => {
    for (const srv of servers) {
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    }
    servers.length = 0;

    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  async function startMockServer(): Promise<string> {
    const srv = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }
      res.writeHead(404);
      res.end(JSON.stringify({ error: "not found" }));
    });
    servers.push(srv);
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    if (!addr || typeof addr === "string") {
      throw new Error("Unexpected server address");
    }
    return `http://127.0.0.1:${addr.port}`;
  }

  it("streams real NDJSON events in smoke mode and supports graceful stop in load mode", async () => {
    const baseUrl = await startMockServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-sidecar-"));
    tempDirs.push(tmpDir);

    // Deliberately include spaces in directory path to verify Windows path safety.
    const spacedDir = path.join(tmpDir, "cenarios com espaco");
    fs.mkdirSync(spacedDir, { recursive: true });
    const scenarioPath = path.join(spacedDir, "mock-flow.yaml");
    fs.writeFileSync(
      scenarioPath,
      `name: "Mock Flow"
baseUrl: "${baseUrl}"
steps:
  - id: health
    method: GET
    path: "/health"
    assert:
      status: 200
load:
  vus: 3
  rampUp: "100ms"
  duration: "10s"
  thinkTimeMs: 25
`,
      "utf8"
    );

    const desktopRoot = path.resolve(__dirname, "..", "..", "..");

    // 1) Smoke mode run
    const smokeEvents: RunnerEvent[] = [];
    const smokeExit = await new Promise<SidecarExitInfo>((resolve, reject) => {
      const manager = new SidecarManager([desktopRoot], {
        onEvent: (ev) => smokeEvents.push(ev),
        onStderr: () => {},
        onExit: (info) => resolve(info),
      });
      expect(manager.getSidecarInfo().found).toBe(true);
      try {
        manager.start({ scenarioPath, mode: "smoke", windowMs: 250 });
      } catch (err) {
        reject(err);
      }
    });

    expect(smokeExit.code).toBe(0);
    expect(smokeEvents[0]?.type).toBe("RUN_STARTED");
    expect(smokeEvents[smokeEvents.length - 1]?.type).toBe("RUN_FINISHED");

    // 2) Load mode + cooperative STOP test
    const loadEvents: RunnerEvent[] = [];
    let stopTriggered = false;
    const loadExit = await new Promise<SidecarExitInfo>((resolve, reject) => {
      const manager = new SidecarManager([desktopRoot], {
        onEvent: (ev) => {
          loadEvents.push(ev);
          if (ev.type === "METRIC_TICK" && !stopTriggered) {
            stopTriggered = true;
            manager.stop();
          }
        },
        onStderr: () => {},
        onExit: (info) => resolve(info),
      });

      try {
        manager.start({ scenarioPath, mode: "load", windowMs: 150 });
      } catch (err) {
        reject(err);
      }
    });

    expect(stopTriggered).toBe(true);
    expect(loadExit.stoppedByUser).toBe(true);
    expect(loadEvents.some((e) => e.type === "METRIC_TICK")).toBe(true);
    expect(loadEvents[loadEvents.length - 1]?.type).toBe("RUN_FINISHED");
  }, 15000);
});
