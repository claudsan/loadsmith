import { useMemo, useState } from "react";
import { Check, Copy, Database, Flame, Play, Terminal, Zap } from "lucide-react";
import logoImg from "../../assets/logo-full.png";
import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n } from "../../i18n";
import type { ScenarioTreeNode } from "../../types/runner-events";

function flattenScenarioFiles(nodes: ScenarioTreeNode[]): ScenarioTreeNode[] {
  const files: ScenarioTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      files.push(node);
    } else if (node.children) {
      files.push(...flattenScenarioFiles(node.children));
    }
  }
  return files;
}

export function ForgeHeroPanel() {
  const { t } = useI18n();
  const tree = useRunnerStore((s) => s.tree);
  const selectedFilePath = useRunnerStore((s) => s.selectedFilePath);
  const recentScenarioPaths = useRunnerStore((s) => s.recentScenarioPaths);
  const mode = useRunnerStore((s) => s.mode);
  const windowMs = useRunnerStore((s) => s.windowMs);
  const openFile = useRunnerStore((s) => s.openFile);
  const requestRun = useRunnerStore((s) => s.requestRun);
  const setWorkspaceTab = useRunnerStore((s) => s.setWorkspaceTab);

  const [copiedCmd, setCopiedCmd] = useState(false);

  const files = useMemo(() => flattenScenarioFiles(tree), [tree]);
  const recentFiles = useMemo(() => {
    const byPath = new Map(files.map((f) => [f.path, f]));
    const ordered: ScenarioTreeNode[] = [];
    const seen = new Set<string>();

    for (const p of recentScenarioPaths) {
      const match = byPath.get(p);
      if (match && !seen.has(match.path)) {
        ordered.push(match);
        seen.add(match.path);
      }
      if (ordered.length >= 3) {
        return ordered;
      }
    }

    for (const f of files) {
      if (!seen.has(f.path)) {
        ordered.push(f);
        seen.add(f.path);
      }
      if (ordered.length >= 3) {
        break;
      }
    }
    return ordered;
  }, [files, recentScenarioPaths]);

  const activeFile = files.find((f) => f.path === selectedFilePath) ?? recentFiles[0] ?? null;

  const cliCommand = useMemo(() => {
    const scenarioRef = activeFile?.path ?? "./examples/api-flow.yaml";
    const quoted = scenarioRef.includes(" ") ? `"${scenarioRef}"` : scenarioRef;
    return [
      `loadsmith --scenario ${quoted} \\`,
      `  --mode ${mode} \\`,
      `  --window ${windowMs}ms --pretty`,
    ].join("\n");
  }, [activeFile, mode, windowMs]);

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliCommand.replaceAll(" \\\n  ", " "));
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      // Clipboard may fail in restricted environments; ignore silently.
    }
  };

  return (
    <div className="forge-hero-bg">
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 8,
        }}
      >
        <div className="hero-logo-wrap">
          <img src={logoImg} alt="LoadSmith - Local Smoke & Load Forge" className="hero-logo-img" />
        </div>

        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {t("hero.title")}
        </h1>
        <p style={{ margin: 0, maxWidth: 440, fontSize: 12.5, color: "var(--text-secondary)" }}>
          {t("hero.subtitle")}
        </p>

        {/* Card de seleção dos últimos cenários utilizados (máximo 3) */}
        <div
          style={{
            width: "100%",
            marginTop: 6,
            borderRadius: 11,
            border: "1px solid var(--border)",
            background: "rgba(15, 20, 29, 0.9)",
            padding: 12,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="section-label" style={{ fontSize: 10.5 }}>
              {files.length > 3
                ? t("hero.recentOf", { shown: recentFiles.length, total: files.length })
                : t("hero.recentTitle", { shown: recentFiles.length })}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "#34d399" }}>
              {mode === "smoke" ? t("hero.modeSmoke") : t("hero.modeLoad")}
            </span>
          </div>

          {recentFiles.length === 0 ? (
            <div style={{ padding: 10, color: "var(--text-muted)", fontSize: 12 }}>
              {t("hero.emptyFolder")}
            </div>
          ) : (
            recentFiles.map((file) => {
              const isSelected = activeFile?.path === file.path;
              const isJson = file.name.toLowerCase().endsWith(".json");
              return (
                <div
                  key={file.path}
                  className={`forge-card ${isSelected ? "active" : ""}`}
                  onClick={() => void openFile(file.path, false)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Zap size={13} color={isSelected ? "#10b981" : "#65738e"} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 12.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {file.scenarioName || file.name}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {file.relativePath}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span className={`micro-badge ${isJson ? "micro-json" : "micro-yaml"}`}>
                      {isJson ? "JSON" : "YAML"}
                    </span>
                    <span className={`dot ${isSelected ? "dot-ok" : ""}`} style={!isSelected ? { background: "#334155" } : undefined} />
                  </div>
                </div>
              );
            })
          )}

          {activeFile && (
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={() => setWorkspaceTab("editor")}
              >
                {t("hero.openInEditor")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => requestRun("smoke")}
              >
                <Play size={12} />
                {t("hero.smokeBtn")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => requestRun("load")}
              >
                <Flame size={13} />
                {t("hero.loadBtn")}
              </button>
            </div>
          )}
        </div>

        {/* Bloco CLI copiável */}
        <div
          style={{
            width: "100%",
            borderRadius: 11,
            border: "1px solid var(--border)",
            background: "rgba(15, 20, 29, 0.92)",
            padding: 12,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Terminal size={13} color="#22d3ee" />
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {t("hero.cliTitle", { name: activeFile?.name ?? "api-flow.yaml" })}
              </span>
            </div>

            <button type="button" className="btn" style={{ height: 25, fontSize: 11 }} onClick={() => void handleCopyCli()}>
              {copiedCmd ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              {copiedCmd ? t("hero.copiedCmd") : t("hero.copyCmd")}
            </button>
          </div>

          <pre
            className="mono"
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: 8,
              background: "#090d14",
              border: "1px solid #192233",
              color: "#cbd5e1",
              fontSize: 11.5,
              lineHeight: 1.55,
              overflowX: "auto",
            }}
          >
            {cliCommand}
          </pre>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 4 }}>
          <CapabilityPill icon={<Zap size={12} color="#22d3ee" />} label={t("hero.pillRealtime")} />
          <CapabilityPill icon={<Flame size={12} color="#10b981" />} label={t("hero.pillSmokeLoad")} />
          <CapabilityPill icon={<Database size={12} color="#38bdf8" />} label={t("hero.pillOffline")} />
        </div>
      </div>
    </div>
  );
}

function CapabilityPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "rgba(19, 26, 38, 0.85)",
        color: "var(--text-secondary)",
        fontSize: 11.5,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
