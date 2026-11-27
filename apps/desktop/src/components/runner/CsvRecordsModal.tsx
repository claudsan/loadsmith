import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileSpreadsheet, Search, X } from "lucide-react";
import { useI18n } from "../../i18n";
import type { CsvRecordsPage } from "../../types/runner-events";

interface CsvRecordsModalProps {
  open: boolean;
  scenarioPath: string | null;
  csvPath: string;
  delimiter: string;
  onClose: () => void;
}

const PAGE_SIZE = 100;

export function CsvRecordsModal({
  open,
  scenarioPath,
  csvPath,
  delimiter,
  onClose,
}: CsvRecordsModalProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<CsvRecordsPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPage(0);
    setSearch("");
  }, [open, csvPath, delimiter]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !csvPath.trim()) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void window.loadsmith.workspace
      .readCsvRecords(scenarioPath, csvPath, delimiter, page * PAGE_SIZE, PAGE_SIZE, search)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData({
            resolvedPath: csvPath,
            headers: [],
            totalRows: 0,
            filteredRows: 0,
            offset: 0,
            limit: PAGE_SIZE,
            rows: [],
            error: (err as Error).message,
          });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, scenarioPath, csvPath, delimiter, page, search]);

  if (!open) {
    return null;
  }

  const fileName = csvPath.split(/[\\/]/).pop() || csvPath;
  const totalFiltered = data?.filteredRows ?? 0;
  const startIdx = totalFiltered === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, totalFiltered);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  const handleCopyPlaceholder = async (col: string) => {
    try {
      await navigator.clipboard.writeText(`{{${col}}}`);
      setCopiedVar(col);
      setTimeout(() => setCopiedVar((curr) => (curr === col ? null : curr)), 1400);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Registros de ${fileName}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
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
          width: "min(960px, 94vw)",
          height: "min(680px, 86vh)",
          borderRadius: 12,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-chrome)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "#0f1520",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <FileSpreadsheet size={18} color="#10b981" />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {fileName}
                </span>
                {data && !data.error && (
                  <span className="micro-badge micro-live tabular">
                    {t("csv.rowsColsBadge", { rows: data.totalRows, cols: data.headers.length })}
                  </span>
                )}
              </div>
              <div
                className="mono"
                title={data?.resolvedPath ?? csvPath}
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {data?.resolvedPath ?? csvPath}
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-ghost" onClick={onClose} title={t("curl.closeTitle")}>
            <X size={16} />
          </button>
        </div>

        {/* Search + Copyable Variable Chips */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "var(--bg-column)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="input"
                placeholder={t("csv.searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                autoFocus
                style={{ width: "100%", paddingLeft: 30 }}
              />
            </div>

            {search && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSearch("");
                  setPage(0);
                }}
              >
                {t("csv.clearSearch")}
              </button>
            )}
          </div>

          {data && data.headers.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {t("csv.clickToCopy")}
              </span>
              {data.headers.map((col) => {
                const isCopied = copiedVar === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => void handleCopyPlaceholder(col)}
                    className={`micro-badge ${isCopied ? "micro-live" : "micro-yaml"}`}
                    style={{ cursor: "pointer" }}
                    title={`{{${col}}}`}
                  >
                    {isCopied ? <Check size={10} /> : null}
                    {isCopied
                      ? t("csv.copiedVar", { placeholder: `{{${col}}}` })
                      : `{{${col}}}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Table Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#090d14" }}>
          {loading && !data ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--text-secondary)" }}>
              {t("csv.loading")}
            </div>
          ) : data?.error ? (
            <div style={{ padding: 24, color: "#fca5a5" }} className="mono">
              {data.error}
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>
              {search ? t("csv.emptySearch", { query: search }) : t("csv.empty")}
            </div>
          ) : (
            <table
              className="mono tabular"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    background: "#131a26",
                    borderBottom: "1px solid var(--border-strong)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <th style={{ padding: "8px 12px", width: 56, color: "var(--text-muted)" }}>#</th>
                  {data.headers.map((h) => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 700, color: "#38bdf8" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    style={{
                      borderBottom: "1px solid rgba(30, 38, 54, 0.6)",
                      color: "#e2e8f0",
                    }}
                  >
                    <td style={{ padding: "7px 12px", color: "var(--text-muted)" }}>
                      {row.rowNumber}
                    </td>
                    {data.headers.map((_, colIdx) => (
                      <td key={colIdx} style={{ padding: "7px 12px", maxWidth: 280, wordBreak: "break-word" }}>
                        {row.values[colIdx] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "9px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-chrome)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <span className="tabular">
            {totalFiltered === 0
              ? t("csv.zeroRows")
              : `${t("csv.showingRange", {
                  start: startIdx,
                  end: endIdx,
                  filtered: totalFiltered,
                })}${search && data ? t("csv.showingTotalSuffix", { total: data.totalRows }) : ""}`}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn"
              disabled={page <= 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={13} />
              {t("csv.prev")}
            </button>
            <span className="mono tabular" style={{ fontSize: 11.5 }}>
              {t("csv.pageOf", { page: page + 1, total: totalPages })}
            </span>
            <button
              type="button"
              className="btn"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("csv.next")}
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
