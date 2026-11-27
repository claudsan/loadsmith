import { useEffect, useMemo, useState } from "react";
import YAML from "yaml";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import {
  SCENARIO_TEMPLATES,
  type ScenarioTemplateId,
} from "../../app/utils/scenarioTemplates";
import { useI18n, type TranslationKey } from "../../i18n";
import type { ScenarioTreeNode } from "../../types/runner-events";

interface ParsedPreview {
  baseUrl?: string;
  stepsCount: number;
  vus?: number;
  duration?: string;
  p95Ms?: number;
  maxErrorRatePct?: number;
}

const TEMPLATE_KEYS: Record<ScenarioTemplateId, { labelKey: TranslationKey; descKey: TranslationKey }> = {
  "simple-api": { labelKey: "templates.simpleApi.label", descKey: "templates.simpleApi.desc" },
  "auth-flow": { labelKey: "templates.authFlow.label", descKey: "templates.authFlow.desc" },
  "csv-load": { labelKey: "templates.csvLoad.label", descKey: "templates.csvLoad.desc" },
};

function countScenarioFiles(nodes: ScenarioTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.kind === "file") {
      count++;
    } else if (node.children) {
      count += countScenarioFiles(node.children);
    }
  }
  return count;
}

function parsePreview(filePath: string | null, content: string): ParsedPreview | null {
  if (!filePath || !content.trim()) {
    return null;
  }
  try {
    const data = (
      filePath.toLowerCase().endsWith(".json") ? JSON.parse(content) : YAML.parse(content)
    ) as Record<string, unknown>;
    if (!data || typeof data !== "object") {
      return null;
    }
    const load = (data.load ?? {}) as Record<string, unknown>;
    const thresholds = (data.thresholds ?? {}) as Record<string, unknown>;
    const steps = Array.isArray(data.steps) ? data.steps : [];
    return {
      baseUrl: typeof data.baseUrl === "string" ? data.baseUrl : undefined,
      stepsCount: steps.length,
      vus: typeof load.vus === "number" ? load.vus : undefined,
      duration: typeof load.duration === "string" ? load.duration : undefined,
      p95Ms: typeof thresholds.p95Ms === "number" ? thresholds.p95Ms : undefined,
      maxErrorRatePct:
        typeof thresholds.maxErrorRatePct === "number" ? thresholds.maxErrorRatePct : undefined,
    };
  } catch {
    return null;
  }
}

