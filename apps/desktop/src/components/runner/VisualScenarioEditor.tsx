import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileSpreadsheet,
  Flame,
  FolderSearch,
  Gauge,
  KeyRound,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table2,
  Terminal,
  Trash2,
  Variable,
} from "lucide-react";
import {
  createEmptyStep,
  parseScenarioText,
  serializeScenarioText,
  type BodyMode,
  type DataFileMode,
  type EditableScenario,
  type EditableStep,
  type HttpMethod,
  type KeyValuePair,
} from "../../app/utils/scenarioCodec";
import type { CsvPreviewResult, EnvPreviewResult } from "../../types/runner-events";
import { useI18n } from "../../i18n";
import { CsvRecordsModal } from "./CsvRecordsModal";
import { ImportCurlModal } from "./ImportCurlModal";

interface VisualScenarioEditorProps {
  content: string;
  isJson: boolean;
  workspaceDir: string;
  scenarioPath: string | null;
  onChangeText: (nextText: string) => void;
  onSwitchToCode: () => void;
}

type StepSectionTab = "headers" | "body" | "extract" | "assert";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export function VisualScenarioEditor({
  content,
  isJson,
  workspaceDir,
  scenarioPath,
  onChangeText,
  onSwitchToCode,
}: VisualScenarioEditorProps) {
  const { t, language } = useI18n();
  const phKey = language === "en-US" ? "YOUR_KEY" : language === "es-ES" ? "TU_CLAVE" : "SUA_CHAVE";
  const phName = language === "en-US" ? "name" : language === "es-ES" ? "nombre" : "nome";
  const phVar = language === "en-US" ? "variable" : language === "es-ES" ? "variable" : "variavel";
  const parsed = useMemo(() => parseScenarioText(content, isJson), [content, isJson]);

  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 0: true });
  const [stepTabs, setStepTabs] = useState<Record<number, StepSectionTab>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<number, { text: string; error: string | null }>>({});
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult | null>(null);
  const [envPreview, setEnvPreview] = useState<EnvPreviewResult | null>(null);
  const [copiedEnvKey, setCopiedEnvKey] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showImportCurlModal, setShowImportCurlModal] = useState(false);

  // Reset per-step local JSON drafts whenever file text changes externally (e.g. switched file)
  useEffect(() => {
    setJsonDrafts({});
  }, [isJson, scenarioPath]);

  const dataFilePath = parsed.scenario?.dataFilePath ?? "";
  const dataFileDelimiter = parsed.scenario?.dataFileDelimiter ?? ",";
  const envFilePath = parsed.scenario?.envFile ?? "";

  useEffect(() => {
    let cancelled = false;
    void window.loadsmith.workspace
      .inspectEnv(scenarioPath, envFilePath)
      .then((res) => {
        if (!cancelled) {
          setEnvPreview(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnvPreview(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioPath, envFilePath]);

  useEffect(() => {
    let cancelled = false;
    if (!dataFilePath.trim()) {
      setCsvPreview(null);
      return;
    }
    void window.loadsmith.workspace
      .previewCsv(scenarioPath, dataFilePath, dataFileDelimiter)
      .then((res) => {
        if (!cancelled) {
          setCsvPreview(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCsvPreview(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioPath, dataFilePath, dataFileDelimiter]);

  if (parsed.error || !parsed.scenario) {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid rgba(239, 68, 68, 0.4)",
            background: "rgba(239, 68, 68, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 700, color: "#fecaca" }}>
            {t("visual.syntaxErrorTitle")}
          </div>
          <div className="mono" style={{ fontSize: 12, color: "#fca5a5" }}>
            {parsed.error ?? t("visual.syntaxErrorFallback")}
          </div>
          <div>
            <button type="button" className="btn btn-primary" onClick={onSwitchToCode}>
              <Code2 size={13} />
              {t("visual.fixInCode")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sc = parsed.scenario;

  const commit = (next: EditableScenario) => {
    onChangeText(serializeScenarioText(next, isJson));
  };

  const updateStep = (index: number, patch: Partial<EditableStep>) => {
    const nextSteps = sc.steps.map((s, idx) => (idx === index ? { ...s, ...patch } : s));
    commit({ ...sc, steps: nextSteps });
  };

  const addStep = () => {
    const nextIdx = sc.steps.length;
    const nextSteps = [...sc.steps, createEmptyStep(nextIdx + 1)];
    commit({ ...sc, steps: nextSteps });
    setExpandedSteps((prev) => ({ ...prev, [nextIdx]: true }));
  };

  const duplicateStep = (index: number) => {
    const source = sc.steps[index];
    const copy: EditableStep = {
      ...source,
      id: `${source.id}_copy`,
      name: source.name ? `${source.name} (cópia)` : "",
      headers: source.headers.map((h) => ({ ...h })),
      extract: source.extract.map((ex) => ({ ...ex })),
    };
    const nextSteps = [...sc.steps];
    nextSteps.splice(index + 1, 0, copy);
    commit({ ...sc, steps: nextSteps });
    setExpandedSteps((prev) => ({ ...prev, [index + 1]: true }));
  };

  const moveStep = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= sc.steps.length) {
      return;
    }
    const nextSteps = [...sc.steps];
    const [moved] = nextSteps.splice(index, 1);
    nextSteps.splice(target, 0, moved);
    commit({ ...sc, steps: nextSteps });
    setExpandedSteps((prev) => ({ ...prev, [target]: true }));
  };

  const removeStep = (index: number) => {
    const nextSteps = sc.steps.filter((_, idx) => idx !== index);
    commit({ ...sc, steps: nextSteps });
  };

  const handleBodyJsonChange = (stepIdx: number, step: EditableStep, rawJson: string) => {
    try {
      if (rawJson.trim() !== "") {
        JSON.parse(rawJson);
      }
      setJsonDrafts((prev) => {
        const next = { ...prev };
        delete next[stepIdx];
        return next;
      });
      updateStep(stepIdx, { bodyText: rawJson });
    } catch (err) {
      setJsonDrafts((prev) => ({
        ...prev,
        [stepIdx]: { text: rawJson, error: (err as Error).message },
      }));
    }
    void step;
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "var(--bg-app)",
      }}
    >
      {/* 1. Informações Gerais & Variáveis */}
      <div className="forge-card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={14} color="#22d3ee" />
            <span className="section-label">{t("visual.generalTitle")}</span>
          </div>
          <span className="micro-badge micro-slate">
            {t("visual.syncedWith", { format: isJson ? "JSON" : "YAML" })}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
          <Field label={t("visual.scenarioName")}>
            <input
              type="text"
              className="input"
              placeholder={t("visual.scenarioNamePlaceholder")}
              value={sc.name}
              onChange={(e) => commit({ ...sc, name: e.target.value })}
              style={{ width: "100%" }}
            />
          </Field>

          <Field label={t("visual.baseUrl")}>
            <input
              type="text"
              className="input mono"
              placeholder="http://127.0.0.1:8080"
              value={sc.baseUrl}
              onChange={(e) => commit({ ...sc, baseUrl: e.target.value })}
              style={{ width: "100%" }}
            />
          </Field>
        </div>

        {/* SSL/TLS local/autoassinado */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 10px",
            borderRadius: 8,
            border: `1px solid ${sc.insecureSkipVerify ? "rgba(245, 158, 11, 0.38)" : "var(--border)"}`,
            background: sc.insecureSkipVerify ? "rgba(245, 158, 11, 0.08)" : "#0d121b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldAlert size={14} color={sc.insecureSkipVerify ? "#fbbf24" : "#64748b"} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                {t("visual.tlsTitle")}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {t("visual.tlsDesc")}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sc.insecureSkipVerify}
            className={`toggle-pill ${sc.insecureSkipVerify ? "on" : ""}`}
            onClick={() => commit({ ...sc, insecureSkipVerify: !sc.insecureSkipVerify })}
            title={t("visual.tlsSwitchTitle")}
          >
            <span className="toggle-pill-thumb" />
          </button>
        </div>

        {/* Segredos via .env */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
              <KeyRound size={13} color="#38bdf8" />
              {t("visual.envTitle")} <code className="mono">.env</code>{" "}
              {envPreview?.exists ? t("visual.envKeysCount", { count: envPreview.keys.length }) : t("visual.envOptional")}
            </span>
            {envPreview?.exists && (
              <span className="micro-badge micro-live">
                {envPreview.isAutoDetected ? t("visual.envAutoDetected") : t("visual.envLinked")}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              className="input mono"
              placeholder={t("visual.envPlaceholder")}
              value={sc.envFile}
              onChange={(e) => commit({ ...sc, envFile: e.target.value })}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const picked = await window.loadsmith.workspace.pickEnvFile(
                  workspaceDir,
                  scenarioPath
                );
                if (!picked) {
                  return;
                }
                setEnvPreview(picked.preview);
                commit({ ...sc, envFile: picked.relativePath });
              }}
              title={t("visual.envBrowseTitle")}
            >
              <FolderSearch size={13} />
              {t("visual.envBrowse")}
            </button>
            {sc.envFile && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => commit({ ...sc, envFile: "" })}
                title={t("visual.envResetTitle")}
              >
                <Trash2 size={13} color="#f87171" />
              </button>
            )}
          </div>

          {envPreview?.error && (
            <div className="mono" style={{ fontSize: 11.5, color: "#fca5a5" }}>
              {envPreview.error}
            </div>
          )}

          {envPreview?.exists && envPreview.keys.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("visual.clickToCopy")}</span>
              {envPreview.keys.map((key) => {
                const placeholder = `{{env.${key}}}`;
                const isCopied = copiedEnvKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className="micro-badge micro-yaml"
                    style={{
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title={placeholder}
                    onClick={() => {
                      void navigator.clipboard.writeText(placeholder);
                      setCopiedEnvKey(key);
                      setTimeout(() => setCopiedEnvKey((prev) => (prev === key ? null : prev)), 1400);
                    }}
                  >
                    {isCopied && <Check size={10} />}
                    {placeholder}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {t("visual.envHint", { placeholder: `{{env.${phKey}}}` })}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
              <Variable size={13} color="#10b981" />
              {t("visual.initialVars", { count: sc.variables.length })}
            </span>
            <button
              type="button"
              className="btn"
              style={{ height: 25, fontSize: 11 }}
              onClick={() =>
                commit({
                  ...sc,
                  variables: [...sc.variables, { key: "", value: "" }],
                })
              }
            >
              <Plus size={12} />
              {t("visual.addVar")}
            </button>
          </div>

          {sc.variables.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {t("visual.noInitialVars", { placeholder: `{{${phName}}}` })}
            </div>
          ) : (
            <KeyValueList
              pairs={sc.variables}
              keyPlaceholder={t("visual.varKeyPlaceholder")}
              valuePlaceholder={t("visual.varValPlaceholder")}
              showTemplateChip
              onChange={(variables) => commit({ ...sc, variables })}
            />
          )}
        </div>
      </div>

      {/* 1.5 Fonte de Dados CSV (Data-Driven) */}
      <div className="forge-card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <FileSpreadsheet size={14} color="#10b981" />
            <span className="section-label">{t("visual.csvTitle")}</span>
          </div>
          {csvPreview?.exists && !csvPreview.error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="micro-badge micro-live tabular">
                {t("visual.csvBadge", { rows: csvPreview.rowCount, cols: csvPreview.headers.length })}
              </span>
              <button
                type="button"
                className="btn"
                style={{ height: 25, fontSize: 11 }}
                onClick={() => setShowCsvModal(true)}
              >
                <Table2 size={12} color="#22d3ee" />
                {t("visual.csvViewRecords")}
              </button>
            </div>
          )}
        </div>

        <CsvRecordsModal
          open={showCsvModal}
          scenarioPath={scenarioPath}
          csvPath={sc.dataFilePath}
          delimiter={sc.dataFileDelimiter}
          onClose={() => setShowCsvModal(false)}
        />

        <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
          {t("visual.csvHint", { placeholder: "{{userEmail}}" })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 115px 140px", gap: 8, alignItems: "end" }}>
          <Field label={t("visual.csvFileLabel")}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                className="input mono"
                placeholder="./users.csv"
                value={sc.dataFilePath}
                onChange={(e) => commit({ ...sc, dataFilePath: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const picked = await window.loadsmith.workspace.pickCsvFile(
                    workspaceDir,
                    scenarioPath
                  );
                  if (!picked) {
                    return;
                  }
                  setCsvPreview(picked.preview);
                  commit({ ...sc, dataFilePath: picked.relativePath });
                }}
                title={t("visual.csvBrowseTitle")}
              >
                <FolderSearch size={13} />
                {t("visual.envBrowse")}
              </button>
              {sc.dataFilePath && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setCsvPreview(null);
                    commit({ ...sc, dataFilePath: "" });
                  }}
                  title={t("visual.csvUnlinkTitle")}
                >
                  <Trash2 size={13} color="#f87171" />
                </button>
              )}
            </div>
          </Field>

          <Field label={t("visual.csvDelimiter")}>
            <select
              className="select mono"
              value={sc.dataFileDelimiter}
              onChange={(e) => commit({ ...sc, dataFileDelimiter: e.target.value })}
              style={{ width: "100%" }}
            >
              <option value=",">{t("visual.csvDelimComma")}</option>
              <option value=";">{t("visual.csvDelimSemi")}</option>
              <option value="\t">{t("visual.csvDelimTab")}</option>
            </select>
          </Field>

          <Field label={t("visual.csvDistribution")}>
            <select
              className="select"
              value={sc.dataFileMode}
              onChange={(e) => commit({ ...sc, dataFileMode: e.target.value as DataFileMode })}
              style={{ width: "100%" }}
            >
              <option value="round-robin">{t("visual.csvRoundRobin")}</option>
              <option value="random">{t("visual.csvRandom")}</option>
            </select>
          </Field>
        </div>

        {csvPreview && sc.dataFilePath.trim() !== "" && (
          <div
            style={{
              borderRadius: 8,
              border: `1px solid ${csvPreview.error ? "rgba(239, 68, 68, 0.35)" : "var(--border)"}`,
              background: "#0b1019",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {csvPreview.error ? (
              <div className="mono" style={{ fontSize: 11.5, color: "#fca5a5" }}>
                {csvPreview.error}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t("visual.availableVars")}</span>
                  {csvPreview.headers.map((col) => (
                    <span key={col} className="micro-badge micro-yaml">
                      {`{{${col}}}`}
                    </span>
                  ))}
                </div>

                {csvPreview.sampleRows.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      className="mono"
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 11,
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                          {csvPreview.headers.map((h) => (
                            <th key={h} style={{ padding: "4px 8px", fontWeight: 600 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.sampleRows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{ borderBottom: "1px solid rgba(30, 38, 54, 0.55)", color: "#cbd5e1" }}
                          >
                            {csvPreview.headers.map((_, cIdx) => (
                              <td key={cIdx} style={{ padding: "4px 8px" }}>
                                {row[cIdx] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Passos do Fluxo (Steps) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="section-label">{t("visual.stepsTitle")}</span>
            <span className="count-pill">{sc.steps.length}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setShowImportCurlModal(true)}
            >
              <Terminal size={13} color="#22d3ee" />
              {t("visual.importCurl")}
            </button>
            <button type="button" className="btn btn-primary" onClick={addStep}>
              <Plus size={13} />
              {t("visual.addStep")}
            </button>
          </div>
        </div>

        <ImportCurlModal
          open={showImportCurlModal}
          currentBaseUrl={sc.baseUrl}
          nextStepIndex={sc.steps.length + 1}
          onClose={() => setShowImportCurlModal(false)}
          onImport={({ step, applyBaseUrl, applyInsecureTls }) => {
            const usedIds = new Set(sc.steps.map((s) => s.id));
            let uniqueId = step.id;
            let suffix = 2;
            while (usedIds.has(uniqueId)) {
              uniqueId = `${step.id}_${suffix}`;
              suffix++;
            }
            const nextStep: EditableStep = { ...step, id: uniqueId };
            const nextSteps = [...sc.steps, nextStep];
            commit({
              ...sc,
              baseUrl: applyBaseUrl ?? sc.baseUrl,
              insecureSkipVerify: applyInsecureTls ? true : sc.insecureSkipVerify,
              steps: nextSteps,
            });
            setExpandedSteps((prev) => ({ ...prev, [nextSteps.length - 1]: true }));
          }}
        />

        {sc.steps.length === 0 ? (
          <div
            className="forge-card"
            style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}
          >
            {t("visual.noSteps")}
          </div>
        ) : (
          sc.steps.map((step, idx) => {
            const isOpen = expandedSteps[idx] ?? false;
            const activeSubTab = stepTabs[idx] ?? "assert";
            const draft = jsonDrafts[idx];
            const displayedBodyText = draft ? draft.text : step.bodyText;

            return (
              <div
                key={`step-${idx}`}
                className={`forge-card ${isOpen ? "active" : ""}`}
                style={{ padding: 0, overflow: "hidden" }}
              >
                {/* Step Card Header */}
                <div
                  onClick={() => setExpandedSteps((prev) => ({ ...prev, [idx]: !isOpen }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "9px 12px",
                    cursor: "pointer",
                    background: isOpen ? "rgba(14, 165, 233, 0.06)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      #{idx + 1}
                    </span>
                    <span className={`micro-badge ${methodClass(step.method)}`}>{step.method}</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {step.path || "/"}
                    </span>
                    {step.name && (
                      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                        — {step.name}
                      </span>
                    )}
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {step.assertStatus && (
                      <span className="micro-badge micro-live">HTTP {step.assertStatus}</span>
                    )}
                    {step.extract.length > 0 && (
                      <span className="micro-badge micro-yaml">
                        {step.extract.length} extract
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ height: 24, padding: "0 4px" }}
                      disabled={idx === 0}
                      title={t("visual.moveUp")}
                      onClick={() => moveStep(idx, -1)}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ height: 24, padding: "0 4px" }}
                      disabled={idx === sc.steps.length - 1}
                      title={t("visual.moveDown")}
                      onClick={() => moveStep(idx, 1)}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ height: 24, padding: "0 4px" }}
                      title={t("visual.duplicateStep")}
                      onClick={() => duplicateStep(idx)}
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ height: 24, padding: "0 4px" }}
                      title={t("visual.removeStep")}
                      onClick={() => removeStep(idx)}
                    >
                      <Trash2 size={12} color="#f87171" />
                    </button>
                  </div>
                </div>

                {/* Step Expanded Form */}
                {isOpen && (
                  <div
                    style={{
                      padding: 12,
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      background: "#0d121b",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 120px", gap: 8 }}>
                      <Field label={t("visual.method")}>
                        <select
                          className="select mono"
                          value={step.method}
                          onChange={(e) =>
                            updateStep(idx, { method: e.target.value as HttpMethod })
                          }
                          style={{ width: "100%" }}
                        >
                          {HTTP_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label={t("visual.path")}>
                        <input
                          type="text"
                          className="input mono"
                          placeholder="/orders/{{orderId}}"
                          value={step.path}
                          onChange={(e) => updateStep(idx, { path: e.target.value })}
                          style={{ width: "100%" }}
                        />
                      </Field>

                      <Field label={t("visual.timeoutMs")}>
                        <input
                          type="number"
                          min={0}
                          className="input mono"
                          placeholder="3000"
                          value={step.timeoutMs}
                          onChange={(e) => updateStep(idx, { timeoutMs: e.target.value })}
                          style={{ width: "100%" }}
                        />
                      </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                      <Field label={t("visual.stepId")}>
                        <input
                          type="text"
                          className="input mono"
                          placeholder="authLogin"
                          value={step.id}
                          onChange={(e) => updateStep(idx, { id: e.target.value })}
                          style={{ width: "100%" }}
                        />
                      </Field>

                      <Field label={t("visual.stepName")}>
                        <input
                          type="text"
                          className="input"
                          placeholder={t("visual.stepNamePlaceholder")}
                          value={step.name}
                          onChange={(e) => updateStep(idx, { name: e.target.value })}
                          style={{ width: "100%" }}
                        />
                      </Field>
                    </div>

                    {/* Step Sub-Tabs */}
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 6,
                      }}
                    >
                      <SubTabBtn
                        active={activeSubTab === "assert"}
                        label={t("visual.tabAsserts")}
                        onClick={() => setStepTabs((p) => ({ ...p, [idx]: "assert" }))}
                      />
                      <SubTabBtn
                        active={activeSubTab === "headers"}
                        label={t("visual.tabHeaders", { count: step.headers.length })}
                        onClick={() => setStepTabs((p) => ({ ...p, [idx]: "headers" }))}
                      />
                      <SubTabBtn
                        active={activeSubTab === "body"}
                        label={step.bodyMode === "none" ? t("visual.tabBody") : `${t("visual.tabBody")} (${step.bodyMode.toUpperCase()})`}
                        onClick={() => setStepTabs((p) => ({ ...p, [idx]: "body" }))}
                      />
                      <SubTabBtn
                        active={activeSubTab === "extract"}
                        label={t("visual.tabExtract", { count: step.extract.length })}
                        onClick={() => setStepTabs((p) => ({ ...p, [idx]: "extract" }))}
                      />
                    </div>

                    {activeSubTab === "assert" && (
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 150px", gap: 8 }}>
                        <Field label={t("visual.expectedStatus")}>
                          <input
                            type="number"
                            min={100}
                            max={599}
                            className="input mono"
                            placeholder="200"
                            value={step.assertStatus}
                            onChange={(e) => updateStep(idx, { assertStatus: e.target.value })}
                            style={{ width: "100%" }}
                          />
                        </Field>
                        <Field label={t("visual.bodyContains")}>
                          <input
                            type="text"
                            className="input mono"
                            placeholder={t("visual.bodyContainsPlaceholder")}
                            value={step.assertBodyContains}
                            onChange={(e) =>
                              updateStep(idx, { assertBodyContains: e.target.value })
                            }
                            style={{ width: "100%" }}
                          />
                        </Field>
                        <Field label={t("visual.maxDuration")}>
                          <input
                            type="number"
                            min={0}
                            className="input mono"
                            placeholder="250"
                            value={step.assertMaxDurationMs}
                            onChange={(e) =>
                              updateStep(idx, { assertMaxDurationMs: e.target.value })
                            }
                            style={{ width: "100%" }}
                          />
                        </Field>
                      </div>
                    )}

                    {activeSubTab === "headers" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ height: 24, fontSize: 11 }}
                            onClick={() =>
                              updateStep(idx, {
                                headers: [
                                  ...step.headers,
                                  { key: "Content-Type", value: "application/json" },
                                ],
                              })
                            }
                          >
                            + JSON Content-Type
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ height: 24, fontSize: 11 }}
                            onClick={() =>
                              updateStep(idx, {
                                headers: [
                                  ...step.headers,
                                  { key: "Authorization", value: "Bearer {{token}}" },
                                ],
                              })
                            }
                          >
                            + Auth Bearer
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ height: 24, fontSize: 11 }}
                            onClick={() =>
                              updateStep(idx, {
                                headers: [...step.headers, { key: "", value: "" }],
                              })
                            }
                          >
                            <Plus size={11} />
                            {t("visual.addCustomHeader")}
                          </button>
                        </div>

                        {step.headers.length > 0 && (
                          <KeyValueList
                            pairs={step.headers}
                            keyPlaceholder={t("visual.headerKeyPlaceholder")}
                            valuePlaceholder={t("visual.headerValPlaceholder")}
                            onChange={(headers) => updateStep(idx, { headers })}
                          />
                        )}
                      </div>
                    )}

                    {activeSubTab === "body" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {(["none", "json", "raw"] as BodyMode[]).map((bm) => (
                              <button
                                key={bm}
                                type="button"
                                className={`nav-tab ${step.bodyMode === bm ? "active" : ""}`}
                                style={{ height: 25, fontSize: 11 }}
                                onClick={() => {
                                  setJsonDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[idx];
                                    return next;
                                  });
                                  updateStep(idx, {
                                    bodyMode: bm,
                                    bodyText:
                                      bm === "json" && !step.bodyText.trim()
                                        ? "{\n  \n}"
                                        : bm === "none"
                                          ? ""
                                          : step.bodyText,
                                  });
                                }}
                              >
                                {bm === "none" ? t("visual.bodyNone") : bm === "json" ? "JSON" : t("visual.bodyRaw")}
                              </button>
                            ))}
                          </div>

                          {step.bodyMode === "json" && (
                            <button
                              type="button"
                              className="btn"
                              style={{ height: 24, fontSize: 11 }}
                              onClick={() => {
                                try {
                                  const formatted = JSON.stringify(
                                    JSON.parse(displayedBodyText || "{}"),
                                    null,
                                    2
                                  );
                                  handleBodyJsonChange(idx, step, formatted);
                                } catch {
                                  // Ignore format click while JSON is invalid.
                                }
                              }}
                            >
                              {t("visual.formatJson")}
                            </button>
                          )}
                        </div>

                        {step.bodyMode !== "none" && (
                          <>
                            <textarea
                              className="input mono"
                              rows={6}
                              value={displayedBodyText}
                              onChange={(e) => {
                                if (step.bodyMode === "json") {
                                  handleBodyJsonChange(idx, step, e.target.value);
                                } else {
                                  updateStep(idx, { bodyText: e.target.value });
                                }
                              }}
                              placeholder={
                                step.bodyMode === "json"
                                  ? '{\n  "email": "{{userEmail}}"\n}'
                                  : t("visual.bodyRawPlaceholder")
                              }
                              style={{
                                width: "100%",
                                height: "auto",
                                minHeight: 108,
                                padding: 10,
                                resize: "vertical",
                                lineHeight: 1.5,
                              }}
                            />
                            {draft?.error && (
                              <div className="mono" style={{ fontSize: 11, color: "#fca5a5" }}>
                                {t("visual.jsonIncomplete", { error: draft.error })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {activeSubTab === "extract" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                            {t("visual.extractHint", { placeholder: `{{${phVar}}}` })}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            style={{ height: 24, fontSize: 11 }}
                            onClick={() =>
                              updateStep(idx, {
                                extract: [...step.extract, { key: "", value: "" }],
                              })
                            }
                          >
                            <Plus size={11} />
                            {t("visual.extractAdd")}
                          </button>
                        </div>

                        {step.extract.length > 0 && (
                          <KeyValueList
                            pairs={step.extract}
                            keyPlaceholder={t("visual.extractKeyPlaceholder")}
                            valuePlaceholder={t("visual.extractValPlaceholder")}
                            showTemplateChip
                            onChange={(extract) => updateStep(idx, { extract })}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Perfil de Carga & Thresholds (SLA) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 12 }}>
        <div className="forge-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Flame size={14} color="#0ea5e9" />
            <span className="section-label">{t("visual.loadConfigTitle")}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t("visual.vus")}>
              <input
                type="number"
                min={1}
                className="input mono"
                placeholder="20"
                value={sc.loadVus}
                onChange={(e) => commit({ ...sc, loadVus: e.target.value })}
                style={{ width: "100%" }}
              />
            </Field>
            <Field label={t("visual.duration")}>
              <input
                type="text"
                className="input mono"
                placeholder="15s"
                value={sc.loadDuration}
                onChange={(e) => commit({ ...sc, loadDuration: e.target.value })}
                style={{ width: "100%" }}
              />
            </Field>
            <Field label={t("visual.rampUp")}>
              <input
                type="text"
                className="input mono"
                placeholder="5s"
                value={sc.loadRampUp}
                onChange={(e) => commit({ ...sc, loadRampUp: e.target.value })}
                style={{ width: "100%" }}
              />
            </Field>
            <Field label={t("visual.thinkTime")}>
              <input
                type="number"
                min={0}
                className="input mono"
                placeholder="100"
                value={sc.loadThinkTimeMs}
                onChange={(e) => commit({ ...sc, loadThinkTimeMs: e.target.value })}
                style={{ width: "100%" }}
              />
            </Field>
          </div>

          <Field label={t("visual.smokeIterations")}>
            <input
              type="number"
              min={1}
              className="input mono"
              placeholder="1"
              value={sc.smokeIterations}
              onChange={(e) => commit({ ...sc, smokeIterations: e.target.value })}
              style={{ width: "100%" }}
            />
          </Field>
        </div>

        <div className="forge-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <ShieldCheck size={14} color="#10b981" />
            <span className="section-label">{t("visual.thresholdsTitle")}</span>
          </div>

          <Field label={t("visual.p95Max")}>
            <input
              type="number"
              min={1}
              step="0.1"
              className="input mono"
              placeholder="250"
              value={sc.thresholdP95Ms}
              onChange={(e) => commit({ ...sc, thresholdP95Ms: e.target.value })}
              style={{ width: "100%" }}
            />
          </Field>

          <Field label={t("visual.maxErrorRate")}>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              className="input mono"
              placeholder="1.0"
              value={sc.thresholdMaxErrorRatePct}
              onChange={(e) => commit({ ...sc, thresholdMaxErrorRatePct: e.target.value })}
              style={{ width: "100%" }}
            />
          </Field>

          <div
            style={{
              marginTop: "auto",
              padding: "8px 10px",
              borderRadius: 7,
              background: "#0d121b",
              border: "1px solid var(--border)",
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Gauge size={14} color="#34d399" />
            <span>{t("visual.slaNote")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}

function SubTabBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nav-tab ${active ? "active" : ""}`}
      style={{ height: 25, fontSize: 11.5 }}
    >
      {label}
    </button>
  );
}

function KeyValueList({
  pairs,
  keyPlaceholder,
  valuePlaceholder,
  showTemplateChip = false,
  onChange,
}: {
  pairs: KeyValuePair[];
  keyPlaceholder: string;
  valuePlaceholder: string;
  showTemplateChip?: boolean;
  onChange: (next: KeyValuePair[]) => void;
}) {
  const { t } = useI18n();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {pairs.map((pair, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="text"
            className="input mono"
            placeholder={keyPlaceholder}
            value={pair.key}
            onChange={(e) => {
              const next = pairs.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p));
              onChange(next);
            }}
            style={{ flex: 0.9 }}
          />
          <input
            type="text"
            className="input mono"
            placeholder={valuePlaceholder}
            value={pair.value}
            onChange={(e) => {
              const next = pairs.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p));
              onChange(next);
            }}
            style={{ flex: 1.3 }}
          />
          {showTemplateChip && pair.key.trim() && (
            <span className="micro-badge micro-yaml">{`{{${pair.key.trim()}}}`}</span>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 27, padding: "0 6px" }}
            title={t("visual.removeItemTitle")}
            onClick={() => onChange(pairs.filter((_, i) => i !== idx))}
          >
            <Trash2 size={12} color="#f87171" />
          </button>
        </div>
      ))}
    </div>
  );
}

function methodClass(method: HttpMethod): string {
  switch (method) {
    case "GET":
    case "HEAD":
      return "micro-method-get";
    case "POST":
      return "micro-method-post";
    case "PUT":
    case "PATCH":
      return "micro-method-put";
    case "DELETE":
      return "micro-method-delete";
    default:
      return "micro-slate";
  }
}
