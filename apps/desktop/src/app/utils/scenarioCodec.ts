import YAML from "yaml";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface KeyValuePair {
  key: string;
  value: string;
}

export type BodyMode = "none" | "json" | "raw";
export type DataFileMode = "round-robin" | "random";

export interface EditableStep {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  timeoutMs: string;
  headers: KeyValuePair[];
  bodyMode: BodyMode;
  bodyText: string;
  extract: KeyValuePair[];
  assertStatus: string;
  assertBodyContains: string;
  assertMaxDurationMs: string;
}

export interface EditableScenario {
  name: string;
  baseUrl: string;
  insecureSkipVerify: boolean;
  envFile: string;
  variables: KeyValuePair[];
  dataFilePath: string;
  dataFileDelimiter: string;
  dataFileMode: DataFileMode;
  steps: EditableStep[];
  smokeIterations: string;
  loadVus: string;
  loadRampUp: string;
  loadDuration: string;
  loadThinkTimeMs: string;
  thresholdP95Ms: string;
  thresholdMaxErrorRatePct: string;
}

const VALID_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function normalizeMethod(raw: unknown): HttpMethod {
  const upper = typeof raw === "string" ? raw.trim().toUpperCase() : "GET";
  return VALID_METHODS.has(upper) ? (upper as HttpMethod) : "GET";
}

function toStringVal(v: unknown): string {
  if (v === null || v === undefined) {
    return "";
  }
  return String(v);
}

function recordToPairs(raw: unknown): KeyValuePair[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: toStringVal(value),
  }));
}

function pairsToRecord(pairs: KeyValuePair[]): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const k = pair.key.trim();
    if (!k) {
      continue;
    }
    result[k] = pair.value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseOptionalInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return Math.trunc(n);
}

function parseOptionalFloat(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return n;
}

export function createEmptyStep(index: number): EditableStep {
  return {
    id: `step${index}`,
    name: `Passo ${index}`,
    method: "GET",
    path: "/health",
    timeoutMs: "3000",
    headers: [],
    bodyMode: "none",
    bodyText: "",
    extract: [],
    assertStatus: "200",
    assertBodyContains: "",
    assertMaxDurationMs: "",
  };
}

export function parseScenarioText(
  content: string,
  isJson: boolean
): { scenario: EditableScenario | null; error: string | null } {
  try {
    const rawObj = (
      content.trim() === ""
        ? {}
        : isJson
          ? JSON.parse(content)
          : YAML.parse(content)
    ) as unknown;

    if (rawObj === null || rawObj === undefined) {
      return {
        scenario: {
          name: "",
          baseUrl: "",
          insecureSkipVerify: false,
          envFile: "",
          variables: [],
          dataFilePath: "",
          dataFileDelimiter: ",",
          dataFileMode: "round-robin",
          steps: [],
          smokeIterations: "",
          loadVus: "",
          loadRampUp: "",
          loadDuration: "",
          loadThinkTimeMs: "",
          thresholdP95Ms: "",
          thresholdMaxErrorRatePct: "",
        },
        error: null,
      };
    }

    if (typeof rawObj !== "object" || Array.isArray(rawObj)) {
      return {
        scenario: null,
        error: isJson
          ? "Cenário JSON deve ser um objeto na raiz."
          : "Cenário YAML deve ser um mapeamento chave-valor na raiz.",
      };
    }

    const doc = rawObj as Record<string, unknown>;
    const rawSteps = Array.isArray(doc.steps) ? doc.steps : [];

    const steps: EditableStep[] = rawSteps.map((item, idx) => {
      const s =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const assertObj =
        s.assert && typeof s.assert === "object" && !Array.isArray(s.assert)
          ? (s.assert as Record<string, unknown>)
          : {};

      let bodyMode: BodyMode = "none";
      let bodyText = "";
      if (s.body !== undefined && s.body !== null) {
        if (typeof s.body === "string") {
          bodyMode = "raw";
          bodyText = s.body;
        } else {
          bodyMode = "json";
          bodyText = JSON.stringify(s.body, null, 2);
        }
      }

      return {
        id: toStringVal(s.id) || `step${idx + 1}`,
        name: toStringVal(s.name),
        method: normalizeMethod(s.method),
        path: toStringVal(s.path),
        timeoutMs: toStringVal(s.timeoutMs),
        headers: recordToPairs(s.headers),
        bodyMode,
        bodyText,
        extract: recordToPairs(s.extract),
        assertStatus: toStringVal(assertObj.status),
        assertBodyContains: toStringVal(assertObj.bodyContains),
        assertMaxDurationMs: toStringVal(assertObj.maxDurationMs),
      };
    });

    const dataFileObj =
      doc.dataFile && typeof doc.dataFile === "object" && !Array.isArray(doc.dataFile)
        ? (doc.dataFile as Record<string, unknown>)
        : {};
    const rawDataMode = toStringVal(dataFileObj.mode);
    const dataFileMode: DataFileMode = rawDataMode === "random" ? "random" : "round-robin";

    const smokeObj =
      doc.smoke && typeof doc.smoke === "object" && !Array.isArray(doc.smoke)
        ? (doc.smoke as Record<string, unknown>)
        : {};
    const loadObj =
      doc.load && typeof doc.load === "object" && !Array.isArray(doc.load)
        ? (doc.load as Record<string, unknown>)
        : {};
    const thresholdsObj =
      doc.thresholds && typeof doc.thresholds === "object" && !Array.isArray(doc.thresholds)
        ? (doc.thresholds as Record<string, unknown>)
        : {};

    return {
      scenario: {
        name: toStringVal(doc.name),
        baseUrl: toStringVal(doc.baseUrl),
        insecureSkipVerify: Boolean(doc.insecureSkipVerify),
        envFile: toStringVal(doc.envFile),
        variables: recordToPairs(doc.variables),
        dataFilePath: toStringVal(dataFileObj.path),
        dataFileDelimiter: toStringVal(dataFileObj.delimiter) || ",",
        dataFileMode,
        steps,
        smokeIterations: toStringVal(smokeObj.iterations),
        loadVus: toStringVal(loadObj.vus),
        loadRampUp: toStringVal(loadObj.rampUp),
        loadDuration: toStringVal(loadObj.duration),
        loadThinkTimeMs: toStringVal(loadObj.thinkTimeMs),
        thresholdP95Ms: toStringVal(thresholdsObj.p95Ms),
        thresholdMaxErrorRatePct: toStringVal(thresholdsObj.maxErrorRatePct),
      },
      error: null,
    };
  } catch (err) {
    return {
      scenario: null,
      error: (err as Error).message,
    };
  }
}

