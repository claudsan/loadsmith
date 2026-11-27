import { describe, expect, it } from "vitest";
import {
  buildExecutiveHtml,
  buildExecutiveReport,
  buildExecutiveSummaryText,
} from "../executiveReport";
import type { MetricTickEvent } from "../../../types/runner-events";

function makeTick(elapsedMs: number, rps: number, p95Ms: number): MetricTickEvent {
  return {
    type: "METRIC_TICK",
    runId: "run-exec-1",
    elapsedMs,
    activeVus: 20,
    rps,
    p50Ms: p95Ms * 0.7,
    p95Ms,
    p99Ms: p95Ms * 1.1,
    successes: Math.round(rps),
    errors: 0,
  };
}

describe("executiveReport", () => {
  it("classifies healthy stable load test as ready with accurate capacity projection", () => {
    const ticks = [
      makeTick(1000, 100, 40),
      makeTick(2000, 110, 42),
      makeTick(3000, 105, 41),
      makeTick(4000, 105, 43),
    ];

    const report = buildExecutiveReport({
      runId: "run-1",
      scenarioName: "Checkout Black Friday",
      mode: "load",
      startedAt: "2026-11-26T22:00:00Z",
      totalRequests: 420,
      totalErrors: 0,
      errorRatePct: 0,
      p95Ms: 43,
      passedThresholds: true,
      violations: [],
      ticks,
      errorSamples: [],
      targetOpsPerMinute: 4000,
    });

    expect(report.verdict).toBe("ready");
    expect(report.opsPerMinute).toBe(6300);
    expect(report.targetAssessment?.meetsTarget).toBe(true);
    expect(report.uxRatingLabel).toBe("Instantânea");
    expect(report.stabilityLabel).toBe("Estável sob carga contínua");

    const text = buildExecutiveSummaryText(report);
    expect(text).toContain("[APROVADO]");
    expect(text).toContain("6.300");
  });

  it("flags progressive degradation and unmet Black Friday target as risk and escapes HTML", () => {
    const ticks = [
      makeTick(1000, 50, 100),
      makeTick(2000, 50, 120),
      makeTick(3000, 40, 260),
      makeTick(4000, 30, 320),
    ];

    const report = buildExecutiveReport({
      runId: "run-risk",
      scenarioName: "Pedidos <Crítico>",
      mode: "load",
      startedAt: "2026-11-26T22:00:00Z",
      totalRequests: 170,
      totalErrors: 10,
      errorRatePct: 5.88,
      p95Ms: 320,
      passedThresholds: false,
      violations: ["errorRatePct 5.88% exceeded 1%"],
      ticks,
      errorSamples: [
        {
          type: "ERROR_SAMPLE",
          runId: "run-risk",
          step: "createOrder",
          statusCode: 500,
          durationMs: 310,
          error: "timeout <db>",
          requestSummary: "POST /orders",
        },
      ],
      targetOpsPerMinute: 10000,
    });

    expect(report.verdict).toBe("risk");
    expect(report.stabilityLabel).toBe("Lentidão progressiva detectada");
    expect(report.targetAssessment?.meetsTarget).toBe(false);
    expect(report.failureGroups[0].step).toBe("createOrder");

    const html = buildExecutiveHtml(report);
    expect(html).toContain("Pedidos &lt;Crítico&gt;");
    expect(html).toContain("timeout &lt;db&gt;");
    expect(html).toContain("RISCO ALTO");
  });
});
