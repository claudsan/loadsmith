import { useEffect, useMemo } from "react";
import { AlertTriangle, FileSpreadsheet, Flame, Globe, KeyRound, Play, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import { parseScenarioText } from "../../app/utils/scenarioCodec";
import { useI18n } from "../../i18n";

function isLocalTargetUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

export function ConfirmRunModal() {
  const { t } = useI18n();
  const pendingRunConfirm = useRunnerStore((s) => s.pendingRunConfirm);
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const editorContent = useRunnerStore((s) => s.editorContent);
  const isDirty = useRunnerStore((s) => s.isDirty);
  const windowMs = useRunnerStore((s) => s.windowMs);
  const cancelRunConfirm = useRunnerStore((s) => s.cancelRunConfirm);
  const confirmAndStartRun = useRunnerStore((s) => s.confirmAndStartRun);

  const isJson = Boolean(selectedFilePath?.toLowerCase().endsWith(".json"));
  const parsed = useMemo(
    () => (pendingRunConfirm ? parseScenarioText(editorContent, isJson).scenario : null),
    [pendingRunConfirm, editorContent, isJson]
  );

  useEffect(() => {
    if (!pendingRunConfirm) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelRunConfirm();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        void confirmAndStartRun();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [pendingRunConfirm, cancelRunConfirm, confirmAndStartRun]);

  if (!pendingRunConfirm) {
    return null;
  }

  const runMode = pendingRunConfirm.mode;
  const fileName = selectedFilePath?.split(/[\\/]/).pop() || "cenário";
  const baseUrl = parsed?.baseUrl || t("confirmRun.undefined");
  const isLocal = isLocalTargetUrl(baseUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("confirmRun.aria")}
      onClick={cancelRunConfirm}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(5, 8, 14, 0.78)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 94vw)",
          borderRadius: 12,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-chrome)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "#0f1520",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {runMode === "load" ? (
              <Flame size={17} color="#0ea5e9" />
            ) : (
              <Play size={16} color="#10b981" />
            )}
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {t("confirmRun.title", {
                mode: runMode === "load" ? t("confirmRun.loadTitle") : t("confirmRun.smokeTitle"),
              })}
            </span>
          </div>

          <button type="button" className="btn btn-ghost" onClick={cancelRunConfirm} title={t("curl.closeTitle")}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{parsed?.name || fileName}</div>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {fileName}
              </div>
            </div>
            <span className={`micro-badge ${runMode === "load" ? "micro-yaml" : "micro-live"}`}>
              {runMode === "load" ? t("confirmRun.badgeLoad") : t("confirmRun.badgeSmoke")}
            </span>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 9,
              border: `1px solid ${isLocal ? "var(--border)" : "rgba(245, 158, 11, 0.45)"}`,
              background: isLocal ? "#0d121b" : "rgba(245, 158, 11, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
                <Globe size={12} color="#38bdf8" />
                {t("confirmRun.targetUrl")}
              </span>
              {!isLocal && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#fbbf24", fontWeight: 600 }}>
                  <AlertTriangle size={12} />
                  {t("confirmRun.externalWarn")}
                </span>
              )}
            </div>
            <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#e2e8f0", wordBreak: "break-all" }}>
              {baseUrl}
            </div>
          </div>

          <div
            className="mono tabular"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "#0d121b",
              fontSize: 11.5,
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>{t("confirmRun.steps")} </span>
              <strong>{parsed?.steps.length ?? "?"}</strong>
            </div>
            {runMode === "load" ? (
              <>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>{t("confirmRun.vus")} </span>
                  <strong>{parsed?.loadVus || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>{t("confirmRun.duration")} </span>
                  <strong>{parsed?.loadDuration || "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>{t("confirmRun.rampWindow")} </span>
                  <strong>
                    {parsed?.loadRampUp || "0s"} · {windowMs}ms
                  </strong>
                </div>
              </>
            ) : (
              <div>
                <span style={{ color: "var(--text-muted)" }}>{t("confirmRun.iterations")} </span>
                <strong>{parsed?.smokeIterations || "1"}</strong>
              </div>
            )}
          </div>

          {parsed?.dataFilePath && (
            <div
              className="mono"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "#0d121b",
                fontSize: 11.5,
                color: "#34d399",
              }}
            >
              <FileSpreadsheet size={13} />
              <span>
                {t("confirmRun.csvLinked", {
                  path: parsed.dataFilePath,
                  mode: parsed.dataFileMode,
                })}
              </span>
            </div>
          )}

          {(parsed?.insecureSkipVerify || parsed?.envFile) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {parsed.insecureSkipVerify && (
                <span
                  className="micro-badge micro-method-post"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <ShieldAlert size={11} />
                  {t("confirmRun.insecureTls")}
                </span>
              )}
              {parsed.envFile && (
                <span
                  className="micro-badge micro-slate mono"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <KeyRound size={11} />
                  .env: {parsed.envFile}
                </span>
              )}
            </div>
          )}

          {(parsed?.thresholdP95Ms || parsed?.thresholdMaxErrorRatePct) && (
            <div
              className="mono"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              <ShieldCheck size={13} color="#10b981" />
              <span>
                SLA: {parsed.thresholdP95Ms ? `p95 ≤ ${parsed.thresholdP95Ms}ms` : ""}
                {parsed.thresholdP95Ms && parsed.thresholdMaxErrorRatePct ? " · " : ""}
                {parsed.thresholdMaxErrorRatePct ? `err ≤ ${parsed.thresholdMaxErrorRatePct}%` : ""}
              </span>
            </div>
          )}

          {isDirty && (
            <div
              style={{
                padding: "7px 10px",
                borderRadius: 7,
                background: "rgba(14, 165, 233, 0.1)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                color: "#7dd3fc",
                fontSize: 11.5,
              }}
            >
              {t("confirmRun.dirtyNotice")}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "11px 16px",
            borderTop: "1px solid var(--border)",
            background: "#0f1520",
          }}
        >
          <button type="button" className="btn" onClick={cancelRunConfirm}>
            {t("confirmRun.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void confirmAndStartRun()}>
            <Play size={12} />
            {t("confirmRun.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