export function ScenarioTree() {
  const { t } = useI18n();
  const tree = useRunnerStore((s) => s.tree);
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const editorContent = useRunnerStore((s) => s.editorContent);
  const globalSearch = useRunnerStore((s) => s.globalSearch);
  const mode = useRunnerStore((s) => s.mode);
  const windowMs = useRunnerStore((s) => s.windowMs);
  const runStatus = useRunnerStore((s) => s.runStatus);
  const selectFolder = useRunnerStore((s) => s.selectFolder);
  const refreshTree = useRunnerStore((s) => s.refreshTree);
  const openFile = useRunnerStore((s) => s.openFile);
  const createScenario = useRunnerStore((s) => s.createScenario);
  const renameScenario = useRunnerStore((s) => s.renameScenario);
  const duplicateScenario = useRunnerStore((s) => s.duplicateScenario);
  const deleteScenario = useRunnerStore((s) => s.deleteScenario);
  const setMode = useRunnerStore((s) => s.setMode);
  const setWindowMs = useRunnerStore((s) => s.setWindowMs);

  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [templateId, setTemplateId] = useState<ScenarioTemplateId>("simple-api");
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ScenarioTreeNode | null>(null);

  const isRunning = runStatus === "running" || runStatus === "stopping";
  const fileCount = useMemo(() => countScenarioFiles(tree), [tree]);
  const preview = useMemo(
    () => parsePreview(selectedFilePath, editorContent),
    [selectedFilePath, editorContent]
  );

  const filteredTree = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return tree;
    }
    return filterNodes(tree, q);
  }, [tree, globalSearch]);

  const activeTemplateKeys = TEMPLATE_KEYS[templateId] ?? TEMPLATE_KEYS["simple-api"];

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleteTarget]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      return;
    }
    await createScenario(newFileName.trim(), templateId);
    setNewFileName("");
    setCreating(false);
  };

  const startRename = (node: ScenarioTreeNode) => {
    setRenamingPath(node.path);
    setRenameValue(node.name);
  };

  const commitRename = async () => {
    if (!renamingPath) {
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingPath(null);
      return;
    }
    const ok = await renameScenario(renamingPath, trimmed);
    if (ok) {
      setRenamingPath(null);
    }
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => ({
      ...prev,
      [dirPath]: !(prev[dirPath] ?? true),
    }));
  };

  return (
    <aside className="forge-column">
      <div className="section-header">
        <div className="section-title-group">
          <span className="section-label">{t("tree.scenarios")}</span>
          <span className="count-pill">{fileCount}</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 24, padding: "0 5px" }}
            title={t("tree.newScenarioTitle")}
            onClick={() => setCreating((v) => !v)}
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 24, padding: "0 5px" }}
            title={t("tree.refreshTitle")}
            onClick={() => void refreshTree()}
          >
            <RefreshCw size={12} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 24, padding: "0 5px" }}
            title={t("tree.selectFolderTitle")}
            onClick={() => void selectFolder()}
          >
            <FolderOpen size={13} />
          </button>
        </div>
      </div>

      {creating && (
        <form
          onSubmit={(e) => void handleCreateSubmit(e)}
          style={{
            margin: "0 10px 8px",
            padding: 8,
            borderRadius: 9,
            border: "1px solid var(--border-strong)",
            background: "#0f1520",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              className="input mono"
              placeholder={t("tree.newPlaceholder")}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
              style={{ flex: 1, height: 27, minWidth: 0 }}
            />
            <button type="submit" className="btn btn-primary" style={{ height: 27, padding: "0 9px" }}>
              {t("tree.create")}
            </button>
          </div>
          <select
            className="select"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as ScenarioTemplateId)}
            style={{ height: 26, fontSize: 11.5 }}
            title={t("tree.templateSelectTitle")}
          >
            {SCENARIO_TEMPLATES.map((tpl) => {
              const keys = TEMPLATE_KEYS[tpl.id];
              return (
                <option key={tpl.id} value={tpl.id}>
                  {t("tree.templatePrefix", { label: t(keys.labelKey) })}
                </option>
              );
            })}
          </select>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.35 }}>
            {t(activeTemplateKeys.descKey)}
          </div>
        </form>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
        {filteredTree.length === 0 ? (
          <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>
            {t("tree.empty")}
          </div>
        ) : (
          filteredTree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedFilePath}
              expandedDirs={expandedDirs}
              renamingPath={renamingPath}
              renameValue={renameValue}
              isRunning={isRunning}
              onToggleDir={toggleDir}
              onSelectFile={(p) => void openFile(p, true)}
              onStartRename={startRename}
              onChangeRenameValue={setRenameValue}
              onCommitRename={() => void commitRename()}
              onCancelRename={() => setRenamingPath(null)}
              onDuplicate={(p) => void duplicateScenario(p)}
              onRequestDelete={setDeleteTarget}
            />
          ))
        )}

        <div
          className="section-header"
          style={{ padding: "12px 2px 4px", borderTop: "1px solid var(--border)", marginTop: 6 }}
        >
          <div className="section-title-group">
            <span className="section-label">{t("tree.profileSla")}</span>
            <span className="count-pill">{preview ? preview.stepsCount : 0}</span>
          </div>
        </div>

        <div className="forge-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                {mode === "load" ? t("tree.modeLoadActive") : t("tree.modeSmokeActive")}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {mode === "load" ? t("tree.modeLoadDesc") : t("tree.modeSmokeDesc")}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mode === "load"}
              disabled={isRunning}
              className={`toggle-pill ${mode === "load" ? "on" : ""}`}
              title={t("tree.toggleModeTitle")}
              onClick={() => setMode(mode === "smoke" ? "load" : "smoke")}
            >
              <span className="toggle-pill-thumb" />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span className="micro-badge micro-live">
              {mode === "load" ? "LOAD" : "SMOKE"}
            </span>
            <select
              className="select"
              value={windowMs}
              disabled={isRunning || mode === "smoke"}
              onChange={(e) => setWindowMs(Number(e.target.value))}
              style={{ height: 24, fontSize: 11, padding: "0 6px" }}
            >
              <option value={250}>{t("tree.windowOption", { ms: 250 })}</option>
              <option value={500}>{t("tree.windowOption", { ms: 500 })}</option>
              <option value={1000}>{t("tree.windowOption", { ms: 1000 })}</option>
            </select>
          </div>
        </div>

        {preview && (
          <div className="forge-card" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{t("tree.scenarioMetadata")}</div>
            {preview.baseUrl && (
              <div
                className="mono"
                title={preview.baseUrl}
                style={{
                  fontSize: 11,
                  color: "#38bdf8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {preview.baseUrl}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <span className="micro-badge micro-slate">{t("tree.stepsCount", { count: preview.stepsCount })}</span>
              {preview.vus !== undefined && (
                <span className="micro-badge micro-yaml">{t("tree.vusCount", { count: preview.vus })}</span>
              )}
              {preview.duration && (
                <span className="micro-badge micro-slate">{preview.duration}</span>
              )}
              {preview.p95Ms !== undefined && (
                <span className="micro-badge micro-live">p95 ≤ {preview.p95Ms}ms</span>
              )}
              {preview.maxErrorRatePct !== undefined && (
                <span className="micro-badge micro-method-post">err ≤ {preview.maxErrorRatePct}%</span>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("tree.deleteTitle")}
          onClick={() => setDeleteTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(5, 8, 14, 0.78)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(430px, 92vw)",
              borderRadius: 12,
              border: "1px solid var(--border-strong)",
              background: "var(--bg-chrome)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                background: "#0f1520",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trash2 size={16} color="#f87171" />
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{t("tree.deleteTitle")}</span>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: 16, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
              {t("tree.deleteMessage", { path: deleteTarget.relativePath })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "11px 16px",
                borderTop: "1px solid var(--border)",
                background: "#0f1520",
              }}
            >
              <button type="button" className="btn" onClick={() => setDeleteTarget(null)}>
                {t("tree.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  void deleteScenario(target.path);
                }}
              >
                <Trash2 size={13} />
                {t("tree.deleteConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

interface TreeNodeItemProps {
  node: ScenarioTreeNode;
  depth: number;
  selectedPath: string | null;
  expandedDirs: Record<string, boolean>;
  renamingPath: string | null;
  renameValue: string;
  isRunning: boolean;
  onToggleDir: (dirPath: string) => void;
  onSelectFile: (filePath: string) => void;
  onStartRename: (node: ScenarioTreeNode) => void;
  onChangeRenameValue: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDuplicate: (filePath: string) => void;
  onRequestDelete: (node: ScenarioTreeNode) => void;
}

function TreeNodeItem({
  node,
  depth,
  selectedPath,
  expandedDirs,
  renamingPath,
  renameValue,
  isRunning,
  onToggleDir,
  onSelectFile,
  onStartRename,
  onChangeRenameValue,
  onCommitRename,
  onCancelRename,
  onDuplicate,
  onRequestDelete,
}: TreeNodeItemProps) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);

  if (node.kind === "directory") {
    const isExpanded = expandedDirs[node.path] ?? true;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: depth * 8 }}>
        <button
          type="button"
          onClick={() => onToggleDir(node.path)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 6px",
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            textAlign: "left",
            borderRadius: 6,
          }}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Folder size={13} color="#38bdf8" />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{node.name}</span>
        </button>
        {isExpanded &&
          node.children?.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedDirs={expandedDirs}
              renamingPath={renamingPath}
              renameValue={renameValue}
              isRunning={isRunning}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
              onStartRename={onStartRename}
              onChangeRenameValue={onChangeRenameValue}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onDuplicate={onDuplicate}
              onRequestDelete={onRequestDelete}
            />
          ))}
      </div>
    );
  }

  const active = selectedPath === node.path;
  const isRenaming = renamingPath === node.path;
  const isJson = node.name.toLowerCase().endsWith(".json");
  const displayTitle = node.scenarioName || node.name;
  const showActions = !isRenaming && (hovered || active) && !isRunning;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`forge-card ${active ? "active" : ""}`}
      onClick={() => {
        if (!isRenaming) {
          onSelectFile(node.path);
        }
      }}
      onKeyDown={(e) => {
        if (!isRenaming && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelectFile(node.path);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${displayTitle} (${node.relativePath})`}
      style={{
        width: "100%",
        marginLeft: depth * 6,
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: "pointer",
      }}
    >
      {isRenaming ? (
        <div
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            className="input mono"
            value={renameValue}
            autoFocus
            onChange={(e) => onChangeRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancelRename();
              }
            }}
            style={{ flex: 1, height: 24, fontSize: 11.5, minWidth: 0 }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 24, padding: "0 5px" }}
            title={t("tree.confirmRename")}
            onClick={onCommitRename}
          >
            <Check size={12} color="#34d399" />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 24, padding: "0 5px" }}
            title={t("tree.cancel")}
            onClick={onCancelRename}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <span
              className={`dot ${active ? "dot-ok" : ""}`}
              style={!active ? { background: "#334155" } : undefined}
            />
            <span
              className={node.scenarioName ? undefined : "mono"}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: active ? "#f8fafc" : "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayTitle}
            </span>
          </div>
          <span className={`micro-badge ${isJson ? "micro-json" : "micro-yaml"}`}>
            {isJson ? "JSON" : "YAML"}
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {node.relativePath}
        </div>

        {showActions && (
          <div
            style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn-ghost"
              title={t("tree.renameTooltip")}
              onClick={() => onStartRename(node)}
              style={{
                width: 20,
                height: 20,
                display: "grid",
                placeItems: "center",
                border: "none",
                borderRadius: 5,
              }}
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              title={t("tree.duplicateTooltip")}
              onClick={() => onDuplicate(node.path)}
              style={{
                width: 20,
                height: 20,
                display: "grid",
                placeItems: "center",
                border: "none",
                borderRadius: 5,
              }}
            >
              <Copy size={11} />
            </button>
            <button
              type="button"
              className="btn-ghost"
              title={t("tree.deleteTooltip")}
              onClick={() => onRequestDelete(node)}
              style={{
                width: 20,
                height: 20,
                display: "grid",
                placeItems: "center",
                border: "none",
                borderRadius: 5,
                color: "#fca5a5",
              }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function filterNodes(nodes: ScenarioTreeNode[], query: string): ScenarioTreeNode[] {
  const result: ScenarioTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      if (
        node.relativePath.toLowerCase().includes(query) ||
        node.name.toLowerCase().includes(query) ||
        (node.scenarioName ?? "").toLowerCase().includes(query)
      ) {
        result.push(node);
      }
    } else if (node.children) {
      const children = filterNodes(node.children, query);
      if (children.length > 0) {
        result.push({ ...node, children });
      }
    }
  }
  return result;
}
