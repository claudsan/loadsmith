import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type {
  ErrorSampleEvent,
  MetricTickEvent,
  RunFinishedEvent,
  RunStartedEvent,
  StoredRunDetails,
  StoredRunStatus,
  StoredRunSummary,
} from "../../src/types/runner-events";

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function resolveSqlWasmPath(): string {
  if (typeof process.resourcesPath === "string" && process.resourcesPath.length > 0) {
    const resourceWasm = path.join(process.resourcesPath, "sql-wasm.wasm");
    if (fs.existsSync(resourceWasm)) {
      return resourceWasm;
    }
  }

  const resolved = require.resolve("sql.js/dist/sql-wasm.wasm");
  if (resolved.includes("app.asar")) {
    const unpacked = resolved.replace("app.asar", "app.asar.unpacked");
    if (unpacked !== resolved && fs.existsSync(unpacked)) {
      return unpacked;
    }
  }

  return resolved;
}

function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) {
    return sqlJsPromise;
  }
  const wasmPath = resolveSqlWasmPath();
  const next = initSqlJs({
    locateFile: () => wasmPath,
  });
  sqlJsPromise = next;
  return next;
}

export class HistoryDb {
  private readonly dbPath: string;
  private db: Database | null = null;
  private dirty = false;

  constructor(dbPath: string) {
    this.dbPath = path.resolve(dbPath);
  }

  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    const SQL = await getSqlJs();
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });

    if (fs.existsSync(this.dbPath)) {
      const fileBytes = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBytes);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS runs (
        run_id TEXT PRIMARY KEY,
        scenario_name TEXT NOT NULL,
        scenario_path TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        total_requests INTEGER NOT NULL DEFAULT 0,
        total_errors INTEGER NOT NULL DEFAULT 0,
        error_rate_pct REAL NOT NULL DEFAULT 0,
        p95_ms REAL NOT NULL DEFAULT 0,
        avg_rps REAL NOT NULL DEFAULT 0,
        peak_rps REAL NOT NULL DEFAULT 0,
        passed_thresholds INTEGER NOT NULL DEFAULT 0,
        violations_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS metric_ticks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        elapsed_ms INTEGER NOT NULL,
        active_vus INTEGER NOT NULL,
        rps REAL NOT NULL,
        p50_ms REAL NOT NULL,
        p95_ms REAL NOT NULL,
        p99_ms REAL NOT NULL,
        successes INTEGER NOT NULL,
        errors INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS error_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        step TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        duration_ms REAL NOT NULL,
        error TEXT NOT NULL,
        request_summary TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ticks_run_id ON metric_ticks(run_id, elapsed_ms);
      CREATE INDEX IF NOT EXISTS idx_errors_run_id ON error_samples(run_id);
    `);

    this.flushToDisk();
  }

  private ensureDb(): Database {
    if (!this.db) {
      throw new Error("HistoryDb não inicializado. Chame init() antes de usar.");
    }
    return this.db;
  }

  recordRunStarted(ev: RunStartedEvent, scenarioPath: string): void {
    const db = this.ensureDb();
    db.run(
      `INSERT OR REPLACE INTO runs (
        run_id, scenario_name, scenario_path, mode, status, started_at,
        finished_at, total_requests, total_errors, error_rate_pct, p95_ms,
        avg_rps, peak_rps, passed_thresholds, violations_json
      ) VALUES (?, ?, ?, ?, 'running', ?, NULL, 0, 0, 0, 0, 0, 0, 0, '[]')`,
      [ev.runId, ev.scenario, scenarioPath, ev.mode, ev.timestamp]
    );
    this.dirty = true;
    this.flushToDisk();
  }

  recordMetricTick(ev: MetricTickEvent): void {
    const db = this.ensureDb();
    db.run(
      `INSERT INTO metric_ticks (
        run_id, elapsed_ms, active_vus, rps, p50_ms, p95_ms, p99_ms, successes, errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ev.runId,
        ev.elapsedMs,
        ev.activeVus,
        ev.rps,
        ev.p50Ms,
        ev.p95Ms,
        ev.p99Ms,
        ev.successes,
        ev.errors,
      ]
    );
    this.dirty = true;
  }

  recordErrorSample(ev: ErrorSampleEvent): void {
    const db = this.ensureDb();
    db.run(
      `INSERT INTO error_samples (
        run_id, step, status_code, duration_ms, error, request_summary
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ev.runId,
        ev.step,
        ev.statusCode,
        ev.durationMs,
        ev.error,
        ev.requestSummary,
      ]
    );
    this.dirty = true;
  }

  recordRunFinished(ev: RunFinishedEvent, stoppedByUser: boolean): void {
    const db = this.ensureDb();
    const rpsStats = this.queryRpsStats(ev.runId);
    const status: StoredRunStatus = stoppedByUser
      ? "stopped"
      : ev.passedThresholds
        ? "passed"
        : "failed";

    db.run(
      `UPDATE runs SET
        status = ?,
        finished_at = ?,
        total_requests = ?,
        total_errors = ?,
        error_rate_pct = ?,
        p95_ms = ?,
        avg_rps = ?,
        peak_rps = ?,
        passed_thresholds = ?,
        violations_json = ?
      WHERE run_id = ?`,
      [
        status,
        new Date().toISOString(),
        ev.totalRequests,
        ev.totalErrors,
        ev.errorRatePct,
        ev.p95Ms,
        rpsStats.avgRps,
        rpsStats.peakRps,
        ev.passedThresholds ? 1 : 0,
        JSON.stringify(ev.violations ?? []),
        ev.runId,
      ]
    );
    this.dirty = true;
    this.flushToDisk();
  }

  markInterrupted(runId: string, status: StoredRunStatus = "stopped"): void {
    const db = this.ensureDb();
    const rpsStats = this.queryRpsStats(runId);
    db.run(
      `UPDATE runs SET
        status = CASE WHEN status = 'running' THEN ? ELSE status END,
        finished_at = COALESCE(finished_at, ?),
        avg_rps = CASE WHEN avg_rps = 0 THEN ? ELSE avg_rps END,
        peak_rps = CASE WHEN peak_rps = 0 THEN ? ELSE peak_rps END
      WHERE run_id = ?`,
      [status, new Date().toISOString(), rpsStats.avgRps, rpsStats.peakRps, runId]
    );
    this.dirty = true;
    this.flushToDisk();
  }

  listRuns(limit = 100): StoredRunSummary[] {
    const db = this.ensureDb();
    const stmt = db.prepare(
      `SELECT
        run_id, scenario_name, scenario_path, mode, status, started_at, finished_at,
        total_requests, total_errors, error_rate_pct, p95_ms, avg_rps, peak_rps,
        passed_thresholds, violations_json
      FROM runs
      ORDER BY started_at DESC
      LIMIT ?`
    );
    stmt.bind([limit]);

    const items: StoredRunSummary[] = [];
    while (stmt.step()) {
      items.push(mapRowToSummary(stmt.getAsObject()));
    }
    stmt.free();
    return items;
  }

  getRunDetails(runId: string): StoredRunDetails | null {
    const db = this.ensureDb();
    const runStmt = db.prepare(
      `SELECT
        run_id, scenario_name, scenario_path, mode, status, started_at, finished_at,
        total_requests, total_errors, error_rate_pct, p95_ms, avg_rps, peak_rps,
        passed_thresholds, violations_json
      FROM runs WHERE run_id = ?`
    );
    runStmt.bind([runId]);
    if (!runStmt.step()) {
      runStmt.free();
      return null;
    }
    const summary = mapRowToSummary(runStmt.getAsObject());
    runStmt.free();

    const ticks: MetricTickEvent[] = [];
    const tickStmt = db.prepare(
      `SELECT run_id, elapsed_ms, active_vus, rps, p50_ms, p95_ms, p99_ms, successes, errors
       FROM metric_ticks
       WHERE run_id = ?
       ORDER BY elapsed_ms ASC, id ASC`
    );
    tickStmt.bind([runId]);
    while (tickStmt.step()) {
      const row = tickStmt.getAsObject();
      ticks.push({
        type: "METRIC_TICK",
        runId: String(row.run_id),
        elapsedMs: Number(row.elapsed_ms),
        activeVus: Number(row.active_vus),
        rps: Number(row.rps),
        p50Ms: Number(row.p50_ms),
        p95Ms: Number(row.p95_ms),
        p99Ms: Number(row.p99_ms),
        successes: Number(row.successes),
        errors: Number(row.errors),
      });
    }
    tickStmt.free();

    const errorSamples: ErrorSampleEvent[] = [];
    const errStmt = db.prepare(
      `SELECT run_id, step, status_code, duration_ms, error, request_summary
       FROM error_samples
       WHERE run_id = ?
       ORDER BY id ASC`
    );
    errStmt.bind([runId]);
    while (errStmt.step()) {
      const row = errStmt.getAsObject();
      errorSamples.push({
        type: "ERROR_SAMPLE",
        runId: String(row.run_id),
        step: String(row.step),
        statusCode: Number(row.status_code),
        durationMs: Number(row.duration_ms),
        error: String(row.error),
        requestSummary: String(row.request_summary),
      });
    }
    errStmt.free();

    return { summary, ticks, errorSamples };
  }

  deleteRun(runId: string): void {
    const db = this.ensureDb();
    db.run("DELETE FROM metric_ticks WHERE run_id = ?", [runId]);
    db.run("DELETE FROM error_samples WHERE run_id = ?", [runId]);
    db.run("DELETE FROM runs WHERE run_id = ?", [runId]);
    this.dirty = true;
    this.flushToDisk();
  }

  flushToDisk(): void {
    if (!this.db) {
      return;
    }
    const data = this.db.export();
    const tmpPath = `${this.dbPath}.tmp`;
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.renameSync(tmpPath, this.dbPath);
    this.dirty = false;
  }

  close(): void {
    if (!this.db) {
      return;
    }
    if (this.dirty) {
      this.flushToDisk();
    }
    this.db.close();
    this.db = null;
  }

  private queryRpsStats(runId: string): { avgRps: number; peakRps: number } {
    const db = this.ensureDb();
    const stmt = db.prepare(
      `SELECT COALESCE(AVG(rps), 0) AS avg_rps, COALESCE(MAX(rps), 0) AS peak_rps
       FROM metric_ticks
       WHERE run_id = ?`
    );
    stmt.bind([runId]);
    let avgRps = 0;
    let peakRps = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      avgRps = round2(Number(row.avg_rps ?? 0));
      peakRps = round2(Number(row.peak_rps ?? 0));
    }
    stmt.free();
    return { avgRps, peakRps };
  }
}

function mapRowToSummary(row: Record<string, unknown>): StoredRunSummary {
  let violations: string[] = [];
  try {
    const parsed = JSON.parse(String(row.violations_json ?? "[]"));
    if (Array.isArray(parsed)) {
      violations = parsed.map((v) => String(v));
    }
  } catch {
    violations = [];
  }

  return {
    runId: String(row.run_id),
    scenarioName: String(row.scenario_name),
    scenarioPath: String(row.scenario_path),
    mode: String(row.mode) === "load" ? "load" : "smoke",
    status: normalizeStatus(String(row.status)),
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    totalRequests: Number(row.total_requests ?? 0),
    totalErrors: Number(row.total_errors ?? 0),
    errorRatePct: Number(row.error_rate_pct ?? 0),
    p95Ms: Number(row.p95_ms ?? 0),
    avgRps: Number(row.avg_rps ?? 0),
    peakRps: Number(row.peak_rps ?? 0),
    passedThresholds: Number(row.passed_thresholds ?? 0) === 1,
    violations,
  };
}

function normalizeStatus(raw: string): StoredRunStatus {
  if (raw === "passed" || raw === "failed" || raw === "stopped" || raw === "running") {
    return raw;
  }
  return "failed";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
