import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Code2, SlidersHorizontal, X } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n } from "../../i18n";
import { VisualScenarioEditor } from "./VisualScenarioEditor";

type EditorMode = "visual" | "code";

export function ScenarioEditor() {
  const { t } = useI18n();
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const workspaceDir = useRunnerStore((s) => s.workspaceDir);
  const editorContent = useRunnerStore((s) => s.editorContent);
  const parseError = useRunnerStore((s) => s.parseError);
  const isLoadingFile = useRunnerStore((s) => s.isLoadingFile);
  const updateEditorContent = useRunnerStore((s) => s.updateEditorContent);
  const saveCurrentFile = useRunnerStore((s) => s.saveCurrentFile);
  const setWorkspaceTab = useRunnerStore((s) => s.setWorkspaceTab);

  const [editorMode, setEditorMode] = useState<EditorMode>("visual");

  const isJson = Boolean(selectedFilePath?.toLowerCase().endsWith(".json"));

  const lineCount = useMemo(() => {
    if (!editorContent) {
      return 1;
    }
    return editorContent.split("\n").length;
  }, [editorContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void saveCurrentFile();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${editorContent.slice(0, start)}  ${editorContent.slice(end)}`;
      updateEditorContent(next);
      requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
  };

  return (
    <section className="panel" style={{ flex: 1, minHeight: 0, borderRight: "none" }}>
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="panel-title">{t("editor.title")}</span>

          <div
            style={{
              display: "inline-flex",
              padding: 2,
              borderRadius: 7,
              border: "1px solid var(--border)",
              background: "var(--bg-input)",
              gap: 2,
            }}
          >
            <button
              type="button"
              className={`nav-tab ${editorMode === "visual" ? "active" : ""}`}
              style={{ height: 23, padding: "0 9px", fontSize: 11.5 }}
              onClick={() => setEditorMode("visual")}
            >
              <SlidersHorizontal size={12} />
              {t("editor.visual")}
            </button>
            <button
              type="button"
              className={`nav-tab ${editorMode === "code" ? "active" : ""}`}
              style={{ height: 23, padding: "0 9px", fontSize: 11.5 }}
              onClick={() => setEditorMode("code")}
            >
              <Code2 size={12} />
              {isJson ? t("editor.codeJson") : t("editor.codeYaml")}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {selectedFilePath && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: parseError ? "#f87171" : "#34d399",
              }}
            >
              {parseError ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
              {parseError ? t("editor.syntaxInvalid") : t("editor.syntaxValid")}
            </span>
          )}

          <button
            type="button"
            className="btn"
            style={{ height: 26, padding: "0 9px", fontSize: 11.5 }}
            title={t("editor.closeTitle")}
            onClick={() => setWorkspaceTab("hero")}
          >
            <X size={13} />
            {t("editor.close")}
          </button>
        </div>
      </div>

      {!selectedFilePath ? (
        <div style={{ padding: 20, color: "var(--text-muted)" }}>
          {t("editor.empty")}
        </div>
      ) : isLoadingFile ? (
        <div style={{ padding: 20, color: "var(--text-secondary)" }}>{t("editor.loading")}</div>
      ) : (
        <>
          {editorMode === "visual" ? (
            <VisualScenarioEditor
              content={editorContent}
              isJson={isJson}
              workspaceDir={workspaceDir}
              scenarioPath={selectedFilePath}
              onChangeText={updateEditorContent}
              onSwitchToCode={() => setEditorMode("code")}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flex: 1,
                minHeight: 0,
                background: "#090d14",
                overflow: "hidden",
              }}
            >
              <div
                className="mono tabular"
                aria-hidden="true"
                style={{
                  width: 44,
                  padding: "12px 8px",
                  textAlign: "right",
                  color: "var(--text-muted)",
                  background: "#0b0f16",
                  borderRight: "1px solid var(--border)",
                  fontSize: 12,
                  lineHeight: "20px",
                  userSelect: "none",
                  overflow: "hidden",
                }}
              >
                {Array.from({ length: lineCount }, (_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>

              <textarea
                className="mono"
                value={editorContent}
                onChange={(e) => updateEditorContent(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  resize: "none",
                  padding: "12px 14px",
                  background: "transparent",
                  color: "#e2e8f0",
                  fontSize: 12.5,
                  lineHeight: "20px",
                  tabSize: 2,
                  overflow: "auto",
                  whiteSpace: "pre",
                }}
              />
            </div>
          )}

          {parseError && (
            <div
              className="mono"
              style={{
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.14)",
                borderTop: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#fca5a5",
                fontSize: 11.5,
              }}
            >
              {parseError}
            </div>
          )}

          <div
            className="mono"
            style={{
              padding: "6px 12px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-chrome)",
              color: "var(--text-muted)",
              fontSize: 11,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={selectedFilePath}
          >
            {selectedFilePath}
          </div>
        </>
      )}
    </section>
  );
}
