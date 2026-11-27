import type { MetricTickEvent } from "../../types/runner-events";

export const MAX_CHART_POINTS = 240;

export interface DownsampleResult {
  points: MetricTickEvent[];
  isDownsampled: boolean;
  originalCount: number;
}

/**
 * Compresses long time-series runs to at most maxPoints buckets while preserving
 * the first and last tick, latency peaks (max p95/p99), and error/success totals.
 */
export function downsampleTicks(
  ticks: MetricTickEvent[],
  maxPoints = MAX_CHART_POINTS
): DownsampleResult {
  const originalCount = ticks.length;
  const safeMax = Math.max(3, Math.trunc(maxPoints));

  if (originalCount <= safeMax) {
    return {
      points: ticks,
      isDownsampled: false,
      originalCount,
    };
  }

  const middleCount = originalCount - 2;
  const bucketCount = safeMax - 2;
  const points: MetricTickEvent[] = [ticks[0]];

  for (let b = 0; b < bucketCount; b++) {
    const start = 1 + Math.floor((b * middleCount) / bucketCount);
    const end = 1 + Math.floor(((b + 1) * middleCount) / bucketCount);
    if (start >= end) {
      continue;
    }

    let sumRps = 0;
    let sumP50 = 0;
    let maxP95 = 0;
    let maxP99 = 0;
    let maxVus = 0;
    let totalSuccesses = 0;
    let totalErrors = 0;

    const bucketLen = end - start;
    const lastTick = ticks[end - 1];

    for (let i = start; i < end; i++) {
      const t = ticks[i];
      sumRps += t.rps;
      sumP50 += t.p50Ms;
      if (t.p95Ms > maxP95) maxP95 = t.p95Ms;
      if (t.p99Ms > maxP99) maxP99 = t.p99Ms;
      if (t.activeVus > maxVus) maxVus = t.activeVus;
      totalSuccesses += t.successes;
      totalErrors += t.errors;
    }

    points.push({
      type: "METRIC_TICK",
      runId: lastTick.runId,
      elapsedMs: lastTick.elapsedMs,
      activeVus: maxVus,
      rps: sumRps / bucketLen,
      p50Ms: sumP50 / bucketLen,
      p95Ms: maxP95,
      p99Ms: maxP99,
      successes: totalSuccesses,
      errors: totalErrors,
    });
  }

  points.push(ticks[originalCount - 1]);

  return {
    points,
    isDownsampled: true,
    originalCount,
  };
}
