import type { BodyMode, EditableStep, HttpMethod, KeyValuePair } from "./scenarioCodec";

export interface ParsedCurlResult {
  baseUrl: string;
  step: EditableStep;
  insecureSkipVerify: boolean;
  warnings: string[];
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

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function normalizeCurlMultiline(raw: string): string {
  // Handle POSIX line continuations ("\") and Windows CMD continuations ("^")
  return raw
    .replace(/\\\r?\n/g, " ")
    .replace(/\^\r?\n/g, " ")
    .trim();
}

function unescapeAnsiCString(raw: string): string {
  return raw.replace(/\\(n|r|t|\\|'|"|x[0-9a-fA-F]{2})/g, (_m, seq: string) => {
    switch (seq) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "\\":
        return "\\";
      case "'":
        return "'";
      case '"':
        return '"';
      default:
        if (seq.startsWith("x")) {
          return String.fromCharCode(Number.parseInt(seq.slice(1), 16));
        }
        return seq;
    }
  });
}

function tokenizeShellCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let hasToken = false;
  let quote: "'" | '"' | "ansi" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote === "'") {
      if (ch === "'") {
        quote = null;
      } else {
        current += ch;
      }
      hasToken = true;
      continue;
    }

    if (quote === "ansi") {
      if (ch === "\\" && i + 1 < input.length) {
        current += ch + input[i + 1];
        i++;
      } else if (ch === "'") {
        current = unescapeAnsiCString(current);
        quote = null;
      } else {
        current += ch;
      }
      hasToken = true;
      continue;
    }

    if (quote === '"') {
      if (ch === "\\" && i + 1 < input.length) {
        const next = input[i + 1];
        if (next === '"' || next === "\\" || next === "$" || next === "`") {
          current += next;
          i++;
          continue;
        }
      }
      if (ch === '"') {
        quote = null;
      } else {
        current += ch;
      }
      hasToken = true;
      continue;
    }

    // Outside quotes
    if (/\s/.test(ch)) {
      if (hasToken) {
        tokens.push(current);
        current = "";
        hasToken = false;
      }
      continue;
    }

    if (ch === "$" && input[i + 1] === "'") {
      quote = "ansi";
      hasToken = true;
      i++;
      continue;
    }
    if (ch === "'") {
      quote = "'";
      hasToken = true;
      continue;
    }
    if (ch === '"') {
      quote = '"';
      hasToken = true;
      continue;
    }
    if ((ch === "\\" || ch === "^") && i + 1 < input.length) {
      current += input[i + 1];
      hasToken = true;
      i++;
      continue;
    }

    current += ch;
    hasToken = true;
  }

  if (hasToken) {
    tokens.push(current);
  }
  return tokens;
}

function setOrUpdateHeader(headers: KeyValuePair[], key: string, value: string): void {
  const lower = key.toLowerCase();
  const idx = headers.findIndex((h) => h.key.trim().toLowerCase() === lower);
  if (idx >= 0) {
    headers[idx] = { key: headers[idx].key, value };
  } else {
    headers.push({ key, value });
  }
}

function buildStepIdAndName(method: HttpMethod, reqPath: string, stepIndex: number): {
  id: string;
  name: string;
} {
  const pathOnly = reqPath.split("?")[0] || "/";
  const cleanSegments = pathOnly
    .split("/")
    .map((s) => s.replace(/[^a-zA-Z0-9_-]+/g, ""))
    .filter(Boolean);
  const slugBase = [method.toLowerCase(), ...cleanSegments.slice(-2)].join("_");
  const id = slugBase.replace(/[^a-zA-Z0-9_]+/g, "_") || `step_${stepIndex}`;
  return {
    id,
    name: `${method} ${pathOnly}`,
  };
}

