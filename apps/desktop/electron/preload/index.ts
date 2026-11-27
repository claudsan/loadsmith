import { contextBridge, ipcRenderer } from "electron";
import type {
  LoadsmithBridgeApi,
  RunnerEvent,
  SidecarExitInfo,
  StartRunRequest,
} from "../../src/types/runner-events";

const api: LoadsmithBridgeApi = {
  workspace: {
    getDefault: () => ipcRenderer.invoke("workspace:getDefault"),
    selectFolder: () => ipcRenderer.invoke("workspace:selectFolder"),
    checkDir: (dirPath: string) => ipcRenderer.invoke("workspace:checkDir", dirPath),
    listFiles: (rootDir: string) => ipcRenderer.invoke("workspace:listFiles", rootDir),
    readFile: (rootDir: string, filePath: string) =>
      ipcRenderer.invoke("workspace:readFile", rootDir, filePath),
    saveFile: (rootDir: string, filePath: string, content: string) =>
      ipcRenderer.invoke("workspace:saveFile", rootDir, filePath, content),
    createFile: (rootDir: string, relativePath: string, content: string) =>
      ipcRenderer.invoke("workspace:createFile", rootDir, relativePath, content),
    renameFile: (rootDir: string, oldFilePath: string, newRelativeName: string) =>
      ipcRenderer.invoke("workspace:renameFile", rootDir, oldFilePath, newRelativeName),
    duplicateFile: (rootDir: string, filePath: string) =>
      ipcRenderer.invoke("workspace:duplicateFile", rootDir, filePath),
    deleteFile: (rootDir: string, filePath: string) =>
      ipcRenderer.invoke("workspace:deleteFile", rootDir, filePath),
    pickCsvFile: (rootDir: string, scenarioPath: string | null) =>
      ipcRenderer.invoke("workspace:pickCsvFile", rootDir, scenarioPath),
    previewCsv: (scenarioPath: string | null, csvPath: string, delimiter?: string) =>
      ipcRenderer.invoke("workspace:previewCsv", scenarioPath, csvPath, delimiter),
    readCsvRecords: (
      scenarioPath: string | null,
      csvPath: string,
      delimiter?: string,
      offset?: number,
      limit?: number,
      search?: string
    ) =>
      ipcRenderer.invoke(
        "workspace:readCsvRecords",
        scenarioPath,
        csvPath,
        delimiter,
        offset,
        limit,
        search
      ),
    pickEnvFile: (rootDir: string, scenarioPath: string | null) =>
      ipcRenderer.invoke("workspace:pickEnvFile", rootDir, scenarioPath),
    inspectEnv: (scenarioPath: string | null, envFilePath?: string) =>
      ipcRenderer.invoke("workspace:inspectEnv", scenarioPath, envFilePath),
    exportReport: (defaultFileName: string, content: string, format: "html" | "md") =>
      ipcRenderer.invoke("workspace:exportReport", defaultFileName, content, format),
    exportReportPdf: (defaultFileName: string, htmlContent: string) =>
      ipcRenderer.invoke("workspace:exportReportPdf", defaultFileName, htmlContent),
    openExternalPath: (filePath: string) =>
      ipcRenderer.invoke("workspace:openExternalPath", filePath),
  },
  runner: {
    getSidecarInfo: () => ipcRenderer.invoke("runner:getSidecarInfo"),
    start: (req: StartRunRequest) => ipcRenderer.invoke("runner:start", req),
    stop: () => ipcRenderer.invoke("runner:stop"),
    onEvent: (cb: (event: RunnerEvent) => void) => {
      const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: RunnerEvent) => {
        cb(payload);
      };
      ipcRenderer.on("runner:event", listener);
      return () => ipcRenderer.removeListener("runner:event", listener);
    },
    onStderr: (cb: (line: string) => void) => {
      const listener = (_ipcEvent: Electron.IpcRendererEvent, line: string) => {
        cb(line);
      };
      ipcRenderer.on("runner:stderr", listener);
      return () => ipcRenderer.removeListener("runner:stderr", listener);
    },
    onExit: (cb: (info: SidecarExitInfo) => void) => {
      const listener = (_ipcEvent: Electron.IpcRendererEvent, info: SidecarExitInfo) => {
        cb(info);
      };
      ipcRenderer.on("runner:exit", listener);
      return () => ipcRenderer.removeListener("runner:exit", listener);
    },
  },
  history: {
    listRuns: (limit?: number) => ipcRenderer.invoke("history:listRuns", limit),
    getRunDetails: (runId: string) => ipcRenderer.invoke("history:getRunDetails", runId),
    deleteRun: (runId: string) => ipcRenderer.invoke("history:deleteRun", runId),
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
    close: () => ipcRenderer.invoke("window:close"),
    confirmClose: () => ipcRenderer.invoke("window:confirmClose"),
    onCloseRequested: (cb: () => void) => {
      const listener = () => {
        cb();
      };
      ipcRenderer.on("window:closeRequested", listener);
      return () => ipcRenderer.removeListener("window:closeRequested", listener);
    },
    getAppVersion: () => ipcRenderer.invoke("window:getAppVersion"),
    getSystemLocales: () => ipcRenderer.invoke("window:getSystemLocales"),
    setZoomFactor: (factor: number) => ipcRenderer.invoke("window:setZoomFactor", factor),
    getZoomFactor: () => ipcRenderer.invoke("window:getZoomFactor"),
  },
};

contextBridge.exposeInMainWorld("loadsmith", api);
