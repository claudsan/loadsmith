import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, RefreshCw, Trash2 } from "lucide-react";
import { useRunnerStore } from "../app/store/runnerStore";
import type { ExecutiveReportInput } from "../app/utils/executiveReport";
import {
  ColumnResizer,
  readStoredNumber,
  saveStoredNumber,
} from "../components/layout/ColumnResizer";
import { ExecutiveReportModal } from "../components/telemetry/ExecutiveReportModal";
import { useI18n, type SupportedLanguage } from "../i18n";
import type { MetricTickEvent, StoredRunSummary } from "../types/runner-events";

const DEFAULT_SIDEBAR_WIDTH = 340;

export function ComparisonPage() {
  const { language, t } = useI18n();
  const runs = useRunnerStore((s) => s.runs);
  const baseRunId = useRunnerStore((s) => s.baseRunId);
  const targetRunId = useRunnerStore((s) => s.targetRunId);
  const baseRunDetails = useRunnerStore((s) => s.baseRunDetails);
  const targetRunDetails = useRunnerStore((s) => s.targetRunDetails);
  const selectComparisonRuns = useRunnerStore((s) => s.selectComparisonRuns);
  const deleteHistoryRun = useRunnerStore((s) => s.deleteHistoryRun);
  const refreshHistory = useRunnerStore((s) => s.refreshHistory);
  const setActivePage = useRunnerStore((s) => s.setActivePage);

  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredNumber("loadsmith.col.comparison", DEFAULT_SIDEBAR_WIDTH, 240, 560)
  );
  const [showExecReport, setShowExecReport] = useState(false);

  const updateSidebarWidth = (next: number) => {
    setSidebarWidth(next);
    saveStoredNumber("loadsmith.col.comparison", next);
  };

  const base = baseRunDetails?.summary ?? null;
  const target = targetRunDetails?.summary ?? null;
  const activeReportDetails = targetRunDetails ?? baseRunDetails ?? null;

  const execReportInput = useMemo<ExecutiveReportInput | null>(() => {
    if (!activeReportDetails) {
      return null;
    }
    const s = activeReportDetails.summary;
    return {
      runId: s.runId,
      scenarioName: s.scenarioName,
      mode: s.mode,
      startedAt: s.startedAt,
      totalRequests: s.totalRequests,
      totalErrors: s.totalErrors,
      errorRatePct: s.errorRatePct,
      p95Ms: s.p95Ms,
      avgRps: s.avgRps,
      peakRps: s.peakRps,
      passedThresholds: s.passedThresholds,
      violations: s.violations,
      ticks: activeReportDetails.ticks,
      errorSamples: activeReportDetails.errorSamples,
      language,
    };
  }, [activeReportDetails, language]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: `${sidebarWidth}px 5px minmax(420px, 1fr)`,
        background: "var(--bg-app)",
      }}
    >
      <aside className="panel" style={{ borderRight: "none" }}>
        <div className="panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn"
              style={{ height: 25, padding: "0 8px", fontSize: 11.5 }}
              onClick={() => setActivePage("workspace")}
              title={t("comparison.backToWorkspace")}
            >
              <ArrowLeft size={13} />
              {t("comparison.back")}
            </button>
            <span className="panel-title">{t("comparison.historyCount", { count: runs.length })}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            title={t("comparison.refreshTitle")}
            onClick={() => void refreshHistory()}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {runs.length === 0 ? (
            <div style={{ padding: 14, color: "var(--text-muted)", fontSize: 12 }}>
              {t("comparison.emptyHistory")}
            </div>
          ) : (
            runs.map((run) => {
              const isBase = run.runId === baseRunId;
              const isTarget = run.runId === targetRunId;
              return (
                <div
                  key={run.runId}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${
                      isTarget
                        ? "rgba(56, 189, 248, 0.55)"
                        : isBase
                          ? "rgba(167, 139, 250, 0.55)"
                          : "var(--border)"
                    }`,
                    background: "#0f1624",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{run.scenarioName}</span>
                    <span className={`badge badge-${run.status}`}>{run.mode}</span>
                  </div>

                  <div className="mono tabular" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    p95 {run.p95Ms.toFixed(1)}ms · RPS {run.avgRps.toFixed(1)} · err {run.errorRatePct.toFixed(2)}%
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                      {formatTimestamp(run.startedAt, language)}
                    </span>

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        className={`btn ${isBase ? "btn-primary" : ""}`}
                        style={{ height: 24, padding: "0 7px", fontSize: 11 }}
                        onClick={() => void selectComparisonRuns(run.runId, targetRunId)}
                      >
                        {t("comparison.beforeBtn")}
                      </button>
                      <button
                        type="button"
                        className={`btn ${isTarget ? "btn-primary" : ""}`}
                        style={{ height: 24, padding: "0 7px", fontSize: 11 }}
                        onClick={() => void selectComparisonRuns(baseRunId, run.runId)}
                      >
                        {t("comparison.afterBtn")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ height: 24, padding: "0 6px" }}
                        title={t("comparison.deleteRunTitle")}
                        onClick={() => void deleteHistoryRun(run.runId)}
                      >
                        <Trash2 size={12} color="#9aa7c2" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <ColumnResizer
        value={sidebarWidth}
        min={240}
        max={560}
        onChange={updateSidebarWidth}
        onReset={() => updateSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
      />

      <main style={{ padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t("comparison.title")}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {t("comparison.subtitle")}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn"
              disabled={!execReportInput}
              onClick={() => setShowExecReport(true)}
              title={t("comparison.execReportTooltip")}
            >
              <FileText size={13} color="#22d3ee" />
              {t("comparison.execReportBtn")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActivePage("workspace")}
            >
              <ArrowLeft size={13} />
              {t("comparison.backToWorkspace")}
            </button>
          </div>
        </div>

        <ExecutiveReportModal
          open={showExecReport}
          input={execReportInput}
          onClose={() => setShowExecReport(false)}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            flexWrap: "wrap",
          }}
        >
          <RunSelector
            label={t("comparison.baselineLabel")}
            value={baseRunId ?? ""}
            runs={runs}
            language={language}
            selectPlaceholder={t("comparison.selectRun")}
            onChange={(id) => void selectComparisonRuns(id || null, targetRunId)}
          />
          <ArrowRight size={16} color="var(--text-muted)" />
          <RunSelector
            label={t("comparison.targetLabel")}
            value={targetRunId ?? ""}
            runs={runs}
            language={language}
            selectPlaceholder={t("comparison.selectRun")}
            onChange={(id) => void selectComparisonRuns(baseRunId, id || null)}
          />
        </div>

        {!base || !target ? (
          <div
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              borderRadius: 9,
              border: "1px dashed var(--border)",
              color: "var(--text-muted)",
              padding: 32,
            }}
          >
            {t("comparison.emptyPair")}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
                gap: 10,
              }}
            >
              <DeltaCard
                title={t("comparison.deltaP95")}
                before={`${base.p95Ms.toFixed(1)} ms`}
                after={`${target.p95Ms.toFixed(1)} ms`}
                delta={target.p95Ms - base.p95Ms}
                pct={pctDelta(base.p95Ms, target.p95Ms)}
                unit="ms"
                lowerIsBetter
              />
              <DeltaCard
                title={t("comparison.deltaAvgRps")}
                before={`${base.avgRps.toFixed(1)} req/s`}
                after={`${target.avgRps.toFixed(1)} req/s`}
                delta={target.avgRps - base.avgRps}
                pct={pctDelta(base.avgRps, target.avgRps)}
                unit="req/s"
                lowerIsBetter={false}
              />
              <DeltaCard
                title={t("comparison.deltaErrorRate")}
                before={`${base.errorRatePct.toFixed(2)}%`}
                after={`${target.errorRatePct.toFixed(2)}%`}
                delta={target.errorRatePct - base.errorRatePct}
                pct={null}
                unit="p.p."
                lowerIsBetter
              />
              <DeltaCard
                title={t("comparison.deltaTotalReqs")}
                before={base.totalRequests.toLocaleString(language)}
                after={target.totalRequests.toLocaleString(language)}
                delta={target.totalRequests - base.totalRequests}
                pct={pctDelta(base.totalRequests, target.totalRequests)}
                unit=""
                lowerIsBetter={false}
              />
            </div>

            <ComparisonOverlayChart
              baseTicks={baseRunDetails?.ticks ?? []}
              targetTicks={targetRunDetails?.ticks ?? []}
            />
          </>
        )}
      </main>
    </div>
  );
}

function RunSelector({
  label,
  value,
  runs,
  language,
  selectPlaceholder,
  onChange,
}: {
  label: string;
  value: string;
  runs: StoredRunSummary[];
  language: SupportedLanguage;
  selectPlaceholder: string;
  onChange: (runId: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 220 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{selectPlaceholder}</option>
        {runs.map((r) => (
          <option key={r.runId} value={r.runId}>
            {r.scenarioName} ({r.mode}) — p95 {r.p95Ms.toFixed(1)}ms · {formatTimestamp(r.startedAt, language)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeltaCard({
  title,
  before,
  after,
  delta,
  pct,
  unit,
  lowerIsBetter,
}: {
  title: string;
  before: string;
  after: string;
  delta: number;
  pct: number | null;
  unit: string;
  lowerIsBetter: boolean;
}) {
  const { t } = useI18n();
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const regressed = lowerIsBetter ? delta > 0 : delta < 0;
  const color = Math.abs(delta) < 0.001 ? "var(--text-secondary)" : improved ? "#4ade80" : regressed ? "#f87171" : "var(--text-secondary)";
  const sign = delta > 0 ? "+" : "";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{title}</span>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 700, color }}>
        {sign}
        {delta.toFixed(2)} {unit}
        {pct !== null && (
          <span style={{ fontSize: 12, marginLeft: 6 }}>
            ({sign}
            {pct.toFixed(1)}%)
          </span>
        )}
      </div>
      <div className="mono tabular" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        {t("comparison.beforeAfter", { before, after })}
      </div>
    </div>
  );
}

function ComparisonOverlayChart({
  baseTicks,
  targetTicks,
}: {
  baseTicks: MetricTickEvent[];
  targetTicks: MetricTickEvent[];
}) {
  const { t } = useI18n();
  const width = 760;
  const height = 240;
  const padL = 48;
  const padR = 20;
  const padT = 20;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const all = [...baseTicks, ...targetTicks];
  if (all.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 9,
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        {t("comparison.noSeries")}
      </div>
    );
  }

  const maxElapsed = Math.max(100, ...all.map((t) => t.elapsedMs));
  const maxP95 = Math.max(10, Math.ceil(Math.max(...all.map((t) => t.p95Ms)) * 1.15));

  const toPath = (items: MetricTickEvent[]) =>
    items
      .map((tick, i) => {
        const x = padL + (tick.elapsedMs / maxElapsed) * innerW;
        const y = padT + innerH - (tick.p95Ms / maxP95) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="panel-title">{t("comparison.overlayTitle")}</span>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          <span style={{ color: "#a78bfa" }}>{t("comparison.legendBefore")}</span>
          <span style={{ color: "#38bdf8" }}>{t("comparison.legendAfter")}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = padT + innerH * (1 - f);
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fill="#687694" fontSize="10" fontFamily="var(--font-mono)">
                {Math.round(maxP95 * f)}
              </text>
            </g>
          );
        })}

        {baseTicks.length > 0 && (
          <path d={toPath(baseTicks)} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 3" />
        )}
        {targetTicks.length > 0 && (
          <path d={toPath(targetTicks)} fill="none" stroke="#38bdf8" strokeWidth="2.4" />
        )}
      </svg>
    </div>
  );
}

function pctDelta(before: number, after: number): number | null {
  if (before === 0) {
    return null;
  }
  return ((after - before) / before) * 100;
}

function formatTimestamp(iso: string, language: SupportedLanguage): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(language, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
