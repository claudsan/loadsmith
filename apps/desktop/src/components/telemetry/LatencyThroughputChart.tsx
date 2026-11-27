import { useMemo, useState } from "react";
import { downsampleTicks, MAX_CHART_POINTS } from "../../app/utils/telemetryDownsample";
import { useI18n } from "../../i18n";
import type { MetricTickEvent } from "../../types/runner-events";

interface LatencyThroughputChartProps {
  ticks: MetricTickEvent[];
  height?: number;
}

export function LatencyThroughputChart({ ticks, height = 230 }: LatencyThroughputChartProps) {
  const { t } = useI18n();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showP50, setShowP50] = useState(true);
  const [showP95, setShowP95] = useState(true);
  const [showP99, setShowP99] = useState(true);
  const [showRps, setShowRps] = useState(true);

  const width = 680;
  const padLeft = 48;
  const padRight = 48;
  const padTop = 18;
  const padBottom = 28;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const sampled = useMemo(() => downsampleTicks(ticks, MAX_CHART_POINTS), [ticks]);
  const chartTicks = sampled.points;

  const geometry = useMemo(() => {
    if (chartTicks.length === 0) {
      return null;
    }

    const maxLatRaw = Math.max(
      10,
      ...chartTicks.map((t) =>
        Math.max(showP99 ? t.p99Ms : 0, showP95 ? t.p95Ms : 0, showP50 ? t.p50Ms : 0)
      )
    );
    const maxLat = Math.ceil(maxLatRaw * 1.15);
    const maxRps = Math.max(5, Math.ceil(Math.max(...chartTicks.map((t) => t.rps)) * 1.2));

    const xAt = (idx: number) =>
      chartTicks.length === 1
        ? padLeft + innerW / 2
        : padLeft + (idx / (chartTicks.length - 1)) * innerW;

    const yLat = (val: number) => padTop + innerH - (val / maxLat) * innerH;
    const yRps = (val: number) => padTop + innerH - (val / maxRps) * innerH;

    const buildLine = (vals: number[], yFn: (v: number) => number) =>
      vals.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(" ");

    const rpsLine = buildLine(
      chartTicks.map((t) => t.rps),
      yRps
    );
    const rpsArea = `${rpsLine} L${xAt(chartTicks.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

    return {
      maxLat,
      maxRps,
      xAt,
      yLat,
      yRps,
      p50Path: buildLine(chartTicks.map((t) => t.p50Ms), yLat),
      p95Path: buildLine(chartTicks.map((t) => t.p95Ms), yLat),
      p99Path: buildLine(chartTicks.map((t) => t.p99Ms), yLat),
      rpsLine,
      rpsArea,
    };
  }, [chartTicks, innerW, innerH, showP50, showP95, showP99]);

  const isHovering = hoverIdx !== null && Boolean(chartTicks[hoverIdx]);
  const activeTick = isHovering
    ? chartTicks[hoverIdx as number]
    : chartTicks.length > 0
      ? chartTicks[chartTicks.length - 1]
      : null;

  return (
    <div
      style={{
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "#0e1523",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="panel-title">{t("chart.title")}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
          <SeriesToggle label="p50" color="#4ade80" active={showP50} onClick={() => setShowP50((v) => !v)} />
          <SeriesToggle label="p95" color="#a78bfa" active={showP95} onClick={() => setShowP95((v) => !v)} />
          <SeriesToggle label="p99" color="#f59e0b" active={showP99} onClick={() => setShowP99((v) => !v)} />
          <SeriesToggle label="RPS" color="#38bdf8" active={showRps} onClick={() => setShowRps((v) => !v)} />
        </div>
      </div>

      {!geometry ? (
        <div
          style={{
            height: height - 30,
            display: "grid",
            placeItems: "center",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          {t("chart.empty")}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: "auto", display: "block" }}
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * width - padLeft;
              const ratio = Math.max(0, Math.min(1, relX / innerW));
              const idx = Math.round(ratio * (chartTicks.length - 1));
              setHoverIdx(idx);
            }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padTop + innerH * (1 - frac);
              const latLabel = Math.round(geometry.maxLat * frac);
              const rpsLabel = Math.round(geometry.maxRps * frac);
              return (
                <g key={frac}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + innerW}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#687694"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {latLabel}
                  </text>
                  <text
                    x={padLeft + innerW + 6}
                    y={y + 3}
                    textAnchor="start"
                    fill="#38bdf8"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {rpsLabel}
                  </text>
                </g>
              );
            })}

            <text x={padLeft} y={11} fill="#9aa7c2" fontSize="10">
              ms
            </text>
            <text x={padLeft + innerW} y={11} textAnchor="end" fill="#38bdf8" fontSize="10">
              req/s
            </text>

            {showRps && (
              <>
                <path d={geometry.rpsArea} fill="rgba(56, 189, 248, 0.12)" />
                <path d={geometry.rpsLine} fill="none" stroke="#38bdf8" strokeWidth="1.8" />
              </>
            )}
            {showP50 && <path d={geometry.p50Path} fill="none" stroke="#4ade80" strokeWidth="1.8" />}
            {showP95 && <path d={geometry.p95Path} fill="none" stroke="#a78bfa" strokeWidth="2.1" />}
            {showP99 && <path d={geometry.p99Path} fill="none" stroke="#f59e0b" strokeWidth="1.6" />}

            {hoverIdx !== null && chartTicks[hoverIdx] && (
              <g>
                <line
                  x1={geometry.xAt(hoverIdx)}
                  y1={padTop}
                  x2={geometry.xAt(hoverIdx)}
                  y2={padTop + innerH}
                  stroke="#475569"
                  strokeWidth="1"
                />
                {showP95 && (
                  <circle
                    cx={geometry.xAt(hoverIdx)}
                    cy={geometry.yLat(chartTicks[hoverIdx].p95Ms)}
                    r="3.5"
                    fill="#a78bfa"
                  />
                )}
                {showRps && (
                  <circle
                    cx={geometry.xAt(hoverIdx)}
                    cy={geometry.yRps(chartTicks[hoverIdx].rps)}
                    r="3.5"
                    fill="#38bdf8"
                  />
                )}
              </g>
            )}

            <text
              x={padLeft}
              y={height - 6}
              fill="#687694"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {(chartTicks[0].elapsedMs / 1000).toFixed(1)}s
            </text>
            <text
              x={padLeft + innerW}
              y={height - 6}
              textAnchor="end"
              fill="#687694"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {(chartTicks[chartTicks.length - 1].elapsedMs / 1000).toFixed(1)}s
            </text>
          </svg>
        </div>
      )}

      <div
        className="mono tabular"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "6px 10px",
          borderRadius: 6,
          background: "#131d31",
          border: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <span>t={activeTick ? `${(activeTick.elapsedMs / 1000).toFixed(1)}s` : "--"}</span>
          <span style={{ color: "#38bdf8" }}>
            RPS: {activeTick ? activeTick.rps.toFixed(1) : "--"}
          </span>
          <span style={{ color: "#4ade80" }}>
            p50: {activeTick ? `${activeTick.p50Ms.toFixed(1)}ms` : "--"}
          </span>
          <span style={{ color: "#a78bfa" }}>
            p95: {activeTick ? `${activeTick.p95Ms.toFixed(1)}ms` : "--"}
          </span>
          <span style={{ color: "#f59e0b" }}>
            p99: {activeTick ? `${activeTick.p99Ms.toFixed(1)}ms` : "--"}
          </span>
          <span>VUs: {activeTick ? activeTick.activeVus : "--"}</span>
          <span>
            ok={activeTick ? activeTick.successes : 0} err={activeTick ? activeTick.errors : 0}
          </span>
        </div>

        <span style={{ fontSize: 10, color: isHovering ? "#38bdf8" : "var(--text-muted)" }}>
          {sampled.isDownsampled
            ? `${t("chart.downsampled", { pts: chartTicks.length, total: sampled.originalCount })} · `
            : ""}
          {activeTick ? (isHovering ? t("chart.cursor") : t("chart.lastTick")) : t("chart.waiting")}
        </span>
      </div>
    </div>
  );
}

function SeriesToggle({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 7px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: active ? "rgba(255,255,255,0.05)" : "transparent",
        opacity: active ? 1 : 0.45,
        fontSize: 11,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {label}
    </button>
  );
}
