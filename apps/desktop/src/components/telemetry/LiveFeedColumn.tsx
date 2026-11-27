import { useMemo, useState } from "react";
import { Activity, Trash2 } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n } from "../../i18n";

type FeedTab = "all" | "ticks" | "errors" | "history";

const MAX_VISIBLE_TICKS = 150;

export function LiveFeedColumn() {
  const { t } = useI18n();
  const ticks = useRunnerStore((s) => s.ticks);
  const errorSamples = useRunnerStore((s) => s.errorSamples);
  const runs = useRunnerStore((s) => s.runs);
  const runStatus = useRunnerStore((s) => s.runStatus);
  const globalSearch = useRunnerStore((s) => s.globalSearch);
  const clearLiveFeed = useRunnerStore((s) => s.clearLiveFeed);
  const setWorkspaceTab = useRunnerStore((s) => s.setWorkspaceTab);
  const setSelectedErrorIndex = useRunnerStore((s) => s.setSelectedErrorIndex);
  const setActivePage = useRunnerStore((s) => s.setActivePage);
  const selectComparisonRuns = useRunnerStore((s) => s.selectComparisonRuns);
  const baseRunId = useRunnerStore((s) => s.baseRunId);

  const [tab, setTab] = useState<FeedTab>("all");
  const isRunning = runStatus === "running" || runStatus === "stopping";
  const query = globalSearch.trim().toLowerCase();

  const visibleTicks = useMemo(
    () => ticks.slice(-MAX_VISIBLE_TICKS).reverse(),
    [ticks]
  );
  const filteredErrors = useMemo(() => {
    const indexed = errorSamples.map((err, originalIndex) => ({ err, originalIndex }));
    if (!query) {
      return indexed;
    }
    return indexed.filter(
      ({ err }) =>
        err.step.toLowerCase().includes(query) ||
        err.requestSummary.toLowerCase().includes(query) ||
        err.error.toLowerCase().includes(query)
    );
  }, [errorSamples, query]);

  const filteredRuns = useMemo(() => {
    if (!query) {
      return runs;
    }
    return runs.filter(
      (r) =>
        r.scenarioName.toLowerCase().includes(query) ||
        r.mode.toLowerCase().includes(query) ||
        r.status.toLowerCase().includes(query)
    );
  }, [runs, query]);

  const totalLiveItems = errorSamples.length + ticks.length;

  return (
    <section className="forge-column">
      <div className="section-header" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="section-title-group">
          <Activity size={14} color="#10b981" />
          <span className="section-label" style={{ color: "var(--text-primary)", textTransform: "none", fontSize: 12.5 }}>
            {t("feed.title")}
          </span>
          <span className="count-pill">{totalLiveItems}</span>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={isRunning || totalLiveItems === 0}
          onClick={clearLiveFeed}
          style={{ height: 24, fontSize: 11.5 }}
          title={t("feed.clearTitle")}
        >
          <Trash2 size={12} />
          {t("feed.clear")}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "7px 10px",
          borderBottom: "1px solid var(--border)",
          background: "#0d121b",
        }}
      >
        <FeedFilterChip
          label={t("feed.tabAll")}
          count={totalLiveItems}
          active={tab === "all"}
          onClick={() => setTab("all")}
        />
        <FeedFilterChip
          label={t("feed.tabTicks")}
          count={ticks.length}
          active={tab === "ticks"}
          onClick={() => setTab("ticks")}
        />
        <FeedFilterChip
          label={t("feed.tabErrors")}
          count={errorSamples.length}
          active={tab === "errors"}
          onClick={() => setTab("errors")}
        />
        <FeedFilterChip
          label={t("feed.tabHistory")}
          count={runs.length}
          active={tab === "history"}
          onClick={() => setTab("history")}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {(tab === "all" || tab === "errors") &&
          filteredErrors.map(({ err, originalIndex }, idx) => {
            const [method = "HTTP", ...pathParts] = err.requestSummary.split(" ");
            const reqPath = pathParts.join(" ") || err.requestSummary;

            return (
              <button
                key={`err-${err.step}-${originalIndex}-${idx}`}
                type="button"
                className="forge-card"
                onClick={() => {
                  setSelectedErrorIndex(originalIndex);
                  setWorkspaceTab("errors");
                }}
                style={{
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  borderColor: "rgba(239, 68, 68, 0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span className={`micro-badge ${methodBadgeClass(method)}`}>{method}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {reqPath}
                    </span>
                  </div>
                  <span className="micro-badge micro-slate">{err.step}</span>
                </div>

                <div
                  className="mono tabular"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "#fca5a5",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className="dot dot-err" />
                    {err.statusCode || "ERR"} · {err.durationMs.toFixed(0)}ms
                  </span>
                  <span
                    style={{
                      maxWidth: 135,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--text-muted)",
                    }}
                  >
                    {err.error}
                  </span>
                </div>
              </button>
            );
          })}

        {(tab === "all" || tab === "ticks") && (
          <>
            {visibleTicks.map((tick, idx) => (
              <button
                key={`tick-${tick.elapsedMs}-${idx}`}
                type="button"
                className="forge-card"
                onClick={() => setWorkspaceTab("telemetry")}
                style={{
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="micro-badge micro-live">TICK</span>
                    <span className="mono tabular" style={{ fontSize: 12, fontWeight: 600 }}>
                      {(tick.elapsedMs / 1000).toFixed(1)}s · {tick.rps.toFixed(1)} req/s
                    </span>
                  </div>
                  <span className="micro-badge micro-slate tabular">{tick.activeVus} VUs</span>
                </div>

                <div
                  className="mono tabular"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className={`dot ${tick.errors > 0 ? "dot-warn" : "dot-ok"}`} />
                    ok={tick.successes} err={tick.errors}
                  </span>
                  <span style={{ color: "#38bdf8" }}>
                    p50 {tick.p50Ms.toFixed(1)} · p95 {tick.p95Ms.toFixed(1)}ms
                  </span>
                </div>
              </button>
            ))}

            {ticks.length > MAX_VISIBLE_TICKS && (
              <div
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                {t("feed.limitedTicks", { limit: MAX_VISIBLE_TICKS, total: ticks.length })}
              </div>
            )}
          </>
        )}

        {tab === "history" &&
          filteredRuns.map((run) => (
            <button
              key={run.runId}
              type="button"
              className="forge-card"
              onClick={() => {
                void selectComparisonRuns(baseRunId, run.runId);
                setActivePage("comparison");
              }}
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{run.scenarioName}</span>
                <span className={`badge badge-${run.status}`}>{run.mode}</span>
              </div>
              <div className="mono tabular" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)" }}>
                <span>p95 {run.p95Ms.toFixed(1)}ms</span>
                <span>{run.avgRps.toFixed(1)} RPS</span>
                <span>err {run.errorRatePct.toFixed(1)}%</span>
              </div>
            </button>
          ))}

        {((tab === "all" && totalLiveItems === 0) ||
          (tab === "ticks" && ticks.length === 0) ||
          (tab === "errors" && filteredErrors.length === 0) ||
          (tab === "history" && filteredRuns.length === 0)) && (
          <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
            {tab === "history"
              ? t("feed.emptyHistory")
              : t("feed.emptyStream")}
          </div>
        )}
      </div>
    </section>
  );
}

function FeedFilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 6,
        border: `1px solid ${active ? "rgba(16, 185, 129, 0.35)" : "transparent"}`,
        background: active ? "rgba(16, 185, 129, 0.14)" : "transparent",
        color: active ? "#34d399" : "var(--text-secondary)",
        fontSize: 11.5,
        fontWeight: active ? 600 : 500,
      }}
    >
      <span>{label}</span>
      <span className="mono" style={{ fontSize: 10.5, opacity: 0.8 }}>
        {count}
      </span>
    </button>
  );
}

function methodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "micro-method-get";
    case "POST":
      return "micro-method-post";
    case "PUT":
    case "PATCH":
      return "micro-method-put";
    case "DELETE":
      return "micro-method-delete";
    default:
      return "micro-slate";
  }
}