export function serializeScenarioText(sc: EditableScenario, isJson: boolean): string {
  const out: Record<string, unknown> = {
    name: sc.name,
    baseUrl: sc.baseUrl,
  };

  if (sc.insecureSkipVerify) {
    out.insecureSkipVerify = true;
  }
  if (sc.envFile.trim()) {
    out.envFile = sc.envFile.trim();
  }

  const variables = pairsToRecord(sc.variables);
  if (variables) {
    out.variables = variables;
  }

  if (sc.dataFilePath.trim()) {
    const df: Record<string, unknown> = {
      path: sc.dataFilePath.trim(),
    };
    const delim = sc.dataFileDelimiter.trim();
    if (delim && delim !== ",") {
      df.delimiter = delim;
    }
    if (sc.dataFileMode && sc.dataFileMode !== "round-robin") {
      df.mode = sc.dataFileMode;
    }
    out.dataFile = df;
  }

  out.steps = sc.steps.map((step) => {
    const item: Record<string, unknown> = {
      id: step.id.trim() || "step",
    };
    if (step.name.trim()) {
      item.name = step.name;
    }
    item.method = step.method;
    item.path = step.path;

    const headers = pairsToRecord(step.headers);
    if (headers) {
      item.headers = headers;
    }

    if (step.bodyMode === "json") {
      if (step.bodyText.trim() !== "") {
        try {
          item.body = JSON.parse(step.bodyText) as unknown;
        } catch {
          item.body = step.bodyText;
        }
      } else {
        item.body = {};
      }
    } else if (step.bodyMode === "raw" && step.bodyText !== "") {
      item.body = step.bodyText;
    }

    const timeoutMs = parseOptionalInt(step.timeoutMs);
    if (timeoutMs !== undefined) {
      item.timeoutMs = timeoutMs;
    }

    const extract = pairsToRecord(step.extract);
    if (extract) {
      item.extract = extract;
    }

    const assertObj: Record<string, unknown> = {};
    const status = parseOptionalInt(step.assertStatus);
    if (status !== undefined) {
      assertObj.status = status;
    }
    if (step.assertBodyContains !== "") {
      assertObj.bodyContains = step.assertBodyContains;
    }
    const maxDurationMs = parseOptionalFloat(step.assertMaxDurationMs);
    if (maxDurationMs !== undefined) {
      assertObj.maxDurationMs = maxDurationMs;
    }
    if (Object.keys(assertObj).length > 0) {
      item.assert = assertObj;
    }

    return item;
  });

  const smokeIterations = parseOptionalInt(sc.smokeIterations);
  if (smokeIterations !== undefined) {
    out.smoke = { iterations: smokeIterations };
  }

  const loadObj: Record<string, unknown> = {};
  const vus = parseOptionalInt(sc.loadVus);
  if (vus !== undefined) {
    loadObj.vus = vus;
  }
  if (sc.loadRampUp.trim()) {
    loadObj.rampUp = sc.loadRampUp.trim();
  }
  if (sc.loadDuration.trim()) {
    loadObj.duration = sc.loadDuration.trim();
  }
  const thinkTimeMs = parseOptionalInt(sc.loadThinkTimeMs);
  if (thinkTimeMs !== undefined) {
    loadObj.thinkTimeMs = thinkTimeMs;
  }
  if (Object.keys(loadObj).length > 0) {
    out.load = loadObj;
  }

  const thresholdsObj: Record<string, unknown> = {};
  const p95Ms = parseOptionalFloat(sc.thresholdP95Ms);
  if (p95Ms !== undefined) {
    thresholdsObj.p95Ms = p95Ms;
  }
  const maxErrorRatePct = parseOptionalFloat(sc.thresholdMaxErrorRatePct);
  if (maxErrorRatePct !== undefined) {
    thresholdsObj.maxErrorRatePct = maxErrorRatePct;
  }
  if (Object.keys(thresholdsObj).length > 0) {
    out.thresholds = thresholdsObj;
  }

  if (isJson) {
    return `${JSON.stringify(out, null, 2)}\n`;
  }
  return YAML.stringify(out, { indent: 2, lineWidth: 100 });
}
