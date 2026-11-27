import { useState } from "react";
import { useRunnerStore } from "../app/store/runnerStore";
import { ErrorSamplesPanel } from "../components/inspector/ErrorSamplesPanel";
import {
  ColumnResizer,
  readStoredNumber,
  saveStoredNumber,
} from "../components/layout/ColumnResizer";
import { RunToolbar } from "../components/runner/RunToolbar";
import { ScenarioEditor } from "../components/runner/ScenarioEditor";
import { ScenarioTree } from "../components/scenarios/ScenarioTree";
import { ForgeHeroPanel } from "../components/telemetry/ForgeHeroPanel";
import { KpiCards } from "../components/telemetry/KpiCards";
import { LatencyThroughputChart } from "../components/telemetry/LatencyThroughputChart";
import { LiveFeedColumn } from "../components/telemetry/LiveFeedColumn";
import { useI18n } from "../i18n";

const DEFAULT_LEFT_WIDTH = 268;
const DEFAULT_MIDDLE_WIDTH = 320;

export function WorkspacePage() {
  const { t } = useI18n();
  const workspaceTab = useRunnerStore((s) => s.workspaceTab);
  const ticks = useRunnerStore((s) => s.ticks);
  const errorSamples = useRunnerStore((s) => s.errorSamples);
  const stderrLogs = useRunnerStore((s) => s.stderrLogs);
  const uiNotice = useRunnerStore((s) => s.uiNotice);
  const clearNotice = useRunnerStore((s) => s.clearNotice);

  const [leftWidth, setLeftWidth] = useState(() =>
    readStoredNumber("loadsmith.col.left", DEFAULT_LEFT_WIDTH, 200, 440)
  );
  const [middleWidth, setMiddleWidth] = useState(() =>
    readStoredNumber("loadsmith.col.middle", DEFAULT_MIDDLE_WIDTH, 240, 520)
  );

  const updateLeftWidth = (next: number) => {
    setLeftWidth(next);
    saveStoredNumber("loadsmith.col.left", next);
  };

  const updateMiddleWidth = (next: number) => {
    setMiddleWidth(next);
    saveStoredNumber("loadsmith.col.middle", next);
  };

  return (
    <div
      className="forge-shell"
      style={{
        gridTemplateColumns: `${leftWidth}px 5px ${middleWidth}px 5px minmax(360px, 1fr)`,
      }}
    >
      <ScenarioTree />
      <ColumnResizer
        value={leftWidth}
        min={200}
        max={440}
        onChange={updateLeftWidth}
        onReset={() => updateLeftWidth(DEFAULT_LEFT_WIDTH)}
      />
      <LiveFeedColumn />
      <ColumnResizer
        value={middleWidth}
        min={240}
        max={520}
        onChange={updateMiddleWidth}
        onReset={() => updateMiddleWidth(DEFAULT_MIDDLE_WIDTH)}
      />

      <main className="forge-column" style={{ minWidth: 0 }}>
        <RunToolbar />

        {uiNotice && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 14px",
              background: "rgba(239, 68, 68, 0.16)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fecaca",
              fontSize: 12,
            }}
          >
            <span>{uiNotice}</span>
            <button type="button" className="btn btn-ghost" onClick={clearNotice}>
              {t("workspace.closeNotice")}
            </button>
          </div>
        )}

        {workspaceTab === "hero" && <ForgeHeroPanel />}

        {workspaceTab === "editor" && <ScenarioEditor />}

        {workspaceTab === "telemetry" && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <KpiCards />
            <LatencyThroughputChart ticks={ticks} height={240} />
            <ErrorSamplesPanel samples={errorSamples} />
          </div>
        )}

        {workspaceTab === "errors" && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <ErrorSamplesPanel samples={errorSamples} />
            <div
              style={{
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                overflow: "hidden",
              }}
            >
              <div className="panel-header">
                <span className="panel-title">{t("workspace.stderrTitle", { count: stderrLogs.length })}</span>
              </div>
              <div
                className="mono"
                style={{
                  maxHeight: 180,
                  padding: 12,
                  background: "#090d14",
                  color: "var(--text-secondary)",
                  fontSize: 11.5,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {stderrLogs.length === 0
                  ? t("workspace.stderrEmpty")
                  : stderrLogs.join("\n")}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
