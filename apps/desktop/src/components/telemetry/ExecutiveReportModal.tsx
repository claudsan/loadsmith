import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  Gauge,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  buildExecutiveHtml,
  buildExecutiveReport,
  buildExecutiveSummaryText,
  type ExecutiveReportInput,
  type ExecutiveVerdict,
} from "../../app/utils/executiveReport";
import { useI18n } from "../../i18n";

interface ExecutiveReportModalProps {
  open: boolean;
  input: ExecutiveReportInput | null;
  onClose: () => void;
}

const VERDICT_STYLE: Record<
  ExecutiveVerdict,
  { border: string; bg: string; color: string; pill: string; badgeKey: "report.verdict.ready" | "report.verdict.attention" | "report.verdict.risk" }
> = {
  ready: {
    border: "rgba(16, 185, 129, 0.45)",
    bg: "rgba(16, 185, 129, 0.12)",
    color: "#34d399",
    pill: "micro-live",
    badgeKey: "report.verdict.ready",
  },
  attention: {
    border: "rgba(245, 158, 11, 0.45)",
    bg: "rgba(245, 158, 11, 0.12)",
    color: "#fbbf24",
    pill: "micro-method-post",
    badgeKey: "report.verdict.attention",
  },
  risk: {
    border: "rgba(239, 68, 68, 0.45)",
    bg: "rgba(239, 68, 68, 0.12)",
    color: "#f87171",
    pill: "micro-method-delete",
    badgeKey: "report.verdict.risk",
  },
};

