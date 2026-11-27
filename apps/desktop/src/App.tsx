import { useEffect, useRef } from "react";
import {
  Activity,
  GitCompareArrows,
  Minus,
  Play,
  Search,
  Square,
  X,
} from "lucide-react";
import { useRunnerStream } from "./app/hooks/useRunnerStream";
import { useRunnerStore } from "./app/store/runnerStore";
import { LoadSmithLogoFull } from "./components/brand/LoadSmithLogo";
import { LanguageToggle } from "./components/layout/LanguageToggle";
import { StatusFooter } from "./components/layout/StatusFooter";
import { UnsavedChangesModal } from "./components/layout/UnsavedChangesModal";
import { WorkspaceMenu } from "./components/layout/WorkspaceMenu";
import { ConfirmRunModal } from "./components/runner/ConfirmRunModal";
import { useI18n } from "./i18n";
import { ComparisonPage } from "./pages/ComparisonPage";
import { WorkspacePage } from "./pages/WorkspacePage";

export function App() {
  const { t } = useI18n();
  const activePage = useRunnerStore((s) => s.activePage);
  const setActivePage = useRunnerStore((s) => s.setActivePage);
  const setWorkspaceTab = useRunnerStore((s) => s.setWorkspaceTab);
  const globalSearch = useRunnerStore((s) => s.globalSearch);
  const setGlobalSearch = useRunnerStore((s) => s.setGlobalSearch);
  const sidecarInfo = useRunnerStore((s) => s.sidecarInfo);
  const runStatus = useRunnerStore((s) => s.runStatus);
  const ticks = useRunnerStore((s) => s.ticks);
  const saveCurrentFile = useRunnerStore((s) => s.saveCurrentFile);
  const requestRun = useRunnerStore((s) => s.requestRun);
  const stopRun = useRunnerStore((s) => s.stopRun);
  const bootstrap = useRunnerStore((s) => s.bootstrap);
  const setZoomPercent = useRunnerStore((s) => s.setZoomPercent);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useRunnerStream();

  useEffect(() => {
    void bootstrap();
    const unsubClose = window.loadsmith.windowControls.onCloseRequested(() => {
      useRunnerStore.getState().guardUnsavedChanges("unsaved.action.closeApp", () => {
        void window.loadsmith.windowControls.confirmClose();
      });
    });
    const savedRaw = localStorage.getItem("loadsmith.zoomFactor");
    if (savedRaw) {
      const saved = Number(savedRaw);
      if (Number.isFinite(saved) && saved >= 0.75 && saved <= 1.6) {
        void window.loadsmith.windowControls.setZoomFactor(saved).then((applied) => {
          setZoomPercent(Math.round(applied * 100));
        });
      }
    }
    return () => {
      unsubClose();
    };
  }, [bootstrap, setZoomPercent]);

  useEffect(() => {
    const applyZoom = async (deltaOrReset: number | "reset") => {
      const current = await window.loadsmith.windowControls.getZoomFactor();
      const target = deltaOrReset === "reset" ? 1 : current + deltaOrReset;
      const applied = await window.loadsmith.windowControls.setZoomFactor(target);
      localStorage.setItem("loadsmith.zoomFactor", String(applied));
      setZoomPercent(Math.round(applied * 100));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (
          e.key === "+" ||
          e.key === "=" ||
          e.code === "Equal" ||
          e.code === "NumpadAdd"
        ) {
          e.preventDefault();
          void applyZoom(0.1);
          return;
        }
        if (
          e.key === "-" ||
          e.key === "_" ||
          e.code === "Minus" ||
          e.code === "NumpadSubtract"
        ) {
          e.preventDefault();
          void applyZoom(-0.1);
          return;
        }
        if (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0") {
          e.preventDefault();
          void applyZoom("reset");
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveCurrentFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const state = useRunnerStore.getState();
        if (state.pendingRunConfirm) {
          return;
        }
        if (state.runStatus !== "running" && state.runStatus !== "stopping") {
          requestRun();
        }
        return;
      }
      if (e.key === "Escape") {
        const status = useRunnerStore.getState().runStatus;
        if (status === "running") {
          void stopRun();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestRun, saveCurrentFile, setZoomPercent, stopRun]);

  const isRunning = runStatus === "running" || runStatus === "stopping";
  const latestTick = ticks.length > 0 ? ticks[ticks.length - 1] : null;

  return (
    <div className="app-shell">
      <header className="top-nav titlebar-drag">
        <div className="brand titlebar-nodrag">
          <button
            type="button"
            className="brand-home-btn"
            title={t("nav.brandHomeTitle")}
            onClick={() => {
              setActivePage("workspace");
              setWorkspaceTab("hero");
            }}
          >
            <LoadSmithLogoFull height={36} />
          </button>
          <span className="nav-divider" />
          <WorkspaceMenu />
        </div>

        <div className="global-search titlebar-nodrag">
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            className="global-search-input"
            placeholder={t("nav.searchPlaceholder")}
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          <span className="global-search-kbd">Ctrl K</span>
        </div>

        <div className="titlebar-nodrag" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <nav className="nav-tabs">
            <button
              type="button"
              className={`nav-tab ${activePage === "workspace" ? "active" : ""}`}
              onClick={() => setActivePage("workspace")}
            >
              <Activity size={13} />
              {t("nav.workspace")}
            </button>
            <button
              type="button"
              className={`nav-tab ${activePage === "comparison" ? "active" : ""}`}
              onClick={() => setActivePage("comparison")}
            >
              <GitCompareArrows size={13} />
              {t("nav.comparison")}
            </button>
          </nav>

          <div
            className={`engine-pill ${sidecarInfo?.found ? "" : "warn"}`}
            title={sidecarInfo?.binaryPath ?? t("nav.sidecarMissing")}
          >
            <span className={`dot ${isRunning ? "dot-run" : sidecarInfo?.found ? "dot-ok" : "dot-warn"}`} />
            <span className="tabular">
              {isRunning
                ? t("nav.activeVus", { count: latestTick?.activeVus ?? 0 })
                : sidecarInfo?.found
                  ? t("nav.engineReady")
                  : t("nav.sidecarMissing")}
            </span>
          </div>

          {isRunning ? (
            <button
              type="button"
              className="btn btn-danger"
              disabled={runStatus === "stopping"}
              onClick={() => void stopRun()}
            >
              <Square size={12} />
              {t("nav.stop")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={sidecarInfo !== null && !sidecarInfo.found}
              onClick={() => requestRun()}
            >
              <Play size={12} />
              {t("nav.run")}
            </button>
          )}

          <LanguageToggle />

          <div className="window-controls">
            <button
              type="button"
              className="win-btn"
              title={t("nav.minimize")}
              onClick={() => void window.loadsmith.windowControls.minimize()}
            >
              <Minus size={13} />
            </button>
            <button
              type="button"
              className="win-btn"
              title={t("nav.maximizeRestore")}
              onClick={() => void window.loadsmith.windowControls.toggleMaximize()}
            >
              <Square size={11} />
            </button>
            <button
              type="button"
              className="win-btn close"
              title={t("nav.close")}
              onClick={() => void window.loadsmith.windowControls.close()}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </header>

      {activePage === "workspace" ? <WorkspacePage /> : <ComparisonPage />}

      <ConfirmRunModal />
      <UnsavedChangesModal />

      <StatusFooter />
    </div>
  );
}
export default App;