export function parseCurlCommand(
  rawInput: string,
  stepIndex = 1
): { result: ParsedCurlResult | null; error: string | null } {
  const normalized = normalizeCurlMultiline(rawInput);
  if (!normalized) {
    return { result: null, error: "Cole um comando cURL válido para importar." };
  }

  const tokens = tokenizeShellCommand(normalized);
  if (tokens.length === 0) {
    return { result: null, error: "Não foi possível interpretar o comando cURL." };
  }

  let idx = 0;
  const firstLower = tokens[0].toLowerCase();
  if (firstLower === "curl" || firstLower === "curl.exe") {
    idx = 1;
  }

  let explicitMethod: HttpMethod | null = null;
  let targetUrl = "";
  let insecureSkipVerify = false;
  let timeoutMs = "3000";
  let isJsonFlag = false;
  const headers: KeyValuePair[] = [];
  const dataParts: string[] = [];
  const warnings: string[] = [];

  for (; idx < tokens.length; idx++) {
    const tok = tokens[idx];

    const readNextValue = (inlinePrefix?: string): string | undefined => {
      if (inlinePrefix && tok.length > inlinePrefix.length) {
        return tok.slice(inlinePrefix.length);
      }
      if (idx + 1 < tokens.length) {
        idx++;
        return tokens[idx];
      }
      return undefined;
    };

    if (tok === "-X" || tok === "--request") {
      const val = readNextValue()?.trim().toUpperCase();
      if (val && VALID_METHODS.has(val)) {
        explicitMethod = val as HttpMethod;
      }
      continue;
    }
    if (tok.startsWith("-X") && tok.length > 2) {
      const val = tok.slice(2).trim().toUpperCase();
      if (VALID_METHODS.has(val)) {
        explicitMethod = val as HttpMethod;
      }
      continue;
    }
    if (tok.startsWith("--request=")) {
      const val = tok.slice("--request=".length).trim().toUpperCase();
      if (VALID_METHODS.has(val)) {
        explicitMethod = val as HttpMethod;
      }
      continue;
    }

    if (tok === "--url" || tok.startsWith("--url=")) {
      const val = tok.startsWith("--url=") ? tok.slice("--url=".length) : readNextValue();
      if (val) {
        targetUrl = val.trim();
      }
      continue;
    }

    if (tok === "-H" || tok === "--header" || tok.startsWith("--header=")) {
      const rawHeader = tok.startsWith("--header=")
        ? tok.slice("--header=".length)
        : readNextValue();
      if (rawHeader) {
        const colonIdx = rawHeader.indexOf(":");
        if (colonIdx > 0) {
          const k = rawHeader.slice(0, colonIdx).trim();
          const v = rawHeader.slice(colonIdx + 1).trim();
          if (k) {
            setOrUpdateHeader(headers, k, v);
          }
        }
      }
      continue;
    }

    if (tok === "-b" || tok === "--cookie" || tok.startsWith("--cookie=")) {
      const cookieVal = tok.startsWith("--cookie=")
        ? tok.slice("--cookie=".length)
        : readNextValue();
      if (cookieVal) {
        setOrUpdateHeader(headers, "Cookie", cookieVal.trim());
      }
      continue;
    }

    if (tok === "-A" || tok === "--user-agent" || tok.startsWith("--user-agent=")) {
      const ua = tok.startsWith("--user-agent=")
        ? tok.slice("--user-agent=".length)
        : readNextValue();
      if (ua) {
        setOrUpdateHeader(headers, "User-Agent", ua.trim());
      }
      continue;
    }

    if (tok === "-e" || tok === "--referer" || tok.startsWith("--referer=")) {
      const ref = tok.startsWith("--referer=")
        ? tok.slice("--referer=".length)
        : readNextValue();
      if (ref) {
        setOrUpdateHeader(headers, "Referer", ref.trim());
      }
      continue;
    }

    if (tok === "-u" || tok === "--user" || tok.startsWith("--user=")) {
      const creds = tok.startsWith("--user=") ? tok.slice("--user=".length) : readNextValue();
      if (creds) {
        setOrUpdateHeader(headers, "Authorization", `Basic ${encodeBase64Utf8(creds)}`);
      }
      continue;
    }

    if (
      tok === "-d" ||
      tok === "--data" ||
      tok === "--data-raw" ||
      tok === "--data-binary" ||
      tok === "--data-ascii" ||
      tok === "--data-urlencode" ||
      tok === "--json" ||
      tok.startsWith("--data=") ||
      tok.startsWith("--data-raw=") ||
      tok.startsWith("--data-binary=") ||
      tok.startsWith("--data-ascii=") ||
      tok.startsWith("--data-urlencode=") ||
      tok.startsWith("--json=")
    ) {
      if (tok === "--json" || tok.startsWith("--json=")) {
        isJsonFlag = true;
        setOrUpdateHeader(headers, "Content-Type", "application/json");
        setOrUpdateHeader(headers, "Accept", "application/json");
      }
      const eqPos = tok.indexOf("=");
      const payload = eqPos >= 0 ? tok.slice(eqPos + 1) : readNextValue();
      if (payload !== undefined) {
        dataParts.push(payload);
      }
      continue;
    }

    if (tok === "-I" || tok === "--head") {
      explicitMethod = "HEAD";
      continue;
    }

    if (tok === "-k" || tok === "--insecure") {
      insecureSkipVerify = true;
      continue;
    }

    if (tok === "-m" || tok === "--max-time" || tok.startsWith("--max-time=")) {
      const rawSec = tok.startsWith("--max-time=")
        ? tok.slice("--max-time=".length)
        : readNextValue();
      const sec = Number(rawSec);
      if (Number.isFinite(sec) && sec > 0) {
        timeoutMs = String(Math.round(sec * 1000));
      }
      continue;
    }

    // Known standalone boolean flags that take no argument
    if (
      tok === "-s" ||
      tok === "--silent" ||
      tok === "-S" ||
      tok === "--show-error" ||
      tok === "-v" ||
      tok === "--verbose" ||
      tok === "-i" ||
      tok === "--include" ||
      tok === "-L" ||
      tok === "--location" ||
      tok === "--compressed"
    ) {
      continue;
    }

    // Ignore other unknown flags taking no obvious URL
    if (tok.startsWith("-")) {
      continue;
    }

    if (!targetUrl && /^https?:\/\//i.test(tok)) {
      targetUrl = tok;
    } else if (!targetUrl && tok.startsWith("/")) {
      targetUrl = `http://127.0.0.1:8080${tok}`;
      warnings.push("URL sem domínio detectada; usando http://127.0.0.1:8080 como base provisória.");
    }
  }

  if (!targetUrl) {
    return {
      result: null,
      error: "Nenhuma URL http:// ou https:// encontrada no comando cURL.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return {
      result: null,
      error: `URL inválida detectada: ${targetUrl}`,
    };
  }

  const baseUrl = parsedUrl.origin;
  const reqPath = `${parsedUrl.pathname || "/"}${parsedUrl.search}`;
  const rawBody = dataParts.join("&");
  const hasBody = rawBody.length > 0;
  const method: HttpMethod = explicitMethod ?? (hasBody || isJsonFlag ? "POST" : "GET");

  let bodyMode: BodyMode = "none";
  let bodyText = "";
  if (hasBody) {
    const trimmedBody = rawBody.trim();
    const looksJson =
      isJsonFlag ||
      trimmedBody.startsWith("{") ||
      trimmedBody.startsWith("[");
    if (looksJson) {
      try {
        const parsedJson = JSON.parse(trimmedBody) as unknown;
        bodyMode = "json";
        bodyText = JSON.stringify(parsedJson, null, 2);
      } catch {
        bodyMode = "raw";
        bodyText = rawBody;
        warnings.push("O corpo não pôde ser formatado como JSON estrito e foi importado como Texto Bruto.");
      }
    } else {
      bodyMode = "raw";
      bodyText = rawBody;
    }
  }

  const { id, name } = buildStepIdAndName(method, reqPath, stepIndex);
  const expectedStatus = method === "POST" ? "201" : method === "DELETE" ? "204" : "200";

  return {
    result: {
      baseUrl,
      insecureSkipVerify,
      warnings,
      step: {
        id,
        name,
        method,
        path: reqPath,
        timeoutMs,
        headers,
        bodyMode,
        bodyText,
        extract: [],
        assertStatus: expectedStatus,
        assertBodyContains: "",
        assertMaxDurationMs: "",
      },
    },
    error: null,
  };
}
