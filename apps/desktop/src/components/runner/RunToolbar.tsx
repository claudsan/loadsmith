import { Activity, AlertOctagon, FileCode2, Play, Save, Sparkles, Square } from "lucide-react";
import { useRunnerStore, type RunStatus, type WorkspaceTab } from "../../app/store/runnerStore";
import { useI18n, type TranslationKey } from "../../i18n";

const STATUS_META: Record<RunStatus, { labelKey: TranslationKey; badgeClass: string; dotClass: string }> = {
  idle: { labelKey: "status.idle", badgeClass: "badge-idle", dotClass: "" },
  running: { labelKey: "status.running", badgeClass: "badge-running", dotClass: "dot-run" },
  stopping: { labelKey: "status.stopping", badgeClass: "badge-stopped", dotClass: "dot-warn" },
  passed: { labelKey: "status.passed", badgeClass: "badge-passed", dotClass: "dot-ok" },
  failed: { labelKey: "status.failed", badgeClass: "badge-failed", dotClass: "dot-err" },
  stopped: { labelKey: "status.stopped", badgeClass: "badge-stopped", dotClass: "dot-warn" },
};

export function RunToolbar() {
  const { t } = useI18n();
  const workspaceTab = useRunnerStore((s) => s.workspaceTab);
  const setWorkspaceTab = useRunnerStore((s) => s.setWorkspaceTab);
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const isDirty = useRunnerStore((s) => s.isDirty);
  const parseError = useRunnerStore((s) => s.parseError);
  const runStatus = useRunnerStore((s) => s.runStatus);
  const sidecarInfo = useRunnerStore((s) => s.sidecarInfo);
  const errorSamples = useRunnerStore((s) => s.errorSamples);
  const ticks = useRunnerStore((s) => s.ticks);
  const saveCurrentFile = useRunnerStore((s) => s.saveCurrentFile);
  const requestRun = useRunnerStore((s) => s.requestRun);
  const stopRun = useRunnerStore((s) => s.stopRun);

  const isRunning = runStatus === "running" || runStatus === "stopping";
  const statusInfo = STATUS_META[runStatus];

  const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: "hero", label: t("toolbar.tabHero"), icon: <Sparkles size={13} /> },
    { id: "editor", label: isDirty ? t("toolbar.tabEditorDirty") : t("toolbar.tabEditor"), icon: <FileCode2 size={13} /> },
    { id: "telemetry", label: t("toolbar.tabTelemetry", { count: ticks.length }), icon: <Activity size={13} /> },
    { id: "errors", label: t("toolbar.tabErrors", { count: errorSamples.length }), icon: <AlertOctagon size={13} /> },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "7px 12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-chrome)",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {tabs.map((tab) => {
          const active = workspaceTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setWorkspaceTab(tab.id)}
              className={`nav-tab ${active ? "active" : ""}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span className={`badge ${statusInfo.badgeClass}`}>
          {statusInfo.dotClass && <span className={`dot ${statusInfo.dotClass}`} />}
          {t(statusInfo.labelKey)}
        </span>

        <button
          type="button"
          className="btn"
          disabled={!selectedFilePath || !isDirty || isRunning}
          onClick={() => void saveCurrentFile()}
          title={t("toolbar.saveTitle")}
        >
          <Save size={13} />
          {t("toolbar.save")}
        </button>

        {isRunning ? (
          <button
            type="button"
            className="btn btn-danger"
            disabled={runStatus === "stopping"}
            onClick={() => void stopRun()}
          >
            <Square size={12} />
            {runStatus === "stopping" ? t("toolbar.stopping") : t("toolbar.stop")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedFilePath || Boolean(parseError) || (sidecarInfo !== null && !sidecarInfo.found)}
            onClick={() => requestRun()}
          >
            <Play size={12} />
            {t("toolbar.run")}
          </button>
        )}
      </div>
    </div>
  );
}