export function ExecutiveReportModal({ open, input, onClose }: ExecutiveReportModalProps) {
  const { language, t } = useI18n();
  const [targetOpsText, setTargetOpsText] = useState("");
  const [copied, setCopied] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setExportedPath(null);
    setExportError(null);
    setCopied(false);
  }, [open, input?.runId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  const parsedTarget = useMemo(() => {
    const num = Number(targetOpsText.trim());
    return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
  }, [targetOpsText]);

  const report = useMemo(() => {
    if (!input) {
      return null;
    }
    return buildExecutiveReport({
      ...input,
      targetOpsPerMinute: parsedTarget,
      language,
    });
  }, [input, parsedTarget, language]);

  if (!open || !report) {
    return null;
  }

  const vs = VERDICT_STYLE[report.verdict];

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildExecutiveSummaryText(report));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const buildReportDefaultName = () => {
    const slug = report.scenarioName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `relatorio-executivo-${slug || "loadsmith"}`;
  };

  const handleExportHtml = async () => {
    setExportError(null);
    try {
      const html = buildExecutiveHtml(report);
      const saved = await window.loadsmith.workspace.exportReport(
        buildReportDefaultName(),
        html,
        "html"
      );
      if (saved) {
        setExportedPath(saved.filePath);
      }
    } catch (err) {
      setExportError(t("report.errorHtml", { error: (err as Error).message }));
    }
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) {
      return;
    }
    setExportError(null);
    setIsExportingPdf(true);
    try {
      const html = buildExecutiveHtml(report);
      const saved = await window.loadsmith.workspace.exportReportPdf(buildReportDefaultName(), html);
      if (saved) {
        setExportedPath(saved.filePath);
      }
    } catch (err) {
      setExportError(t("report.errorPdf", { error: (err as Error).message }));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Relatório Executivo"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 65,
        background: "rgba(5, 8, 14, 0.8)",
        backdropFilter: "blur(5px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(860px, 94vw)",
          maxHeight: "90vh",
          borderRadius: 12,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-chrome)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.72)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "13px 18px",
            borderBottom: "1px solid var(--border)",
            background: "#0f1520",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={18} color="#22d3ee" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                {t("report.modalTitle", { name: report.scenarioName })}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                {t("report.modalMeta", {
                  date: report.executedAtFormatted,
                  mode: report.modeLabel,
                  vus: report.maxActiveVus,
                })}
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-ghost" onClick={onClose} title={t("curl.closeTitle")}>
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Executive Body */}
        <div
          className="selectable"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "var(--bg-app)",
          }}
        >
          {/* Semaphore Verdict Banner */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 11,
              border: `1px solid ${vs.border}`,
              background: vs.bg,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ marginTop: 2, flexShrink: 0 }}>
              {report.verdict === "ready" ? (
                <CheckCircle2 size={22} color={vs.color} />
              ) : report.verdict === "attention" ? (
                <AlertTriangle size={22} color={vs.color} />
              ) : (
                <ShieldAlert size={22} color={vs.color} />
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span className={`micro-badge ${vs.pill}`}>{t(vs.badgeKey)}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#f8fafc" }}>
                  {report.verdictTitle}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#cbd5e1" }}>{report.verdictSubtitle}</div>
            </div>
          </div>

          {/* Simulador de Meta (Black Friday / Volumetria esperada) */}
          <div
            className="forge-card"
            style={{
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={14} color="#22d3ee" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                  {t("report.simTitle")}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {t("report.simSubtitle")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                type="number"
                min={1}
                className="input mono"
                placeholder={t("report.simPlaceholder")}
                value={targetOpsText}
                onChange={(e) => setTargetOpsText(e.target.value)}
                style={{ width: 115 }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("report.simUnit")}</span>
              {[1000, 5000, 15000, 30000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="btn"
                  style={{ height: 26, padding: "0 8px", fontSize: 11 }}
                  onClick={() => setTargetOpsText(String(preset))}
                >
                  {(preset / 1000).toFixed(0)}k/min
                </button>
              ))}
              {targetOpsText && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ height: 26, fontSize: 11 }}
                  onClick={() => setTargetOpsText("")}
                >
                  {t("report.simClear")}
                </button>
              )}
            </div>
          </div>

          {/* 4 Business KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 10 }}>
            <ExecKpi
              icon={<Gauge size={13} color="#38bdf8" />}
              label={t("report.kpiCapacity")}
              value={`${report.opsPerMinute.toLocaleString(language)}/min`}
              sub={t("report.kpiPerHour", { count: report.opsPerHour.toLocaleString(language) })}
              color="#38bdf8"
            />
            <ExecKpi
              icon={<Users size={13} color="#a78bfa" />}
              label={t("report.kpiUx")}
              value={report.uxRatingLabel}
              sub={t("report.kpiP95Within", { ms: report.p95Ms.toFixed(0) })}
              color="#a78bfa"
            />
            <ExecKpi
              icon={<CheckCircle2 size={13} color="#34d399" />}
              label={t("report.kpiReliability")}
              value={`${report.successRatePct.toFixed(2)}%`}
              sub={t("report.kpiFailuresOf", {
                errors: report.totalErrors.toLocaleString(language),
                total: report.totalRequests.toLocaleString(language),
              })}
              color={report.totalErrors > 0 ? "#fbbf24" : "#34d399"}
            />
            <ExecKpi
              icon={<Sparkles size={13} color="#10b981" />}
              label={t("report.kpiStability")}
              value={
                report.stabilityKind === "stable"
                  ? t("report.stabilityShort.stable")
                  : report.stabilityKind === "oscillating"
                    ? t("report.stabilityShort.oscillating")
                    : report.stabilityKind === "degrading"
                      ? t("report.stabilityShort.degrading")
                      : t("report.stabilityShort.quick")
              }
              sub={t("report.kpiDuration", { sec: report.durationSec.toFixed(1) })}
              color="#e2e8f0"
            />
          </div>

          {/* Direct Answers for Managers */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="section-label">{t("report.answersTitle")}</span>
            {report.businessAnswers.map((item) => {
              const st = VERDICT_STYLE[item.status];
              return (
                <div key={item.question} className="forge-card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{item.question}</span>
                    <span className={`micro-badge ${st.pill}`}>{t(st.badgeKey)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {item.answer}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grouped Failures (if any) */}
          {report.failureGroups.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="section-label">{t("report.failuresTitle")}</span>
              <div className="forge-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "#0f1520", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "8px 12px" }}>{t("report.colStep")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("report.colCode")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("report.colSamples")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("report.colReason")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.failureGroups.map((f, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(30, 38, 54, 0.6)" }}>
                        <td className="mono" style={{ padding: "7px 12px", fontWeight: 600 }}>{f.step}</td>
                        <td className="mono" style={{ padding: "7px 12px", color: "#fca5a5" }}>{f.statusCode || t("report.networkError")}</td>
                        <td className="mono tabular" style={{ padding: "7px 12px" }}>{f.count}</td>
                        <td className="mono" style={{ padding: "7px 12px", color: "var(--text-secondary)" }}>{f.sampleMessage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="forge-card" style={{ padding: 12 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>
              {t("report.nextStepsTitle")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", fontSize: 12.5 }}>
              {report.recommendations.map((rec, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {exportError && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgba(239, 68, 68, 0.45)",
                background: "rgba(239, 68, 68, 0.12)",
                fontSize: 12,
                color: "#fca5a5",
              }}
            >
              {exportError}
            </div>
          )}

          {exportedPath && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgba(16, 185, 129, 0.4)",
                background: "rgba(16, 185, 129, 0.1)",
                fontSize: 12,
                color: "#a7f3d0",
              }}
            >
              <span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t("report.savedIn", { path: exportedPath })}
              </span>
              <button
                type="button"
                className="btn"
                style={{ height: 25, fontSize: 11, flexShrink: 0 }}
                onClick={() => void window.loadsmith.workspace.openExternalPath(exportedPath)}
              >
                <ExternalLink size={12} />
                {t("report.openFile")}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "11px 18px",
            borderTop: "1px solid var(--border)",
            background: "#0f1520",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {t("report.footerHint")}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={() => void handleCopySummary()}>
              {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              {copied ? t("report.copiedSummary") : t("report.copySummary")}
            </button>
            <button type="button" className="btn" onClick={() => void handleExportHtml()}>
              <FileDown size={13} />
              {t("report.exportHtml")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isExportingPdf}
              onClick={() => void handleExportPdf()}
            >
              <FileDown size={13} />
              {isExportingPdf ? t("report.exportingPdf") : t("report.exportPdf")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecKpi({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="forge-card" style={{ padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="tabular" style={{ fontSize: 18, fontWeight: 700, color }}>
        {value}
      </div>
      <div className="tabular" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
        {sub}
      </div>
    </div>
  );
}
