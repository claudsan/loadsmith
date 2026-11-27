import { describe, expect, it } from "vitest";
import { buildExecutiveHtml, buildExecutiveReport, buildExecutiveSummaryText } from "../../app/utils/executiveReport";
import { resolveSupportedLanguage, translate } from "../index";
import { enUS } from "../locales/enUS";
import { esES } from "../locales/esES";
import { ptBR } from "../locales/ptBR";
import type { MetricTickEvent } from "../../types/runner-events";

describe("i18n", () => {
  it("keeps full key parity and non-empty strings across pt-BR, en-US and es-ES", () => {
    const ptKeys = Object.keys(ptBR).sort();
    const enKeys = Object.keys(enUS).sort();
    const esKeys = Object.keys(esES).sort();

    expect(enKeys).toEqual(ptKeys);
    expect(esKeys).toEqual(ptKeys);

    for (const k of ptKeys) {
      expect(ptBR[k as keyof typeof ptBR].trim().length).toBeGreaterThan(0);
      expect(enUS[k as keyof typeof enUS].trim().length).toBeGreaterThan(0);
      expect(esES[k as keyof typeof esES].trim().length).toBeGreaterThan(0);
    }
  });

  it("interpolates placeholders cleanly in all three languages", () => {
    expect(translate("footer.scenariosCount", { count: 4 }, "pt-BR")).toBe("4 cenários");
    expect(translate("footer.scenariosCount", { count: 4 }, "en-US")).toBe("4 scenarios");
    expect(translate("footer.scenariosCount", { count: 4 }, "es-ES")).toBe("4 escenarios");
  });

  it("detects local OS/browser language and falls back to en-US for other locales", () => {
    expect(resolveSupportedLanguage(["pt-BR", "en-US"])).toBe("pt-BR");
    expect(resolveSupportedLanguage(["pt-PT"])).toBe("pt-BR");
    expect(resolveSupportedLanguage(["es-MX", "en-US"])).toBe("es-ES");
    expect(resolveSupportedLanguage(["en-GB"])).toBe("en-US");
    expect(resolveSupportedLanguage(["de-DE", "pt-BR"])).toBe("pt-BR");
    expect(resolveSupportedLanguage(["fr-FR", "ja-JP"])).toBe("en-US");
    expect(resolveSupportedLanguage([])).toBe("en-US");
  });

  it("generates executive reports and HTML exports in pt-BR, en-US and es-ES", () => {
    const ticks: MetricTickEvent[] = [
      {
        type: "METRIC_TICK",
        runId: "r-i18n",
        elapsedMs: 1000,
        activeVus: 10,
        rps: 50,
        p50Ms: 25,
        p95Ms: 60,
        p99Ms: 90,
        successes: 50,
        errors: 0,
      },
      {
        type: "METRIC_TICK",
        runId: "r-i18n",
        elapsedMs: 2000,
        activeVus: 10,
        rps: 50,
        p50Ms: 26,
        p95Ms: 62,
        p99Ms: 95,
        successes: 50,
        errors: 0,
      },
      {
        type: "METRIC_TICK",
        runId: "r-i18n",
        elapsedMs: 3000,
        activeVus: 10,
        rps: 50,
        p50Ms: 24,
        p95Ms: 58,
        p99Ms: 88,
        successes: 50,
        errors: 0,
      },
      {
        type: "METRIC_TICK",
        runId: "r-i18n",
        elapsedMs: 4000,
        activeVus: 10,
        rps: 50,
        p50Ms: 25,
        p95Ms: 61,
        p99Ms: 91,
        successes: 50,
        errors: 0,
      },
    ];

    const enReport = buildExecutiveReport({
      runId: "r-en",
      scenarioName: "Checkout",
      mode: "load",
      startedAt: "2026-11-26T22:00:00Z",
      totalRequests: 200,
      totalErrors: 0,
      errorRatePct: 0,
      p95Ms: 62,
      passedThresholds: true,
      violations: [],
      ticks,
      errorSamples: [],
      language: "en-US",
    });
    expect(enReport.verdictTitle).toContain("Approved");
    expect(buildExecutiveSummaryText(enReport)).toContain("[APPROVED]");
    expect(buildExecutiveHtml(enReport)).toContain('<html lang="en-US">');

    const esReport = buildExecutiveReport({
      runId: "r-es",
      scenarioName: "Checkout",
      mode: "load",
      startedAt: "2026-11-26T22:00:00Z",
      totalRequests: 200,
      totalErrors: 0,
      errorRatePct: 0,
      p95Ms: 62,
      passedThresholds: true,
      violations: [],
      ticks,
      errorSamples: [],
      language: "es-ES",
    });
    expect(esReport.verdictTitle).toContain("Aprobado");
    expect(buildExecutiveSummaryText(esReport)).toContain("[APROBADO]");
    expect(buildExecutiveHtml(esReport)).toContain('<html lang="es-ES">');
  });
});
