import { describe, expect, it } from "vitest";
import type { MetricTickEvent } from "../../../types/runner-events";
import { downsampleTicks, MAX_CHART_POINTS } from "../telemetryDownsample";

function makeTicks(count: number): MetricTickEvent[] {
  const out: MetricTickEvent[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      type: "METRIC_TICK",
      runId: "run-long",
      elapsedMs: (i + 1) * 500,
      activeVus: i === 2500 ? 80 : 20,
      rps: 100 + (i % 10),
      p50Ms: 12,
      p95Ms: i === 1234 ? 950 : 40,
      p99Ms: i === 1234 ? 1400 : 80,
      successes: 50,
      errors: i === 3000 ? 7 : 1,
    });
  }
  return out;
}

describe("telemetryDownsample", () => {
  it("returns original ticks unchanged when within MAX_CHART_POINTS", () => {
    const ticks = makeTicks(120);
    const res = downsampleTicks(ticks, MAX_CHART_POINTS);

    expect(res.isDownsampled).toBe(false);
    expect(res.originalCount).toBe(120);
    expect(res.points).toBe(ticks);
  });

  it("compresses 5000 ticks to 240 points while preserving first/last, peaks, and error totals", () => {
    const ticks = makeTicks(5000);
    const res = downsampleTicks(ticks, 240);

    expect(res.isDownsampled).toBe(true);
    expect(res.originalCount).toBe(5000);
    expect(res.points).toHaveLength(240);

    // First and last elapsed timestamps must match exactly.
    expect(res.points[0].elapsedMs).toBe(ticks[0].elapsedMs);
    expect(res.points[res.points.length - 1].elapsedMs).toBe(ticks[4999].elapsedMs);

    // Latency & VU spikes must not be smoothed out.
    expect(Math.max(...res.points.map((p) => p.p95Ms))).toBe(950);
    expect(Math.max(...res.points.map((p) => p.p99Ms))).toBe(1400);
    expect(Math.max(...res.points.map((p) => p.activeVus))).toBe(80);

    // Total errors across sampled buckets equals original total errors.
    const originalErrors = ticks.reduce((acc, t) => acc + t.errors, 0);
    const sampledErrors = res.points.reduce((acc, t) => acc + t.errors, 0);
    expect(sampledErrors).toBe(originalErrors);
  });
});
