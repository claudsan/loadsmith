import { useMemo, useState } from "react";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import type { ExecutiveReportInput } from "../../app/utils/executiveReport";
import { useI18n } from "../../i18n";
import { ExecutiveReportModal } from "./ExecutiveReportModal";

export function KpiCards() {
  const { language, t } = useI18n();
  const ticks = useRunnerStore((s) => s.ticks);
  const errorSamples = useRunnerStore((s) => s.errorSamples);
  const lastFinished = useRunnerStore((s) => s.lastFinished);
  const runStatus = useRunnerStore((s) => s.runStatus);
  const currentScenarioName = useRunnerStore((s) => s.currentScenarioName);
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const mode = useRunnerStore((s) => s.mode);
  const [showReport, setShowReport] = useState(false);

  const reportInput = useMemo<ExecutiveReportInput | null>(() => {
    if (!lastFinished) {
      return null;
    }
    const fallbackName = selectedFilePath?.split(/[\\/]/).pop() || "Cenário LoadSmith";
    return {
      runId: lastFinished.runId,
      scenarioName: currentScenarioName || fallbackName,
      mode,
      startedAt: new Date().toISOString(),
      totalRequests: lastFinished.totalRequests,
      totalErrors: lastFinished.totalErrors,
      errorRatePct: lastFinished.errorRatePct,
      p95Ms: lastFinished.p95Ms,
      passedThresholds: lastFinished.passedThresholds,
      violations: lastFinished.violations,
      ticks,
      errorSamples,
      language,
    };
  }, [lastFinished, currentScenarioName, selectedFilePath, mode, ticks, errorSamples, language]);

  const latest = ticks.length > 0 ? ticks[ticks.length - 1] : null;
  const totalRequestsFromTicks = ticks.reduce((acc, t) => acc + t.successes + t.errors, 0);
  const totalErrorsFromTicks = ticks.reduce((acc, t) => acc + t.errors, 0);

  const totalRequests = lastFinished ? lastFinished.totalRequests : totalRequestsFromTicks;
  const totalErrors = lastFinished ? lastFinished.totalErrors : totalErrorsFromTicks;
  const errorRate = lastFinished
    ? lastFinished.errorRatePct
    : totalRequests > 0
      ? (totalErrors / totalRequests) * 100
      : 0;

  const p95 = lastFinished ? lastFinished.p95Ms : (latest?.p95Ms ?? 0);
  const p50 = latest?.p50Ms ?? 0;
  const p99 = latest?.p99Ms ?? 0;
  const rps = latest?.rps ?? 0;
  const activeVus = latest?.activeVus ?? 0;

  const cards = [
    {
      label: t("kpi.rps"),
      value: rps.toFixed(1),
      sub: t("kpi.activeVus", { count: activeVus }),
      color: "#38bdf8",
    },
    {
      label: t("kpi.latencyP95"),
      value: `${p95.toFixed(1)} ms`,
      sub: `p50 ${p50.toFixed(1)} · p99 ${p99.toFixed(1)} ms`,
      color: "#a78bfa",
    },
    {
      label: t("kpi.errorRate"),
      value: `${errorRate.toFixed(2)}%`,
      sub: t("kpi.errorsRatio", { errors: totalErrors, total: totalRequests }),
      color: errorRate > 0 ? "#f87171" : "#4ade80",
    },
    {
      label: t("kpi.totalRequests"),
      value: totalRequests.toLocaleString(language),
      sub: latest ? t("kpi.elapsed", { sec: (latest.elapsedMs / 1000).toFixed(1) }) : t("kpi.waiting"),
      color: "#e2e8f0",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: "10px 12px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "#0e1523",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              {card.label}
            </div>
            <div
              className="tabular"
              style={{ fontSize: 20, fontWeight: 700, color: card.color, lineHeight: 1.15 }}
            >
              {card.value}
            </div>
            <div className="tabular" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {lastFinished && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 8,
            border: `1px solid ${
              lastFinished.passedThresholds
                ? "rgba(34, 197, 94, 0.35)"
                : "rgba(239, 68, 68, 0.4)"
            }`,
            background: lastFinished.passedThresholds
              ? "var(--success-soft)"
              : "var(--danger-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {lastFinished.passedThresholds ? (
              <CheckCircle2 size={16} color="#4ade80" />
            ) : (
              <XCircle size={16} color="#f87171" />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>
                {runStatus === "stopped"
                  ? t("kpi.stoppedByUser")
                  : lastFinished.passedThresholds
                    ? t("kpi.thresholdsPassed")
                    : t("kpi.thresholdsFailed")}
              </div>
              {lastFinished.violations.length > 0 && (
                <div className="mono" style={{ fontSize: 11, color: "#fecaca", marginTop: 2 }}>
                  {lastFinished.violations.join(" | ")}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {lastFinished.runId}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 27, padding: "0 10px", fontSize: 11.5 }}
              onClick={() => setShowReport(true)}
            >
              <FileText size={12} />
              {t("kpi.execReportBtn")}
            </button>
          </div>
        </div>
      )}

      <ExecutiveReportModal
        open={showReport}
        input={reportInput}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}
