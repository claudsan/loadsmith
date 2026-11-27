import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  RunnerEvent,
  SidecarExitInfo,
  StartRunRequest,
} from "../../src/types/runner-events";
import { HistoryDb } from "./historyDb";
import { SidecarManager } from "./sidecarManager";
import {
  createScenarioFile,
  deleteScenarioFile,
  duplicateScenarioFile,
  ensureStarterScenario,
  inspectEnvFile,
  isExistingDirectory,
  listScenarioTree,
  previewCsvFile,
  readCsvRecords,
  readScenarioFile,
  renameScenarioFile,
  saveScenarioFile,
  toScenarioRelativeCsvPath,
} from "./workspaceFiles";

let mainWindow: BrowserWindow | null = null;
let historyDb: HistoryDb | null = null;
let sidecarManager: SidecarManager | null = null;
let pendingUserStop = false;
let allowWindowClose = false;

function getAppRoot(): string {
  // In compiled dist-electron/main/index.js, "../.." resolves to apps/desktop.
  return path.resolve(__dirname, "..", "..");
}

function resolveDefaultWorkspaceDir(): string {
  if (!app.isPackaged) {
    const repoExamples = path.resolve(getAppRoot(), "..", "..", "examples");
    if (fs.existsSync(repoExamples)) {
      return repoExamples;
    }
  }
  const userWorkspace = path.join(app.getPath("documents"), "LoadSmith");
  ensureStarterScenario(userWorkspace);
  return userWorkspace;
}

