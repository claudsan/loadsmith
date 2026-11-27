import YAML from "yaml";
import { create } from "zustand";
import { buildScenarioTemplate, type ScenarioTemplateId } from "../utils/scenarioTemplates";
import type {
  ErrorSampleEvent,
  MetricTickEvent,
  RunFinishedEvent,
  RunMode,
  RunnerEvent,
  ScenarioTreeNode,
  SidecarExitInfo,
  SidecarInfo,
  StoredRunDetails,
  StoredRunSummary,
} from "../../types/runner-events";

export type ActivePage = "workspace" | "comparison";
export type WorkspaceTab = "hero" | "editor" | "telemetry" | "errors";
export type RunStatus = "idle" | "running" | "stopping" | "passed" | "failed" | "stopped";

export interface RunnerState {
  activePage: ActivePage;
  workspaceTab: WorkspaceTab;
  globalSearch: string;
  selectedErrorIndex: number;
  zoomPercent: number;
  setActivePage: (page: ActivePage) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  setGlobalSearch: (q: string) => void;
  setSelectedErrorIndex: (idx: number) => void;
  setZoomPercent: (pct: number) => void;

  // Workspace & editor
  appVersion: string;
  workspaceDir: string;
  recentWorkspaces: string[];
  tree: ScenarioTreeNode[];
  selectedFilePath: string | null;
  recentScenarioPaths: string[];
  editorContent: string;
  savedContent: string;
  isDirty: boolean;
  parseError: string | null;
  isLoadingFile: boolean;
  uiNotice: string | null;
  pendingDirtyAction: { label: string; run: () => Promise<void> | void } | null;

  // Runner telemetry
  mode: RunMode;
  windowMs: number;
  runStatus: RunStatus;
  pendingRunConfirm: { mode: RunMode } | null;
  currentRunId: string | null;
  currentScenarioName: string | null;
  ticks: MetricTickEvent[];
  errorSamples: ErrorSampleEvent[];
  lastFinished: RunFinishedEvent | null;
  stderrLogs: string[];
  sidecarInfo: SidecarInfo | null;

  // SQLite History & Comparison
  runs: StoredRunSummary[];
  baseRunId: string | null;
  targetRunId: string | null;
  baseRunDetails: StoredRunDetails | null;
  targetRunDetails: StoredRunDetails | null;

  // Actions
  bootstrap: () => Promise<void>;
  selectFolder: (force?: boolean) => Promise<void>;
  openWorkspaceDir: (dirPath: string, force?: boolean) => Promise<void>;
  removeRecentWorkspace: (dirPath: string) => void;
  refreshTree: () => Promise<void>;
  openFile: (filePath: string, switchToEditor?: boolean, force?: boolean) => Promise<void>;
  updateEditorContent: (content: string) => void;
  saveCurrentFile: () => Promise<boolean>;
  createScenario: (relativePath: string, templateId?: ScenarioTemplateId) => Promise<void>;
  renameScenario: (oldFilePath: string, newRelativeName: string) => Promise<boolean>;
  duplicateScenario: (filePath: string) => Promise<void>;
  deleteScenario: (filePath: string) => Promise<void>;
  guardUnsavedChanges: (label: string, action: () => Promise<void> | void) => void;
  resolveDirtyAction: (decision: "save" | "discard" | "cancel") => Promise<void>;
  setMode: (mode: RunMode) => void;
  setWindowMs: (windowMs: number) => void;
  requestRun: (overrideMode?: RunMode) => void;
  cancelRunConfirm: () => void;
  confirmAndStartRun: () => Promise<void>;
  startRun: () => Promise<void>;
  stopRun: () => Promise<void>;
  clearLiveFeed: () => void;
  handleRunnerEvent: (event: RunnerEvent) => void;
  handleStderrLine: (line: string) => void;
  handleSidecarExit: (info: SidecarExitInfo) => void;
  refreshHistory: () => Promise<void>;
  selectComparisonRuns: (baseId: string | null, targetId: string | null) => Promise<void>;
  deleteHistoryRun: (runId: string) => Promise<void>;
  clearNotice: () => void;
}

