import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ShieldAlert, Terminal, X } from "lucide-react";
import { parseCurlCommand } from "../../app/utils/curlParser";
import type { EditableStep } from "../../app/utils/scenarioCodec";
import { useI18n } from "../../i18n";

interface ImportCurlModalProps {
  open: boolean;
  currentBaseUrl: string;
  nextStepIndex: number;
  onClose: () => void;
  onImport: (payload: {
    step: EditableStep;
    applyBaseUrl: string | null;
    applyInsecureTls: boolean;
  }) => void;
}

export function ImportCurlModal({
  open,
  currentBaseUrl,
  nextStepIndex,
  onClose,
  onImport,
}: ImportCurlModalProps) {
  const { t } = useI18n();
  const [rawCurl, setRawCurl] = useState("");
  const [applyBaseUrlChecked, setApplyBaseUrlChecked] = useState(false);
  const [applyInsecureChecked, setApplyInsecureChecked] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }
    setRawCurl("");
    const trimmedBase = currentBaseUrl.trim();
    setApplyBaseUrlChecked(
      !trimmedBase || trimmedBase === "http://127.0.0.1:8080" || trimmedBase === "http://127.0.0.1:18090"
    );
    setApplyInsecureChecked(true);
  }, [open, currentBaseUrl]);

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

  const parsed = useMemo(() => {
    if (!rawCurl.trim()) {
      return { result: null, error: null };
    }
    return parseCurlCommand(rawCurl, nextStepIndex);
  }, [rawCurl, nextStepIndex]);

  if (!open) {
    return null;
  }

  const res = parsed.result;

  const handleConfirm = () => {
    if (!res) {
      return;
    }
    onImport({
      step: res.step,
      applyBaseUrl: applyBaseUrlChecked ? res.baseUrl : null,
      applyInsecureTls: res.insecureSkipVerify && applyInsecureChecked,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("curl.aria")}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
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
          width: "min(680px, 94vw)",
          maxHeight: "90vh",
          borderRadius: 12,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-chrome)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.72)",
          display: "flex",
          flexDirection: "column",
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
            <Terminal size={16} color="#22d3ee" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t("curl.title")}</span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} title={t("curl.closeTitle")}>
            <X size={15} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {t("curl.desc")}
          </div>

          <textarea
            className="input mono"
            rows={6}
            autoFocus
            placeholder={`curl -X POST https://api.exemplo.com/v1/orders \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer {{env.API_TOKEN}}" \\\n  -d '{"sku":"ABC-1","quantity":2}'`}
            value={rawCurl}
            onChange={(e) => setRawCurl(e.target.value)}
            style={{
              width: "100%",
              height: "auto",
              minHeight: 120,
              padding: 10,
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />

          {parsed.error && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgba(239, 68, 68, 0.45)",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#fca5a5",
                fontSize: 12,
              }}
            >
              {parsed.error}
            </div>
          )}

          {res && (
            <div
              className="forge-card"
              style={{
                padding: 12,
                background: "#0d121b",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span className="micro-badge micro-yaml">{res.step.method}</span>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#f8fafc" }}>
                    {res.step.path}
                  </span>
                </div>
                <span className="micro-badge micro-live">
                  {t("curl.previewMeta", { count: res.step.headers.length, mode: res.step.bodyMode })}
                </span>
              </div>

              <div className="mono" style={{ fontSize: 11.5, color: "#38bdf8" }}>
                {t("curl.detectedOrigin", { url: res.baseUrl })}
              </div>

              {res.step.headers.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {res.step.headers.map((h, i) => (
                    <span key={i} className="micro-badge micro-slate mono">
                      {h.key}
                    </span>
                  ))}
                </div>
              )}

              {res.warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    color: "#fbbf24",
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>{w}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={applyBaseUrlChecked}
                    onChange={(e) => setApplyBaseUrlChecked(e.target.checked)}
                  />
                  <span>
                    {t("curl.applyBaseUrl", { url: res.baseUrl })}
                  </span>
                </label>

                {res.insecureSkipVerify && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#fcd34d", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={applyInsecureChecked}
                      onChange={(e) => setApplyInsecureChecked(e.target.checked)}
                    />
                    <ShieldAlert size={13} />
                    <span>{t("curl.applyInsecureTls")}</span>
                  </label>
                )}
              </div>
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
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            {t("curl.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!res}
            onClick={handleConfirm}
          >
            <Check size={13} />
            {t("curl.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
