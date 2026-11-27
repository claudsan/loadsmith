import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HistoryDb } from "../historyDb";

describe("HistoryDb (SQLite)", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("persists runs, ticks, and error samples across database reopen and supports deletion", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loadsmith-db-"));
    tempDirs.push(tmpDir);
    const dbPath = path.join(tmpDir, "history.sqlite");

    const db = new HistoryDb(dbPath);
    await db.init();

    db.recordRunStarted(
      {
        type: "RUN_STARTED",
        runId: "run-100",
        scenario: "Orders API",
        mode: "load",
        timestamp: "2026-11-26T05:00:00Z",
      },
      "C:\\workspace\\api-flow.yaml"
    );

    db.recordMetricTick({
      type: "METRIC_TICK",
      runId: "run-100",
      elapsedMs: 500,
      activeVus: 10,
      rps: 120,
      p50Ms: 11.2,
      p95Ms: 24.4,
      p99Ms: 41.0,
      successes: 59,
      errors: 1,
    });

    db.recordMetricTick({
      type: "METRIC_TICK",
      runId: "run-100",
      elapsedMs: 1000,
      activeVus: 20,
      rps: 180,
      p50Ms: 14.0,
      p95Ms: 32.0,
      p99Ms: 55.0,
      successes: 90,
      errors: 0,
    });

    db.recordErrorSample({
      type: "ERROR_SAMPLE",
      runId: "run-100",
      step: "createOrder",
      statusCode: 500,
      durationMs: 45.2,
      error: "expected HTTP status 201, got 500",
      requestSummary: "POST /orders",
    });

    db.recordRunFinished(
      {
        type: "RUN_FINISHED",
        runId: "run-100",
        totalRequests: 150,
        totalErrors: 1,
        errorRatePct: 0.67,
        p95Ms: 30.5,
        passedThresholds: true,
        violations: [],
      },
      false
    );
    db.close();

    // Reopen from disk to confirm atomic SQLite persistence.
    const reopened = new HistoryDb(dbPath);
    await reopened.init();

    const runs = reopened.listRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe("run-100");
    expect(runs[0].status).toBe("passed");
    expect(runs[0].avgRps).toBe(150);
    expect(runs[0].peakRps).toBe(180);

    const details = reopened.getRunDetails("run-100");
    expect(details).not.toBeNull();
    expect(details?.ticks).toHaveLength(2);
    expect(details?.errorSamples).toHaveLength(1);
    expect(details?.errorSamples[0].step).toBe("createOrder");

    reopened.deleteRun("run-100");
    expect(reopened.listRuns()).toHaveLength(0);
    expect(reopened.getRunDetails("run-100")).toBeNull();
    reopened.close();
  });
});