function findFirstScenarioFile(nodes: ScenarioTreeNode[]): string | null {
  for (const node of nodes) {
    if (node.kind === "file") {
      return node.path;
    }
    if (node.children) {
      const found = findFirstScenarioFile(node.children);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function validateScenarioSyntax(filePath: string | null, content: string): string | null {
  if (!filePath || !content.trim()) {
    return null;
  }
  try {
    if (filePath.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return "Cenário JSON deve ser um objeto na raiz.";
      }
      return null;
    }
    const parsed = YAML.parse(content) as Record<string, unknown>;
    if (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) {
      return "Cenário YAML deve ser um mapeamento chave-valor na raiz.";
    }
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

function loadRecentScenarios(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem("loadsmith.recentScenarios");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecentScenario(current: string[], filePath: string): string[] {
  const next = [filePath, ...current.filter((p) => p !== filePath)].slice(0, 10);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("loadsmith.recentScenarios", JSON.stringify(next));
    } catch {
      // Ignore storage quota issues.
    }
  }
  return next;
}

function loadRecentWorkspaces(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem("loadsmith.recentWorkspaces");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentWorkspaces(list: string[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem("loadsmith.recentWorkspaces", JSON.stringify(list));
  } catch {
    // Ignore storage quota issues.
  }
}

function loadLastWorkspace(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem("loadsmith.lastWorkspace");
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

function pushRecentWorkspace(current: string[], dirPath: string): string[] {
  const normalized = dirPath.toLowerCase();
  const next = [dirPath, ...current.filter((p) => p.toLowerCase() !== normalized)].slice(0, 8);
  saveRecentWorkspaces(next);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("loadsmith.lastWorkspace", dirPath);
    } catch {
      // Ignore storage quota issues.
    }
  }
  return next;
}

export const useRunnerStore = create<RunnerState>((set, get) => ({
  activePage: "workspace",
  workspaceTab: "hero",
  globalSearch: "",
  selectedErrorIndex: 0,
  zoomPercent: 100,

  setActivePage: (page) => set({ activePage: page }),
  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  setGlobalSearch: (q) => set({ globalSearch: q }),
  setSelectedErrorIndex: (idx) => set({ selectedErrorIndex: idx }),
  setZoomPercent: (pct) => set({ zoomPercent: pct }),

  appVersion: "1.0.0",
  workspaceDir: "",
  recentWorkspaces: loadRecentWorkspaces(),
  tree: [],
  selectedFilePath: null,
  recentScenarioPaths: loadRecentScenarios(),
  editorContent: "",
  savedContent: "",
  isDirty: false,
  parseError: null,
  isLoadingFile: false,
  uiNotice: null,
  pendingDirtyAction: null,

  mode: "smoke",
  windowMs: 500,
  runStatus: "idle",
  pendingRunConfirm: null,
  currentRunId: null,
  currentScenarioName: null,
  ticks: [],
  errorSamples: [],
  lastFinished: null,
  stderrLogs: [],
  sidecarInfo: null,

  runs: [],
  baseRunId: null,
  targetRunId: null,
  baseRunDetails: null,
  targetRunDetails: null,

  clearNotice: () => set({ uiNotice: null }),

  bootstrap: async () => {
    try {
      const lastWorkspace = loadLastWorkspace();
      const resolveInitialSnapshot = async () => {
        if (lastWorkspace) {
          const exists = await window.loadsmith.workspace.checkDir(lastWorkspace).catch(() => false);
          if (exists) {
            const tree = await window.loadsmith.workspace.listFiles(lastWorkspace);
            return { rootDir: lastWorkspace, tree };
          }
        }
        return window.loadsmith.workspace.getDefault();
      };

      const [snapshot, sidecarInfo, runs, appVersion] = await Promise.all([
        resolveInitialSnapshot(),
        window.loadsmith.runner.getSidecarInfo(),
        window.loadsmith.history.listRuns(100),
        window.loadsmith.windowControls.getAppVersion().catch(() => "1.0.0"),
      ]);

      set((state) => ({
        appVersion: appVersion || "1.0.0",
        workspaceDir: snapshot.rootDir,
        recentWorkspaces: pushRecentWorkspace(state.recentWorkspaces, snapshot.rootDir),
        tree: snapshot.tree,
        sidecarInfo,
        runs,
      }));

      const firstFile = findFirstScenarioFile(snapshot.tree);
      if (firstFile) {
        await get().openFile(firstFile, false, true);
      }

      if (runs.length >= 2) {
        await get().selectComparisonRuns(runs[1].runId, runs[0].runId);
      } else if (runs.length === 1) {
        await get().selectComparisonRuns(null, runs[0].runId);
      }
    } catch (err) {
      set({ uiNotice: `Erro ao inicializar workspace: ${(err as Error).message}` });
    }
  },

  guardUnsavedChanges: (label: string, action: () => Promise<void> | void) => {
    if (!get().isDirty) {
      void action();
      return;
    }
    set({ pendingDirtyAction: { label, run: action } });
  },

  resolveDirtyAction: async (decision: "save" | "discard" | "cancel") => {
    const pending = get().pendingDirtyAction;
    if (!pending) {
      return;
    }
    if (decision === "cancel") {
      set({ pendingDirtyAction: null });
      return;
    }
    if (decision === "discard") {
      set((state) => ({
        pendingDirtyAction: null,
        editorContent: state.savedContent,
        isDirty: false,
        parseError: validateScenarioSyntax(state.selectedFilePath, state.savedContent),
      }));
      await pending.run();
      return;
    }
    const saved = await get().saveCurrentFile();
    if (!saved) {
      return;
    }
    set({ pendingDirtyAction: null });
    await pending.run();
  },

  selectFolder: async (force = false) => {
    if (!force && get().isDirty) {
      get().guardUnsavedChanges("unsaved.action.selectFolder", () => get().selectFolder(true));
      return;
    }
    const snapshot = await window.loadsmith.workspace.selectFolder();
    if (!snapshot) {
      return;
    }
    set((state) => ({
      workspaceDir: snapshot.rootDir,
      recentWorkspaces: pushRecentWorkspace(state.recentWorkspaces, snapshot.rootDir),
      tree: snapshot.tree,
      selectedFilePath: null,
      editorContent: "",
      savedContent: "",
      isDirty: false,
      parseError: null,
      uiNotice: null,
    }));
    const firstFile = findFirstScenarioFile(snapshot.tree);
    if (firstFile) {
      await get().openFile(firstFile, false, true);
    }
  },

  openWorkspaceDir: async (dirPath: string, force = false) => {
    if (!force && get().isDirty) {
      get().guardUnsavedChanges("unsaved.action.switchWorkspace", () => get().openWorkspaceDir(dirPath, true));
      return;
    }
    try {
      const tree = await window.loadsmith.workspace.listFiles(dirPath);
      set((state) => ({
        workspaceDir: dirPath,
        recentWorkspaces: pushRecentWorkspace(state.recentWorkspaces, dirPath),
        tree,
        selectedFilePath: null,
        editorContent: "",
        savedContent: "",
        isDirty: false,
        parseError: null,
        uiNotice: null,
      }));
      const firstFile = findFirstScenarioFile(tree);
      if (firstFile) {
        await get().openFile(firstFile, false, true);
      }
    } catch (err) {
      set({ uiNotice: `Falha ao abrir pasta: ${(err as Error).message}` });
    }
  },

  removeRecentWorkspace: (dirPath: string) => {
    const normalized = dirPath.toLowerCase();
    set((state) => {
      const next = state.recentWorkspaces.filter((p) => p.toLowerCase() !== normalized);
      saveRecentWorkspaces(next);
      return { recentWorkspaces: next };
    });
  },

  refreshTree: async () => {
    const { workspaceDir } = get();
    if (!workspaceDir) {
      return;
    }
    const tree = await window.loadsmith.workspace.listFiles(workspaceDir);
    set({ tree });
  },

  openFile: async (filePath: string, switchToEditor = true, force = false) => {
    const { workspaceDir, isDirty, selectedFilePath } = get();
    if (!workspaceDir) {
      return;
    }
    if (!force && isDirty && selectedFilePath && selectedFilePath !== filePath) {
      get().guardUnsavedChanges("unsaved.action.switchScenario", () => get().openFile(filePath, switchToEditor, true));
      return;
    }
    set({ isLoadingFile: true, uiNotice: null });
    try {
      const content = await window.loadsmith.workspace.readFile(workspaceDir, filePath);
      set((state) => ({
        selectedFilePath: filePath,
        recentScenarioPaths: switchToEditor
          ? pushRecentScenario(state.recentScenarioPaths, filePath)
          : state.recentScenarioPaths,
        editorContent: content,
        savedContent: content,
        isDirty: false,
        parseError: validateScenarioSyntax(filePath, content),
        isLoadingFile: false,
        workspaceTab: switchToEditor ? "editor" : state.workspaceTab,
      }));
    } catch (err) {
      set({
        isLoadingFile: false,
        uiNotice: `Falha ao abrir arquivo: ${(err as Error).message}`,
      });
    }
  },

  updateEditorContent: (content: string) => {
    const { savedContent, selectedFilePath } = get();
    set({
      editorContent: content,
      isDirty: content !== savedContent,
      parseError: validateScenarioSyntax(selectedFilePath, content),
    });
  },

  saveCurrentFile: async () => {
    const { workspaceDir, selectedFilePath, editorContent } = get();
    if (!workspaceDir || !selectedFilePath) {
      return false;
    }
    try {
      await window.loadsmith.workspace.saveFile(workspaceDir, selectedFilePath, editorContent);
      set({
        savedContent: editorContent,
        isDirty: false,
        uiNotice: null,
      });
      void get().refreshTree();
      return true;
    } catch (err) {
      set({ uiNotice: `Erro ao salvar arquivo: ${(err as Error).message}` });
      return false;
    }
  },

  createScenario: async (relativePath: string, templateId: ScenarioTemplateId = "simple-api") => {
    const { workspaceDir, isDirty } = get();
    if (!workspaceDir) {
      return;
    }
    if (isDirty) {
      get().guardUnsavedChanges("unsaved.action.createScenario", async () => {
        await get().createScenario(relativePath, templateId);
      });
      return;
    }
    const baseName = relativePath.replace(/\.(ya?ml|json)$/i, "");
    const isJson = relativePath.toLowerCase().endsWith(".json");
    const template = buildScenarioTemplate(templateId, baseName, isJson);

    try {
      const { filePath, tree } = await window.loadsmith.workspace.createFile(
        workspaceDir,
        relativePath,
        template
      );
      set({ tree, uiNotice: null, activePage: "workspace" });
      await get().openFile(filePath, true, true);
    } catch (err) {
      set({ uiNotice: `Erro ao criar cenário: ${(err as Error).message}` });
    }
  },

  renameScenario: async (oldFilePath: string, newRelativeName: string) => {
    const { workspaceDir, selectedFilePath } = get();
    if (!workspaceDir) {
      return false;
    }
    try {
      const { filePath: newPath, tree } = await window.loadsmith.workspace.renameFile(
        workspaceDir,
        oldFilePath,
        newRelativeName
      );
      set((state) => ({
        tree,
        uiNotice: null,
        selectedFilePath: selectedFilePath === oldFilePath ? newPath : state.selectedFilePath,
        recentScenarioPaths: state.recentScenarioPaths.map((p) => (p === oldFilePath ? newPath : p)),
      }));
      return true;
    } catch (err) {
      set({ uiNotice: `Erro ao renomear cenário: ${(err as Error).message}` });
      return false;
    }
  },

  duplicateScenario: async (filePath: string) => {
    const { workspaceDir } = get();
    if (!workspaceDir) {
      return;
    }
    try {
      const { filePath: duplicatedPath, tree } = await window.loadsmith.workspace.duplicateFile(
        workspaceDir,
        filePath
      );
      set({ tree, uiNotice: null });
      await get().openFile(duplicatedPath, true);
    } catch (err) {
      set({ uiNotice: `Erro ao duplicar cenário: ${(err as Error).message}` });
    }
  },

  deleteScenario: async (filePath: string) => {
    const { workspaceDir, selectedFilePath } = get();
    if (!workspaceDir) {
      return;
    }
    try {
      const { tree } = await window.loadsmith.workspace.deleteFile(workspaceDir, filePath);
      const wasSelected = selectedFilePath === filePath;
      set((state) => ({
        tree,
        uiNotice: null,
        recentScenarioPaths: state.recentScenarioPaths.filter((p) => p !== filePath),
        ...(wasSelected
          ? {
              selectedFilePath: null,
              editorContent: "",
              savedContent: "",
              isDirty: false,
              parseError: null,
            }
          : {}),
      }));

      if (wasSelected) {
        const nextFile = findFirstScenarioFile(tree);
        if (nextFile) {
          await get().openFile(nextFile, false, true);
        } else {
          set({ workspaceTab: "hero" });
        }
      }
    } catch (err) {
      set({ uiNotice: `Erro ao excluir cenário: ${(err as Error).message}` });
    }
  },

  setMode: (mode) => set({ mode }),
  setWindowMs: (windowMs) => set({ windowMs }),

  requestRun: (overrideMode) => {
    const { runStatus, selectedFilePath, parseError, sidecarInfo, mode } = get();
    if (runStatus === "running" || runStatus === "stopping") {
      return;
    }
    if (!selectedFilePath) {
      set({ uiNotice: "Selecione um arquivo de cenário antes de executar." });
      return;
    }
    if (parseError) {
      set({ uiNotice: `Corrija o erro de sintaxe antes de executar: ${parseError}` });
      return;
    }
    if (sidecarInfo !== null && !sidecarInfo.found) {
      set({ uiNotice: "Binário do motor não encontrado. Execute npm run prepare:sidecar." });
      return;
    }
    const targetMode = overrideMode ?? mode;
    set({
      mode: targetMode,
      pendingRunConfirm: { mode: targetMode },
      uiNotice: null,
    });
  },

  cancelRunConfirm: () => set({ pendingRunConfirm: null }),

  confirmAndStartRun: async () => {
    set({ pendingRunConfirm: null });
    await get().startRun();
  },

  startRun: async () => {
    const { selectedFilePath, isDirty, parseError, mode, windowMs } = get();
    if (!selectedFilePath) {
      set({ uiNotice: "Selecione um arquivo de cenário antes de executar." });
      return;
    }
    if (parseError) {
      set({ uiNotice: `Corrija o erro de sintaxe antes de executar: ${parseError}` });
      return;
    }
    if (isDirty) {
      const saved = await get().saveCurrentFile();
      if (!saved) {
        return;
      }
    }

    set((state) => ({
      activePage: "workspace",
      workspaceTab: "telemetry",
      recentScenarioPaths: pushRecentScenario(state.recentScenarioPaths, selectedFilePath),
      runStatus: "running",
      currentRunId: null,
      currentScenarioName: null,
      ticks: [],
      errorSamples: [],
      selectedErrorIndex: 0,
      lastFinished: null,
      stderrLogs: [],
      uiNotice: null,
    }));

    try {
      await window.loadsmith.runner.start({
        scenarioPath: selectedFilePath,
        mode,
        windowMs,
      });
    } catch (err) {
      set({
        runStatus: "failed",
        uiNotice: (err as Error).message,
      });
    }
  },

  stopRun: async () => {
    set({ runStatus: "stopping" });
    try {
      await window.loadsmith.runner.stop();
    } catch (err) {
      set({ uiNotice: `Falha ao interromper execução: ${(err as Error).message}` });
    }
  },

  clearLiveFeed: () => {
    const { runStatus } = get();
    if (runStatus === "running" || runStatus === "stopping") {
      return;
    }
    set({
      ticks: [],
      errorSamples: [],
      selectedErrorIndex: 0,
      lastFinished: null,
      stderrLogs: [],
      runStatus: "idle",
      currentRunId: null,
    });
  },

  handleRunnerEvent: (event: RunnerEvent) => {
    switch (event.type) {
      case "RUN_STARTED":
        set({
          runStatus: "running",
          currentRunId: event.runId,
          currentScenarioName: event.scenario,
          ticks: [],
          errorSamples: [],
          selectedErrorIndex: 0,
          lastFinished: null,
        });
        break;
      case "METRIC_TICK":
        set((state) => {
          const next = [...state.ticks, event];
          return {
            ticks: next.length > 3600 ? next.slice(next.length - 3600) : next,
          };
        });
        break;
      case "ERROR_SAMPLE":
        set((state) => ({
          errorSamples:
            state.errorSamples.length < 25
              ? [...state.errorSamples, event]
              : state.errorSamples,
        }));
        break;
      case "RUN_FINISHED":
        set((state) => ({
          lastFinished: event,
          runStatus:
            state.runStatus === "stopping"
              ? "stopped"
              : event.passedThresholds
                ? "passed"
                : "failed",
        }));
        break;
    }
  },

  handleStderrLine: (line: string) => {
    set((state) => ({
      stderrLogs: [...state.stderrLogs.slice(-199), line],
    }));
  },

  handleSidecarExit: (info: SidecarExitInfo) => {
    set((state) => {
      if (state.runStatus === "running" || state.runStatus === "stopping") {
        return {
          runStatus: info.stoppedByUser ? "stopped" : info.code === 0 ? "passed" : "failed",
        };
      }
      return {};
    });
    void get().refreshHistory();
  },

  refreshHistory: async () => {
    const runs = await window.loadsmith.history.listRuns(100);
    const { baseRunId, targetRunId } = get();
    set({ runs });

    const stillHasBase = baseRunId && runs.some((r) => r.runId === baseRunId);
    const stillHasTarget = targetRunId && runs.some((r) => r.runId === targetRunId);
    const nextTarget = stillHasTarget ? targetRunId : (runs[0]?.runId ?? null);
    const nextBase = stillHasBase
      ? baseRunId
      : (runs.find((r) => r.runId !== nextTarget)?.runId ?? null);

    await get().selectComparisonRuns(nextBase, nextTarget);
  },

  selectComparisonRuns: async (baseId: string | null, targetId: string | null) => {
    set({ baseRunId: baseId, targetRunId: targetId });
    const [baseRunDetails, targetRunDetails] = await Promise.all([
      baseId ? window.loadsmith.history.getRunDetails(baseId) : Promise.resolve(null),
      targetId ? window.loadsmith.history.getRunDetails(targetId) : Promise.resolve(null),
    ]);
    set({ baseRunDetails, targetRunDetails });
  },

  deleteHistoryRun: async (runId: string) => {
    await window.loadsmith.history.deleteRun(runId);
    await get().refreshHistory();
  },
}));
