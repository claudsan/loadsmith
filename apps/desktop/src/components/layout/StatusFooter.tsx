import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n } from "../../i18n";
import type { ScenarioTreeNode } from "../../types/runner-events";

function countFiles(nodes: ScenarioTreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.kind === "file") {
      count++;
    } else if (n.children) {
      count += countFiles(n.children);
    }
  }
  return count;
}

export function StatusFooter() {
  const { t } = useI18n();
  const appVersion = useRunnerStore((s) => s.appVersion);
  const sidecarInfo = useRunnerStore((s) => s.sidecarInfo);
  const runStatus = useRunnerStore((s) => s.runStatus);
  const tree = useRunnerStore((s) => s.tree);
  const runs = useRunnerStore((s) => s.runs);
  const workspaceDir = useRunnerStore((s) => s.workspaceDir);
  const ticks = useRunnerStore((s) => s.ticks);
  const zoomPercent = useRunnerStore((s) => s.zoomPercent);
  const setZoomPercent = useRunnerStore((s) => s.setZoomPercent);

  const scenarioCount = countFiles(tree);
  const folderName = workspaceDir ? workspaceDir.split(/[\\/]/).filter(Boolean).pop() : t("footer.noFolder");
  const latestTick = ticks.length > 0 ? ticks[ticks.length - 1] : null;
  const isRunning = runStatus === "running" || runStatus === "stopping";

  return (
    <footer className="status-footer">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
          <span
            className={`dot ${
              isRunning ? "dot-run" : sidecarInfo?.found ? "dot-ok" : "dot-warn"
            }`}
          />
          {isRunning
            ? t("footer.runningVus", { count: latestTick?.activeVus ?? 0 })
            : sidecarInfo?.found
              ? t("footer.engineReady")
              : t("footer.sidecarMissing")}
        </span>

        <span className="tabular">{t("footer.scenariosCount", { count: scenarioCount })}</span>
        <span className="tabular">{t("footer.runsCount", { count: runs.length })}</span>
        <span
          className="mono"
          title={workspaceDir}
          style={{
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 240,
          }}
        >
          {folderName}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button
          type="button"
          className="btn-ghost"
          title={t("footer.zoomResetTitle")}
          onClick={() => {
            void window.loadsmith.windowControls.setZoomFactor(1).then((applied) => {
              localStorage.setItem("loadsmith.zoomFactor", String(applied));
              setZoomPercent(Math.round(applied * 100));
            });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            padding: "0 4px",
            height: 20,
            fontSize: 11,
          }}
        >
          <span className="kbd">Ctrl +/-</span>
          <span>{zoomPercent === 100 ? t("footer.zoomLabel") : `${zoomPercent}%`}</span>
        </button>
        <ShortcutHint keys="Ctrl K" label={t("footer.shortcutSearch")} />
        <ShortcutHint keys="Ctrl S" label={t("footer.shortcutSave")} />
        <ShortcutHint keys="Ctrl ↵" label={t("footer.shortcutRun")} />
        <ShortcutHint keys="Esc" label={t("footer.shortcutStop")} />
        <span className="mono" style={{ color: "var(--text-secondary)", marginLeft: 4 }}>
          v{appVersion}
        </span>
      </div>
    </footer>
  );
}

function ShortcutHint({ keys, label }: { keys: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span className="kbd">{keys}</span>
      <span>{label}</span>
    </span>
  );
}
