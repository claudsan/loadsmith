import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type {
  CsvPreviewResult,
  CsvRecordRow,
  CsvRecordsPage,
  EnvPreviewResult,
  ScenarioTreeNode,
} from "../../src/types/runner-events";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "dist-electron",
  "resources",
  "build",
  "target",
  ".next",
]);

const SCENARIO_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);

export function isExistingDirectory(dirPath: string): boolean {
  const trimmed = dirPath.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const resolved = path.resolve(trimmed);
    return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
  } catch {
    return false;
  }
}

export function assertWithinRoot(rootDir: string, targetPath: string): string {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, targetPath);
  const rel = path.relative(resolvedRoot, resolvedTarget);

  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
    return resolvedTarget;
  }
  throw new Error(`Caminho fora da pasta do workspace não permitido: ${targetPath}`);
}

export function isScenarioFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (!SCENARIO_EXTENSIONS.has(ext)) {
    return false;
  }
  // Ignore common project manifest files when browsing project roots.
  const lower = fileName.toLowerCase();
  return (
    lower !== "package.json" &&
    lower !== "package-lock.json" &&
    lower !== "tsconfig.json" &&
    lower !== "tsconfig.electron.json"
  );
}

function extractScenarioName(filePath: string): string | undefined {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = (
      filePath.toLowerCase().endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw)
    ) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const name = (parsed as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) {
        return name.trim();
      }
    }
  } catch {
    // Ignore malformed files while indexing the tree; editor shows syntax error details.
  }
  return undefined;
}

export function listScenarioTree(rootDir: string): ScenarioTreeNode[] {
  const resolvedRoot = path.resolve(rootDir);
  if (!fs.existsSync(resolvedRoot)) {
    return [];
  }
  return readDirRecursive(resolvedRoot, resolvedRoot);
}