function sendToRenderer(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function resolveAppIconPath(): string | undefined {
  const iconName = process.platform === "win32" ? "icon.ico" : "icon.png";
  const candidates = [
    path.join(process.resourcesPath, iconName),
    path.join(getAppRoot(), "resources", iconName),
    path.join(getAppRoot(), "resources", "icon.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function createWindow(): BrowserWindow {
  allowWindowClose = false;

  const win = new BrowserWindow({
    width: 1460,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    frame: false,
    backgroundColor: "#0b0f16",
    title: "LoadSmith",
    icon: resolveAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on("close", (event) => {
    if (!allowWindowClose && !win.isDestroyed()) {
      event.preventDefault();
      sendToRenderer("window:closeRequested", null);
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? "http://127.0.0.1:5173" : "");
  if (devUrl && process.env.LOADSMITH_USE_DIST !== "1") {
    void win.loadURL(devUrl).catch(() => {
      const distHtml = path.join(getAppRoot(), "dist", "index.html");
      if (fs.existsSync(distHtml)) {
        void win.loadFile(distHtml);
      }
    });
  } else {
    void win.loadFile(path.join(getAppRoot(), "dist", "index.html"));
  }

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle("workspace:getDefault", () => {
    const rootDir = resolveDefaultWorkspaceDir();
    return {
      rootDir,
      tree: listScenarioTree(rootDir),
    };
  });

  ipcMain.handle("workspace:selectFolder", async () => {
    const openOpts: Electron.OpenDialogOptions = {
      title: "Selecionar pasta de cenários do projeto",
      properties: ["openDirectory", "createDirectory"],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, openOpts)
      : await dialog.showOpenDialog(openOpts);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const rootDir = path.resolve(result.filePaths[0]);
    return {
      rootDir,
      tree: listScenarioTree(rootDir),
    };
  });

  ipcMain.handle("workspace:checkDir", (_event, dirPath: string) => {
    return isExistingDirectory(dirPath);
  });

  ipcMain.handle("workspace:listFiles", (_event, rootDir: string) => {
    return listScenarioTree(rootDir);
  });

  ipcMain.handle("workspace:readFile", (_event, rootDir: string, filePath: string) => {
    return readScenarioFile(rootDir, filePath);
  });

  ipcMain.handle(
    "workspace:saveFile",
    (_event, rootDir: string, filePath: string, content: string) => {
      saveScenarioFile(rootDir, filePath, content);
    }
  );

  ipcMain.handle(
    "workspace:createFile",
    (_event, rootDir: string, relativePath: string, content: string) => {
      const filePath = createScenarioFile(rootDir, relativePath, content);
      return {
        filePath,
        tree: listScenarioTree(rootDir),
      };
    }
  );

  ipcMain.handle(
    "workspace:renameFile",
    (_event, rootDir: string, oldFilePath: string, newRelativeName: string) => {
      const filePath = renameScenarioFile(rootDir, oldFilePath, newRelativeName);
      return {
        filePath,
        tree: listScenarioTree(rootDir),
      };
    }
  );

  ipcMain.handle("workspace:duplicateFile", (_event, rootDir: string, filePath: string) => {
    const duplicatedPath = duplicateScenarioFile(rootDir, filePath);
    return {
      filePath: duplicatedPath,
      tree: listScenarioTree(rootDir),
    };
  });

  ipcMain.handle("workspace:deleteFile", (_event, rootDir: string, filePath: string) => {
    deleteScenarioFile(rootDir, filePath);
    return {
      tree: listScenarioTree(rootDir),
    };
  });

  ipcMain.handle(
    "workspace:pickCsvFile",
    async (_event, rootDir: string, scenarioPath: string | null) => {
      const defaultPath = scenarioPath ? path.dirname(scenarioPath) : rootDir;
      const openOpts: Electron.OpenDialogOptions = {
        title: "Selecionar arquivo CSV de variáveis",
        defaultPath,
        filters: [
          { name: "Arquivos CSV", extensions: ["csv", "tsv", "txt"] },
          { name: "Todos os arquivos", extensions: ["*"] },
        ],
        properties: ["openFile"],
      };
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, openOpts)
        : await dialog.showOpenDialog(openOpts);
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      const chosen = path.resolve(result.filePaths[0]);
      const relativePath = toScenarioRelativeCsvPath(scenarioPath, chosen);
      return {
        relativePath,
        preview: previewCsvFile(scenarioPath, relativePath),
      };
    }
  );

  ipcMain.handle(
    "workspace:previewCsv",
    (_event, scenarioPath: string | null, csvPath: string, delimiter?: string) => {
      return previewCsvFile(scenarioPath, csvPath, delimiter);
    }
  );

  ipcMain.handle(
    "workspace:readCsvRecords",
    (
      _event,
      scenarioPath: string | null,
      csvPath: string,
      delimiter?: string,
      offset?: number,
      limit?: number,
      search?: string
    ) => {
      return readCsvRecords(scenarioPath, csvPath, delimiter, offset, limit, search);
    }
  );

  ipcMain.handle(
    "workspace:pickEnvFile",
    async (_event, rootDir: string, scenarioPath: string | null) => {
      const defaultPath = scenarioPath ? path.dirname(scenarioPath) : rootDir;
      const openOpts: Electron.OpenDialogOptions = {
        title: "Selecionar arquivo .env de segredos",
        defaultPath,
        filters: [{ name: "Arquivos de Ambiente (.env)", extensions: ["*"] }],
        properties: ["openFile"],
      };
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, openOpts)
        : await dialog.showOpenDialog(openOpts);
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      const chosen = path.resolve(result.filePaths[0]);
      const relativePath = toScenarioRelativeCsvPath(scenarioPath, chosen);
      return {
        relativePath,
        preview: inspectEnvFile(scenarioPath, relativePath),
      };
    }
  );

  ipcMain.handle(
    "workspace:inspectEnv",
    (_event, scenarioPath: string | null, envFilePath?: string) => {
      return inspectEnvFile(scenarioPath, envFilePath ?? "");
    }
  );

  ipcMain.handle(
    "workspace:exportReport",
    async (_event, defaultFileName: string, content: string, format: "html" | "md") => {
      const ext = format === "md" ? "md" : "html";
      const filters =
        ext === "md"
          ? [{ name: "Markdown", extensions: ["md"] }]
          : [{ name: "Relatório HTML (Imprimir / PDF)", extensions: ["html"] }];
      const saveOpts: Electron.SaveDialogOptions = {
        title: "Salvar Relatório Executivo",
        defaultPath: path.join(app.getPath("documents"), `${defaultFileName}.${ext}`),
        filters,
      };
      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, saveOpts)
        : await dialog.showSaveDialog(saveOpts);
      if (result.canceled || !result.filePath) {
        return null;
      }
      fs.writeFileSync(result.filePath, content, "utf8");
      return { filePath: result.filePath };
    }
  );

  ipcMain.handle(
    "workspace:exportReportPdf",
    async (_event, defaultFileName: string, htmlContent: string) => {
      const saveOpts: Electron.SaveDialogOptions = {
        title: "Salvar Relatório Executivo em PDF",
        defaultPath: path.join(app.getPath("documents"), `${defaultFileName}.pdf`),
        filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
      };
      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, saveOpts)
        : await dialog.showSaveDialog(saveOpts);
      if (result.canceled || !result.filePath) {
        return null;
      }

      const tempHtmlPath = path.join(
        os.tmpdir(),
        `loadsmith-exec-report-${Date.now()}-${Math.random().toString(16).slice(2)}.html`
      );
      const pdfWin = new BrowserWindow({
        show: false,
        width: 1024,
        height: 1400,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      try {
        fs.writeFileSync(tempHtmlPath, htmlContent, "utf8");
        await pdfWin.loadFile(tempHtmlPath);
        const pdfBuffer = await pdfWin.webContents.printToPDF({
          printBackground: true,
          pageSize: "A4",
          margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        });
        fs.writeFileSync(result.filePath, pdfBuffer);
        return { filePath: result.filePath };
      } finally {
        if (!pdfWin.isDestroyed()) {
          pdfWin.destroy();
        }
        fs.rmSync(tempHtmlPath, { force: true });
      }
    }
  );

  ipcMain.handle("workspace:openExternalPath", async (_event, filePath: string) => {
    if (filePath && fs.existsSync(filePath)) {
      await shell.openPath(filePath);
    }
  });

  ipcMain.handle("runner:getSidecarInfo", () => {
    return sidecarManager?.getSidecarInfo() ?? {
      found: false,
      binaryPath: null,
      platform: process.platform,
    };
  });

  ipcMain.handle("runner:start", (_event, req: StartRunRequest) => {
    if (!sidecarManager) {
      throw new Error("SidecarManager não inicializado.");
    }
    pendingUserStop = false;
    sidecarManager.start(req);
    return { started: true };
  });

  ipcMain.handle("runner:stop", () => {
    if (!sidecarManager) {
      return { stopped: false };
    }
    pendingUserStop = true;
    const stopped = sidecarManager.stop();
    if (!stopped) {
      pendingUserStop = false;
    }
    return { stopped };
  });

  ipcMain.handle("history:listRuns", (_event, limit?: number) => {
    return historyDb?.listRuns(limit) ?? [];
  });

  ipcMain.handle("history:getRunDetails", (_event, runId: string) => {
    return historyDb?.getRunDetails(runId) ?? null;
  });

  ipcMain.handle("history:deleteRun", (_event, runId: string) => {
    historyDb?.deleteRun(runId);
  });

  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:toggleMaximize", () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });

  ipcMain.handle("window:confirmClose", () => {
    allowWindowClose = true;
    mainWindow?.close();
  });

  ipcMain.handle("window:getAppVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("window:setZoomFactor", (_event, factor: number) => {
    const safe = Math.min(1.6, Math.max(0.75, Number.isFinite(factor) ? factor : 1));
    const rounded = Math.round(safe * 100) / 100;
    mainWindow?.webContents.setZoomFactor(rounded);
    return rounded;
  });

  ipcMain.handle("window:getZoomFactor", () => {
    return mainWindow?.webContents.getZoomFactor() ?? 1;
  });

  ipcMain.handle("window:getSystemLocales", () => {
    const preferred =
      typeof app.getPreferredSystemLanguages === "function"
        ? app.getPreferredSystemLanguages()
        : [];
    const systemLocale =
      typeof app.getSystemLocale === "function" ? app.getSystemLocale() : "";
    const appLocale = app.getLocale();
    return [...preferred, systemLocale, appLocale].filter(Boolean);
  });
}

async function bootstrap(): Promise<void> {
  const dbPath = path.join(app.getPath("userData"), "loadsmith-history.sqlite");
  historyDb = new HistoryDb(dbPath);
  await historyDb.init();

  const searchRoots = [process.resourcesPath, getAppRoot()];
  sidecarManager = new SidecarManager(searchRoots, {
    onEvent: (event: RunnerEvent, scenarioPath: string) => {
      if (historyDb) {
        switch (event.type) {
          case "RUN_STARTED":
            historyDb.recordRunStarted(event, scenarioPath);
            break;
          case "METRIC_TICK":
            historyDb.recordMetricTick(event);
            break;
          case "ERROR_SAMPLE":
            historyDb.recordErrorSample(event);
            break;
          case "RUN_FINISHED":
            historyDb.recordRunFinished(event, pendingUserStop);
            break;
        }
      }
      sendToRenderer("runner:event", event);
    },
    onStderr: (line: string) => {
      sendToRenderer("runner:stderr", line);
    },
    onExit: (info: SidecarExitInfo) => {
      if (historyDb && info.runId) {
        historyDb.markInterrupted(info.runId, info.stoppedByUser ? "stopped" : "failed");
      }
      pendingUserStop = false;
      sendToRenderer("runner:exit", info);
    },
  });

  registerIpcHandlers();
  mainWindow = createWindow();
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.loadsmith.desktop");
}

app.whenReady().then(() => {
  void bootstrap();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on("before-quit", () => {
  sidecarManager?.dispose();
  historyDb?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
