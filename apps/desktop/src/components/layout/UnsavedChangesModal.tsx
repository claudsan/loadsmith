import { useEffect } from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n, type TranslationKey } from "../../i18n";

const ACTION_KEYS = new Set<string>([
  "unsaved.action.closeApp",
  "unsaved.action.switchScenario",
  "unsaved.action.switchWorkspace",
  "unsaved.action.selectFolder",
  "unsaved.action.createScenario",
]);

export function UnsavedChangesModal() {
  const { t } = useI18n();
  const pendingDirtyAction = useRunnerStore((s) => s.pendingDirtyAction);
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const parseError = useRunnerStore((s) => s.parseError);
  const resolveDirtyAction = useRunnerStore((s) => s.resolveDirtyAction);

  useEffect(() => {
    if (!pendingDirtyAction) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        void resolveDirtyAction("cancel");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [pendingDirtyAction, resolveDirtyAction]);

  if (!pendingDirtyAction) {
    return null;
  }

  const fileName = selectedFilePath?.split(/[\\/]/).pop() || "cenário";
  const actionLabel = ACTION_KEYS.has(pendingDirtyAction.label)
    ? t(pendingDirtyAction.label as TranslationKey)
    : pendingDirtyAction.label;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("unsaved.title")}
      onClick={() => void resolveDirtyAction("cancel")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(5, 8, 14, 0.8)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 94vw)",
          borderRadius: 12,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-chrome)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.72)",
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
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <AlertTriangle size={17} color="#fbbf24" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t("unsaved.title")}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void resolveDirtyAction("cancel")}
            title={t("curl.closeTitle")}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
            {t("unsaved.message", { file: fileName, action: actionLabel })}
          </div>

          {parseError && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(245, 158, 11, 0.35)",
                background: "rgba(245, 158, 11, 0.1)",
                color: "#fcd34d",
                fontSize: 11.5,
              }}
            >
              {t("unsaved.syntaxWarning", { error: parseError })}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "11px 16px",
            borderTop: "1px solid var(--border)",
            background: "#0f1520",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => void resolveDirtyAction("cancel")}
          >
            {t("unsaved.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => void resolveDirtyAction("discard")}
          >
            <Trash2 size={13} />
            {t("unsaved.discard")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void resolveDirtyAction("save")}
          >
            <Save size={13} />
            {t("unsaved.saveAndContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
