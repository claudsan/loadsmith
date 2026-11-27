import { useMemo, useState } from "react";
import { AlertOctagon, Search } from "lucide-react";
import { useRunnerStore } from "../../app/store/runnerStore";
import { useI18n } from "../../i18n";
import type { ErrorSampleEvent } from "../../types/runner-events";

interface ErrorSamplesPanelProps {
  samples: ErrorSampleEvent[];
}

export function ErrorSamplesPanel({ samples }: ErrorSamplesPanelProps) {
  const { t } = useI18n();
  const selectedErrorIndex = useRunnerStore((s) => s.selectedErrorIndex);
  const setSelectedErrorIndex = useRunnerStore((s) => s.setSelectedErrorIndex);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return samples;
    }
    return samples.filter(
      (s) =>
        s.step.toLowerCase().includes(q) ||
        s.requestSummary.toLowerCase().includes(q) ||
        s.error.toLowerCase().includes(q) ||
        String(s.statusCode).includes(q)
    );
  }, [samples, query]);

  const activeSample = filtered[selectedErrorIndex] ?? filtered[0] ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        minHeight: 240,
        flex: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-chrome)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AlertOctagon size={14} color={samples.length > 0 ? "#f87171" : "#65738e"} />
          <span className="panel-title">{t("errors.title", { count: samples.length })}</span>
        </div>

        <div style={{ position: "relative", width: 220 }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            className="input"
            placeholder={t("errors.filterPlaceholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedErrorIndex(0);
            }}
            style={{ width: "100%", height: 26, paddingLeft: 26, fontSize: 11.5 }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: 16,
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          {samples.length === 0
            ? t("errors.empty")
            : t("errors.emptyFilter")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", flex: 1, minHeight: 0 }}>
          <div style={{ overflowY: "auto", borderRight: "1px solid var(--border)" }}>
            {filtered.map((item, idx) => {
              const selected = activeSample === item;
              return (
                <button
                  key={`${item.step}-${idx}`}
                  type="button"
                  onClick={() => setSelectedErrorIndex(idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                    border: "none",
                    borderBottom: "1px solid rgba(30, 38, 54, 0.7)",
                    background: selected ? "rgba(239, 68, 68, 0.14)" : "transparent",
                    textAlign: "left",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                      {item.step}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.requestSummary}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 5,
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#fca5a5",
                      }}
                    >
                      {item.statusCode || "ERR"}
                    </span>
                    <div className="mono tabular" style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                      {item.durationMs.toFixed(1)} ms
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {activeSample && (
            <div style={{ padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {t("errors.detailTitle")}
              </div>
              <div className="mono" style={{ fontSize: 12 }}>
                <strong>{t("errors.step")}</strong> {activeSample.step}
              </div>
              <div className="mono" style={{ fontSize: 12 }}>
                <strong>{t("errors.request")}</strong> {activeSample.requestSummary}
              </div>
              <div className="mono tabular" style={{ fontSize: 12 }}>
                <strong>{t("errors.status")}</strong> {activeSample.statusCode} · <strong>{t("errors.duration")}</strong>{" "}
                {activeSample.durationMs.toFixed(2)} ms
              </div>
              <div
                className="mono"
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: "#090d14",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  fontSize: 11.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {activeSample.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