function readDirRecursive(rootDir: string, currentDir: string): ScenarioTreeNode[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const dirs: ScenarioTreeNode[] = [];
  const files: ScenarioTreeNode[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      const children = readDirRecursive(rootDir, fullPath);
      if (children.length > 0 || entry.name === ".loadsmith") {
        dirs.push({
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(rootDir, fullPath),
          kind: "directory",
          children,
        });
      }
      continue;
    }

    if (entry.isFile() && isScenarioFile(entry.name)) {
      const fullPath = path.join(currentDir, entry.name);
      files.push({
        name: entry.name,
        scenarioName: extractScenarioName(fullPath),
        path: fullPath,
        relativePath: path.relative(rootDir, fullPath),
        kind: "file",
      });
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return [...dirs, ...files];
}

export function readScenarioFile(rootDir: string, filePath: string): string {
  const safePath = assertWithinRoot(rootDir, filePath);
  return fs.readFileSync(safePath, "utf8");
}

export function saveScenarioFile(rootDir: string, filePath: string, content: string): void {
  const safePath = assertWithinRoot(rootDir, filePath);
  fs.mkdirSync(path.dirname(safePath), { recursive: true });
  fs.writeFileSync(safePath, content, "utf8");
}

export function createScenarioFile(
  rootDir: string,
  relativePath: string,
  content: string
): string {
  const trimmed = relativePath.trim();
  if (!trimmed) {
    throw new Error("Nome do arquivo de cenário não pode estar vazio.");
  }
  const ext = path.extname(trimmed).toLowerCase();
  const normalizedName = SCENARIO_EXTENSIONS.has(ext) ? trimmed : `${trimmed}.yaml`;
  const safePath = assertWithinRoot(rootDir, normalizedName);

  if (fs.existsSync(safePath)) {
    throw new Error(`Arquivo já existe: ${normalizedName}`);
  }
  fs.mkdirSync(path.dirname(safePath), { recursive: true });
  fs.writeFileSync(safePath, content, "utf8");
  return safePath;
}

function hasAnyScenarioFile(nodes: ScenarioTreeNode[]): boolean {
  for (const node of nodes) {
    if (node.kind === "file") {
      return true;
    }
    if (node.children && hasAnyScenarioFile(node.children)) {
      return true;
    }
  }
  return false;
}

const STARTER_SCENARIO_YAML = `# Cenário inicial criado automaticamente pelo LoadSmith
# Ajuste a baseUrl e os passos para apontar para a sua API local ou de homologação.
name: "Exemplo — API Local"
baseUrl: "http://127.0.0.1:8080"

steps:
  - id: health
    name: "Health Check"
    method: GET
    path: "/health"
    assert:
      status: 200
      maxDurationMs: 250

load:
  vus: 10
  rampUp: "3s"
  duration: "10s"
  thinkTimeMs: 100

thresholds:
  p95Ms: 250
  maxErrorRatePct: 1.0
`;

export function ensureStarterScenario(rootDir: string): string | null {
  const resolvedRoot = path.resolve(rootDir);
  fs.mkdirSync(resolvedRoot, { recursive: true });
  if (hasAnyScenarioFile(listScenarioTree(resolvedRoot))) {
    return null;
  }
  const starterPath = assertWithinRoot(resolvedRoot, "exemplo-api.yaml");
  fs.writeFileSync(starterPath, STARTER_SCENARIO_YAML, "utf8");
  return starterPath;
}

export function renameScenarioFile(
  rootDir: string,
  oldFilePath: string,
  newRelativeName: string
): string {
  const safeOld = assertWithinRoot(rootDir, oldFilePath);
  if (!fs.existsSync(safeOld) || !fs.statSync(safeOld).isFile()) {
    throw new Error("Arquivo de cenário não encontrado.");
  }

  const trimmed = newRelativeName.trim();
  if (!trimmed) {
    throw new Error("Nome do cenário não pode estar vazio.");
  }

  const rawExt = path.extname(trimmed).toLowerCase();
  const oldExt = path.extname(safeOld) || ".yaml";
  const withExt = SCENARIO_EXTENSIONS.has(rawExt) ? trimmed : `${trimmed}${oldExt}`;
  const hasDirSeparator = withExt.includes("/") || withExt.includes("\\");
  const targetCandidate = hasDirSeparator
    ? withExt
    : path.join(path.dirname(safeOld), withExt);

  const safeNew = assertWithinRoot(rootDir, targetCandidate);
  if (safeNew === safeOld) {
    return safeNew;
  }
  if (safeNew.toLowerCase() !== safeOld.toLowerCase() && fs.existsSync(safeNew)) {
    throw new Error(`Já existe um cenário com este nome: ${path.basename(safeNew)}`);
  }

  fs.mkdirSync(path.dirname(safeNew), { recursive: true });
  fs.renameSync(safeOld, safeNew);
  return safeNew;
}

export function duplicateScenarioFile(rootDir: string, filePath: string): string {
  const safeSrc = assertWithinRoot(rootDir, filePath);
  if (!fs.existsSync(safeSrc) || !fs.statSync(safeSrc).isFile()) {
    throw new Error("Arquivo de cenário não encontrado.");
  }

  const dir = path.dirname(safeSrc);
  const ext = path.extname(safeSrc) || ".yaml";
  const stem = path.basename(safeSrc, ext);

  let attempt = 1;
  let candidate = "";
  while (true) {
    const suffix = attempt === 1 ? "-copia" : `-copia-${attempt}`;
    candidate = assertWithinRoot(rootDir, path.join(dir, `${stem}${suffix}${ext}`));
    if (!fs.existsSync(candidate)) {
      break;
    }
    attempt++;
  }

  fs.copyFileSync(safeSrc, candidate);
  return candidate;
}

export function deleteScenarioFile(rootDir: string, filePath: string): void {
  const safePath = assertWithinRoot(rootDir, filePath);
  if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
    throw new Error("Arquivo de cenário não encontrado.");
  }
  if (!isScenarioFile(path.basename(safePath))) {
    throw new Error("Apenas arquivos de cenário (.yaml, .yml, .json) podem ser excluídos.");
  }
  fs.unlinkSync(safePath);
}

export function resolveCsvTargetPath(scenarioPath: string | null, csvPath: string): string {
  const trimmed = csvPath.trim();
  if (!trimmed) {
    return "";
  }
  if (path.isAbsolute(trimmed) || !scenarioPath) {
    return path.resolve(trimmed);
  }
  return path.resolve(path.dirname(scenarioPath), trimmed);
}

export function toScenarioRelativeCsvPath(scenarioPath: string | null, selectedCsvPath: string): string {
  if (!scenarioPath) {
    return selectedCsvPath;
  }
  const rel = path.relative(path.dirname(scenarioPath), selectedCsvPath);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    const normalized = rel.split(path.sep).join("/");
    return normalized.startsWith("./") ? normalized : `./${normalized}`;
  }
  return selectedCsvPath;
}

interface ParsedCsvData {
  resolvedPath: string;
  exists: boolean;
  headers: string[];
  dataRows: string[][];
  error: string | null;
}

