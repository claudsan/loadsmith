import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FolderOpen, FolderPlus, X } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n } from "../../i18n";

function getFolderName(dirPath: string, fallback: string): string {
  if (!dirPath) {
    return fallback;
  }
  return dirPath.split(/[\\/]/).filter(Boolean).pop() ?? dirPath;
}

export function WorkspaceMenu() {
  const { t } = useI18n();
  const workspaceDir = useRunnerStore((s) => s.workspaceDir);
  const recentWorkspaces = useRunnerStore((s) => s.recentWorkspaces);
  const selectFolder = useRunnerStore((s) => s.selectFolder);
  const openWorkspaceDir = useRunnerStore((s) => s.openWorkspaceDir);
  const removeRecentWorkspace = useRunnerStore((s) => s.removeRecentWorkspace);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const folderLabel = getFolderName(workspaceDir, t("workspace.selectTitle"));

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="workspace-switcher"
        onClick={() => setOpen((v) => !v)}
        title={workspaceDir || t("workspace.menuTooltip")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <FolderOpen size={13} color="#22d3ee" />
        <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {folderLabel}
        </span>
        <ChevronDown
          size={12}
          color="#65738e"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 140ms ease",
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 340,
            zIndex: 70,
            borderRadius: 10,
            border: "1px solid var(--border-strong)",
            background: "var(--bg-chrome)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#0f1520",
            }}
          >
            <span className="section-label" style={{ fontSize: 10.5 }}>
              {t("workspace.recentTitle")}
            </span>
            <span className="count-pill">{recentWorkspaces.length}</span>
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {recentWorkspaces.length === 0 ? (
              <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>
                {t("workspace.emptyRecent")}
              </div>
            ) : (
              recentWorkspaces.map((dir) => {
                const isActive = dir.toLowerCase() === workspaceDir.toLowerCase();
                const name = getFolderName(dir, t("workspace.selectTitle"));
                return (
                  <div
                    key={dir}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      borderRadius: 8,
                      border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.45)" : "transparent"}`,
                      background: isActive ? "rgba(16, 185, 129, 0.1)" : "transparent",
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        if (!isActive) {
                          void openWorkspaceDir(dir);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "7px 9px",
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                      }}
                    >
                      <FolderOpen size={14} color={isActive ? "#10b981" : "#98a4bc"} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: isActive ? "#f8fafc" : "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </div>
                        <div
                          className="mono"
                          title={dir}
                          style={{
                            fontSize: 10.5,
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {dir}
                        </div>
                      </div>
                      {isActive && <Check size={13} color="#34d399" style={{ flexShrink: 0 }} />}
                    </button>

                    {!isActive && (
                      <button
                        type="button"
                        className="btn-ghost"
                        title={t("workspace.removeRecent")}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentWorkspace(dir);
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 6,
                          marginRight: 4,
                        }}
                      >
                        <X size={12} color="#65738e" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              padding: 8,
              borderTop: "1px solid var(--border)",
              background: "#0f1520",
            }}
          >
            <button
              type="button"
              className="btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                setOpen(false);
                void selectFolder();
              }}
            >
              <FolderPlus size={13} color="#22d3ee" />
              {t("workspace.openOther")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
