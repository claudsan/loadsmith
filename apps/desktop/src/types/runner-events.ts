export type RunMode = "smoke" | "load";

export interface RunStartedEvent {
  type: "RUN_STARTED";
  runId: string;
  scenario: string;
  mode: RunMode;
  timestamp: string;
}

export interface MetricTickEvent {
  type: "METRIC_TICK";
  runId: string;
  elapsedMs: number;
  activeVus: number;
  rps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  successes: number;
  errors: number;
}

export interface ErrorSampleEvent {
  type: "ERROR_SAMPLE";
  runId: string;
  step: string;
  statusCode: number;
  durationMs: number;
  error: string;
  requestSummary: string;
}

export interface RunFinishedEvent {
  type: "RUN_FINISHED";
  runId: string;
  totalRequests: number;
  totalErrors: number;
  errorRatePct: number;
  p95Ms: number;
  passedThresholds: boolean;
  violations: string[];
}

export type RunnerEvent =
  | RunStartedEvent
  | MetricTickEvent
  | ErrorSampleEvent
  | RunFinishedEvent;

export interface StartRunRequest {
  scenarioPath: string;
  mode: RunMode;
  windowMs: number;
}

export interface SidecarExitInfo {
  runId: string | null;
  code: number | null;
  signal: string | null;
  stoppedByUser: boolean;
}

export interface SidecarInfo {
  found: boolean;
  binaryPath: string | null;
  platform: string;
}

export interface ScenarioTreeNode {
  name: string;
  scenarioName?: string;
  path: string;
  relativePath: string;
  kind: "directory" | "file";
  children?: ScenarioTreeNode[];
}

export interface WorkspaceSnapshot {
  rootDir: string;
  tree: ScenarioTreeNode[];
}

export type StoredRunStatus = "running" | "passed" | "failed" | "stopped";

export interface StoredRunSummary {
  runId: string;
  scenarioName: string;
  scenarioPath: string;
  mode: RunMode;
  status: StoredRunStatus;
  startedAt: string;
  finishedAt: string | null;
  totalRequests: number;
  totalErrors: number;
  errorRatePct: number;
  p95Ms: number;
  avgRps: number;
  peakRps: number;
  passedThresholds: boolean;
  violations: string[];
}

export interface StoredRunDetails {
  summary: StoredRunSummary;
  ticks: MetricTickEvent[];
  errorSamples: ErrorSampleEvent[];
}

export interface CsvPreviewResult {
  resolvedPath: string;
  exists: boolean;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
  error: string | null;
}

export interface CsvRecordRow {
  rowNumber: number;
  values: string[];
}

export interface CsvRecordsPage {
  resolvedPath: string;
  headers: string[];
  totalRows: number;
  filteredRows: number;
  offset: number;
  limit: number;
  rows: CsvRecordRow[];
  error: string | null;
}

export interface EnvPreviewResult {
  resolvedPath: string;
  exists: boolean;
  keys: string[];
  isAutoDetected: boolean;
  error: string | null;
}

export interface LoadsmithBridgeApi {
  workspace: {
    getDefault(): Promise<WorkspaceSnapshot>;
    selectFolder(): Promise<WorkspaceSnapshot | null>;
    checkDir(dirPath: string): Promise<boolean>;
    listFiles(rootDir: string): Promise<ScenarioTreeNode[]>;
    readFile(rootDir: string, filePath: string): Promise<string>;
    saveFile(rootDir: string, filePath: string, content: string): Promise<void>;
    createFile(
      rootDir: string,
      relativePath: string,
      content: string
    ): Promise<{ filePath: string; tree: ScenarioTreeNode[] }>;
    renameFile(
      rootDir: string,
      oldFilePath: string,
      newRelativeName: string
    ): Promise<{ filePath: string; tree: ScenarioTreeNode[] }>;
    duplicateFile(
      rootDir: string,
      filePath: string
    ): Promise<{ filePath: string; tree: ScenarioTreeNode[] }>;
    deleteFile(
      rootDir: string,
      filePath: string
    ): Promise<{ tree: ScenarioTreeNode[] }>;
    pickCsvFile(
      rootDir: string,
      scenarioPath: string | null
    ): Promise<{ relativePath: string; preview: CsvPreviewResult } | null>;
    previewCsv(
      scenarioPath: string | null,
      csvPath: string,
      delimiter?: string
    ): Promise<CsvPreviewResult>;
    readCsvRecords(
      scenarioPath: string | null,
      csvPath: string,
      delimiter?: string,
      offset?: number,
      limit?: number,
      search?: string
    ): Promise<CsvRecordsPage>;
    pickEnvFile(
      rootDir: string,
      scenarioPath: string | null
    ): Promise<{ relativePath: string; preview: EnvPreviewResult } | null>;
    inspectEnv(
      scenarioPath: string | null,
      envFilePath?: string
    ): Promise<EnvPreviewResult>;
    exportReport(
      defaultFileName: string,
      content: string,
      format: "html" | "md"
    ): Promise<{ filePath: string } | null>;
    exportReportPdf(
      defaultFileName: string,
      htmlContent: string
    ): Promise<{ filePath: string } | null>;
    openExternalPath(filePath: string): Promise<void>;
  };
  runner: {
    getSidecarInfo(): Promise<SidecarInfo>;
    start(req: StartRunRequest): Promise<{ started: boolean }>;
    stop(): Promise<{ stopped: boolean }>;
    onEvent(cb: (event: RunnerEvent) => void): () => void;
    onStderr(cb: (line: string) => void): () => void;
    onExit(cb: (info: SidecarExitInfo) => void): () => void;
  };
  history: {
    listRuns(limit?: number): Promise<StoredRunSummary[]>;
    getRunDetails(runId: string): Promise<StoredRunDetails | null>;
    deleteRun(runId: string): Promise<void>;
  };
  windowControls: {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<void>;
    close(): Promise<void>;
    confirmClose(): Promise<void>;
    onCloseRequested(cb: () => void): () => void;
    getAppVersion(): Promise<string>;
    getSystemLocales?(): Promise<string[]>;
    setZoomFactor(factor: number): Promise<number>;
    getZoomFactor(): Promise<number>;
  };
}

declare global {
  interface Window {
    loadsmith: LoadsmithBridgeApi;
  }
}