function loadParsedCsv(
  scenarioPath: string | null,
  csvPath: string,
  delimiter = ","
): ParsedCsvData {
  const resolvedPath = resolveCsvTargetPath(scenarioPath, csvPath);
  if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return {
      resolvedPath,
      exists: false,
      headers: [],
      dataRows: [],
      error: resolvedPath
        ? `Arquivo CSV não encontrado: ${resolvedPath}`
        : "Informe o caminho do arquivo CSV.",
    };
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf8").replace(/^\uFEFF/, "");
    const sep = delimiter === "\\t" || delimiter === "\t" ? "\t" : (delimiter.trim()[0] ?? ",");
    const records = parseCsvRecords(raw, sep).filter((row) =>
      row.some((cell) => cell.trim() !== "")
    );

    if (records.length === 0) {
      return {
        resolvedPath,
        exists: true,
        headers: [],
        dataRows: [],
        error: "Arquivo CSV está vazio.",
      };
    }

    const headers = records[0].map((h) => h.trim()).filter(Boolean);
    const dataRows = records.slice(1);
    return {
      resolvedPath,
      exists: true,
      headers,
      dataRows,
      error: dataRows.length === 0 ? "CSV precisa de ao menos 1 linha de dados além do cabeçalho." : null,
    };
  } catch (err) {
    return {
      resolvedPath,
      exists: true,
      headers: [],
      dataRows: [],
      error: (err as Error).message,
    };
  }
}

export function previewCsvFile(
  scenarioPath: string | null,
  csvPath: string,
  delimiter = ","
): CsvPreviewResult {
  const parsed = loadParsedCsv(scenarioPath, csvPath, delimiter);
  return {
    resolvedPath: parsed.resolvedPath,
    exists: parsed.exists,
    headers: parsed.headers,
    rowCount: parsed.dataRows.length,
    sampleRows: parsed.dataRows.slice(0, 3),
    error: parsed.error,
  };
}

export function readCsvRecords(
  scenarioPath: string | null,
  csvPath: string,
  delimiter = ",",
  offset = 0,
  limit = 100,
  search = ""
): CsvRecordsPage {
  const safeOffset = Math.max(0, Math.trunc(Number.isFinite(offset) ? offset : 0));
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(Number.isFinite(limit) ? limit : 100)));
  const parsed = loadParsedCsv(scenarioPath, csvPath, delimiter);

  if (parsed.error) {
    return {
      resolvedPath: parsed.resolvedPath,
      headers: parsed.headers,
      totalRows: parsed.dataRows.length,
      filteredRows: 0,
      offset: safeOffset,
      limit: safeLimit,
      rows: [],
      error: parsed.error,
    };
  }

  const query = search.trim().toLowerCase();
  const indexed: CsvRecordRow[] = [];
  for (let i = 0; i < parsed.dataRows.length; i++) {
    const values = parsed.dataRows[i];
    if (!query || values.some((cell) => cell.toLowerCase().includes(query))) {
      indexed.push({ rowNumber: i + 1, values });
    }
  }

  return {
    resolvedPath: parsed.resolvedPath,
    headers: parsed.headers,
    totalRows: parsed.dataRows.length,
    filteredRows: indexed.length,
    offset: safeOffset,
    limit: safeLimit,
    rows: indexed.slice(safeOffset, safeOffset + safeLimit),
    error: null,
  };
}

export function inspectEnvFile(
  scenarioPath: string | null,
  envFilePath = ""
): EnvPreviewResult {
  const trimmed = envFilePath.trim();
  const isAutoDetected = trimmed === "";

  let resolvedPath = "";
  if (isAutoDetected) {
    if (!scenarioPath) {
      return {
        resolvedPath: "",
        exists: false,
        keys: [],
        isAutoDetected: true,
        error: null,
      };
    }
    resolvedPath = path.join(path.dirname(scenarioPath), ".env");
  } else {
    resolvedPath = resolveCsvTargetPath(scenarioPath, trimmed);
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return {
      resolvedPath,
      exists: false,
      keys: [],
      isAutoDetected,
      error: isAutoDetected ? null : `Arquivo .env não encontrado: ${resolvedPath}`,
    };
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf8").replace(/^\uFEFF/, "");
    const keys = new Set<string>();
    for (const rawLine of raw.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      if (line.startsWith("export ")) {
        line = line.slice("export ".length).trim();
      }
      const eqIdx = line.indexOf("=");
      if (eqIdx <= 0) {
        continue;
      }
      const key = line.slice(0, eqIdx).trim();
      if (key) {
        keys.add(key);
      }
    }

    return {
      resolvedPath,
      exists: true,
      keys: Array.from(keys).sort((a, b) => a.localeCompare(b)),
      isAutoDetected,
      error: null,
    };
  } catch (err) {
    return {
      resolvedPath,
      exists: true,
      keys: [],
      isAutoDetected,
      error: (err as Error).message,
    };
  }
}

function parseCsvRecords(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && input[i + 1] === "\n") {
        i++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
