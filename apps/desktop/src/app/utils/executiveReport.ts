import type { SupportedLanguage } from "../../i18n/types";
import type {
  ErrorSampleEvent,
  MetricTickEvent,
  RunMode,
} from "../../types/runner-events";

export type ExecutiveVerdict = "ready" | "attention" | "risk";

export interface ExecutiveReportInput {
  runId: string;
  scenarioName: string;
  mode: RunMode;
  startedAt: string;
  totalRequests: number;
  totalErrors: number;
  errorRatePct: number;
  p95Ms: number;
  avgRps?: number;
  peakRps?: number;
  passedThresholds: boolean;
  violations: string[];
  ticks: MetricTickEvent[];
  errorSamples: ErrorSampleEvent[];
  targetOpsPerMinute?: number | null;
  language?: SupportedLanguage;
}

export interface BusinessAnswer {
  question: string;
  answer: string;
  status: ExecutiveVerdict;
}

export interface TargetCapacityAssessment {
  meetsTarget: boolean;
  marginPct: number;
  headline: string;
  detail: string;
}

export interface FailureGroup {
  step: string;
  statusCode: number;
  count: number;
  sampleMessage: string;
}

export type StabilityKind = "stable" | "oscillating" | "degrading" | "quick";

export interface ExecutiveReport {
  language: SupportedLanguage;
  verdict: ExecutiveVerdict;
  verdictTitle: string;
  verdictSubtitle: string;
  scenarioName: string;
  runId: string;
  modeLabel: string;
  executedAtFormatted: string;
  durationSec: number;
  maxActiveVus: number;
  successRatePct: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePct: number;
  avgRps: number;
  peakRps: number;
  opsPerMinute: number;
  opsPerHour: number;
  p95Ms: number;
  uxRatingLabel: string;
  uxExplanation: string;
  stabilityKind: StabilityKind;
  stabilityLabel: string;
  stabilityExplanation: string;
  degradationPct: number;
  targetOpsPerMinute: number | null;
  targetAssessment: TargetCapacityAssessment | null;
  businessAnswers: BusinessAnswer[];
  failureGroups: FailureGroup[];
  recommendations: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDate(iso: string, lang: SupportedLanguage): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return iso || (lang === "en-US" ? "Now" : lang === "es-ES" ? "Ahora" : "Agora");
  }
  return dt.toLocaleString(lang, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeUserExperience(
  p95Ms: number,
  lang: SupportedLanguage
): {
  label: string;
  explanation: string;
  status: ExecutiveVerdict;
} {
  if (p95Ms <= 100) {
    if (lang === "en-US") {
      return {
        label: "Instant",
        explanation: `95% of interactions responded within ${p95Ms.toFixed(0)} ms (under 0.1s). Feels immediate to the end user.`,
        status: "ready",
      };
    }
    if (lang === "es-ES") {
      return {
        label: "Instantánea",
        explanation: `El 95% de las interacciones respondieron en hasta ${p95Ms.toFixed(0)} ms (menos de 0,1s). Sensación inmediata para el usuario final.`,
        status: "ready",
      };
    }
    return {
      label: "Instantânea",
      explanation: `95% das interações responderam em até ${p95Ms.toFixed(0)} ms (menos de 0,1 segundo). Sensação imediata para o usuário final.`,
      status: "ready",
    };
  }
  if (p95Ms <= 300) {
    if (lang === "en-US") {
      return {
        label: "Very Fast",
        explanation: `95% of interactions responded within ${p95Ms.toFixed(0)} ms (under 0.3s). Smooth and responsive experience.`,
        status: "ready",
      };
    }
    if (lang === "es-ES") {
      return {
        label: "Muy Rápida",
        explanation: `El 95% de las interacciones respondieron en hasta ${p95Ms.toFixed(0)} ms (menos de 0,3s). Experiencia fluida y cómoda.`,
        status: "ready",
      };
    }
    return {
      label: "Muito Rápida",
      explanation: `95% das interações responderam em até ${p95Ms.toFixed(0)} ms (menos de 0,3 segundo). Experiência fluida e confortável.`,
      status: "ready",
    };
  }
  if (p95Ms <= 800) {
    if (lang === "en-US") {
      return {
        label: "Acceptable",
        explanation: `95% of interactions took up to ${p95Ms.toFixed(0)} ms. Works well, though there is room to optimize before heavy peaks.`,
        status: "attention",
      };
    }
    if (lang === "es-ES") {
      return {
        label: "Aceptable",
        explanation: `El 95% de las interacciones tardaron hasta ${p95Ms.toFixed(0)} ms. Funciona bien, pero conviene optimizar antes de grandes picos.`,
        status: "attention",
      };
    }
    return {
      label: "Aceitável",
      explanation: `95% das interações levaram até ${p95Ms.toFixed(0)} ms. Funciona bem, mas há margem para otimização antes de grandes picos.`,
      status: "attention",
    };
  }
  if (p95Ms <= 1800) {
    if (lang === "en-US") {
      return {
        label: "Slow",
        explanation: `95% of interactions reached ${(p95Ms / 1000).toFixed(2)} seconds. Users may notice sluggishness or abandon the flow.`,
        status: "attention",
      };
    }
    if (lang === "es-ES") {
      return {
        label: "Lenta",
        explanation: `El 95% de las interacciones alcanzó ${(p95Ms / 1000).toFixed(2)} segundos. Los usuarios pueden notar lentitud o abandonar la pantalla.`,
        status: "attention",
      };
    }
    return {
      label: "Lenta",
      explanation: `95% das interações chegaram a ${(p95Ms / 1000).toFixed(2)} segundos. Usuários podem perceber travamentos ou abandonar a tela.`,
      status: "attention",
    };
  }
  if (lang === "en-US") {
    return {
      label: "Critical",
      explanation: `Response time reached ${(p95Ms / 1000).toFixed(2)} seconds, creating high risk of timeouts and outage under peak traffic.`,
      status: "risk",
    };
  }
  if (lang === "es-ES") {
    return {
      label: "Crítica",
      explanation: `El tiempo de respuesta alcanzó ${(p95Ms / 1000).toFixed(2)} segundos, generando alto riesgo de timeouts y caída bajo pico.`,
      status: "risk",
    };
  }
  return {
    label: "Crítica",
    explanation: `O tempo de resposta atingiu ${(p95Ms / 1000).toFixed(2)} segundos, gerando alto risco de timeout e queda sob pico.`,
    status: "risk",
  };
}

function analyzeStability(
  ticks: MetricTickEvent[],
  mode: RunMode,
  lang: SupportedLanguage
): {
  kind: StabilityKind;
  label: string;
  explanation: string;
  degradationPct: number;
  status: ExecutiveVerdict;
} {
  if (mode === "smoke" || ticks.length < 4) {
    if (lang === "en-US") {
      return {
        kind: "quick",
        label: "Quick functional check",
        explanation:
          mode === "smoke"
            ? "This was a quick functional validation (Smoke). To measure peak resilience (e.g., Black Friday), run in Load mode as well."
            : "The run lasted only a few seconds, not enough to measure degradation trends over time.",
        degradationPct: 0,
        status: mode === "smoke" ? "attention" : "ready",
      };
    }
    if (lang === "es-ES") {
      return {
        kind: "quick",
        label: "Prueba funcional puntual",
        explanation:
          mode === "smoke"
            ? "Fue una validación funcional rápida (Smoke). Para medir resistencia en pico (ej.: Black Friday), ejecuta también en modo Carga (Load)."
            : "La ejecución duró pocos segundos y no permite medir tendencia de degradación en el tiempo.",
        degradationPct: 0,
        status: mode === "smoke" ? "attention" : "ready",
      };
    }
    return {
      kind: "quick",
      label: "Teste funcional pontual",
      explanation:
        mode === "smoke"
          ? "Este foi um teste de validação rápida do fluxo (Smoke). Para medir resistência a pico (ex.: Black Friday), rode também em modo Carga (Load)."
          : "A execução durou poucos segundos, não permitindo medir tendência de desgaste ao longo do tempo.",
      degradationPct: 0,
      status: mode === "smoke" ? "attention" : "ready",
    };
  }

  const mid = Math.floor(ticks.length / 2);
  const firstHalf = ticks.slice(0, mid);
  const secondHalf = ticks.slice(mid);

  const avgFirst =
    firstHalf.reduce((acc, t) => acc + t.p95Ms, 0) / Math.max(1, firstHalf.length);
  const avgSecond =
    secondHalf.reduce((acc, t) => acc + t.p95Ms, 0) / Math.max(1, secondHalf.length);

  if (avgFirst <= 0) {
    return {
      kind: "stable",
      label:
        lang === "en-US"
          ? "Stable under sustained load"
          : lang === "es-ES"
            ? "Estable bajo carga continua"
            : "Estável sob carga contínua",
      explanation:
        lang === "en-US"
          ? "The system maintained consistent response times throughout the run."
          : lang === "es-ES"
            ? "El sistema mantuvo tiempos consistentes durante toda la prueba."
            : "O sistema manteve tempos consistentes durante todo o teste.",
      degradationPct: 0,
      status: "ready",
    };
  }

  const degradationPct = round2(((avgSecond - avgFirst) / avgFirst) * 100);
  if (degradationPct >= 45) {
    if (lang === "en-US") {
      return {
        kind: "degrading",
        label: "Progressive slowdown detected",
        explanation: `The system became ${degradationPct.toFixed(0)}% slower in the second half of the test, signaling a bottleneck or queuing under sustained traffic.`,
        degradationPct,
        status: "risk",
      };
    }
    if (lang === "es-ES") {
      return {
        kind: "degrading",
        label: "Lentitud progresiva detectada",
        explanation: `El sistema fue un ${degradationPct.toFixed(0)}% más lento en la segunda mitad de la prueba, señalando posible cuello de botella o cola acumulada.`,
        degradationPct,
        status: "risk",
      };
    }
    return {
      kind: "degrading",
      label: "Lentidão progressiva detectada",
      explanation: `O sistema ficou ${degradationPct.toFixed(0)}% mais lento na segunda metade do teste, sinalizando possível gargalo ou fila acumulando sob uso contínuo.`,
      degradationPct,
      status: "risk",
    };
  }
  if (degradationPct >= 20) {
    if (lang === "en-US") {
      return {
        kind: "oscillating",
        label: "Moderate oscillation",
        explanation: `Response time increased by ${degradationPct.toFixed(0)}% over the course of the run. Worth monitoring in longer tests.`,
        degradationPct,
        status: "attention",
      };
    }
    if (lang === "es-ES") {
      return {
        kind: "oscillating",
        label: "Oscilación moderada",
        explanation: `Hubo un aumento del ${degradationPct.toFixed(0)}% en el tiempo de respuesta durante la prueba. Conviene monitorear en pruebas más largas.`,
        degradationPct,
        status: "attention",
      };
    }
    return {
      kind: "oscillating",
      label: "Oscilação moderada",
      explanation: `Houve um aumento de ${degradationPct.toFixed(0)}% no tempo de resposta ao longo do teste. Vale monitorar em testes mais longos.`,
      degradationPct,
      status: "attention",
    };
  }
  if (lang === "en-US") {
    return {
      kind: "stable",
      label: "Stable under sustained load",
      explanation:
        "The system did not accumulate slowdown from start to finish, keeping consistent responses under pressure.",
      degradationPct,
      status: "ready",
    };
  }
  if (lang === "es-ES") {
    return {
      kind: "stable",
      label: "Estable bajo carga continua",
      explanation:
        "El sistema no acumuló lentitud de principio a fin, manteniendo respuestas consistentes bajo presión.",
      degradationPct,
      status: "ready",
    };
  }
  return {
    kind: "stable",
    label: "Estável sob carga contínua",
    explanation:
      "O sistema não acumulou lentidão do início ao fim da execução, mantendo resposta consistente sob pressão.",
    degradationPct,
    status: "ready",
  };
}

function groupFailures(samples: ErrorSampleEvent[]): FailureGroup[] {
  const map = new Map<string, FailureGroup>();
  for (const s of samples) {
    const key = `${s.step}::${s.statusCode}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        step: s.step,
        statusCode: s.statusCode,
        count: 1,
        sampleMessage: s.error,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function buildExecutiveReport(input: ExecutiveReportInput): ExecutiveReport {
  const lang: SupportedLanguage = input.language ?? "pt-BR";
  const ticks = input.ticks ?? [];
  const durationMs =
    ticks.length > 0 ? Math.max(...ticks.map((t) => t.elapsedMs)) : 0;
  const durationSec = round2(durationMs / 1000);
  const maxActiveVus =
    ticks.length > 0 ? Math.max(...ticks.map((t) => t.activeVus), 1) : 1;

  const computedAvgRps =
    input.avgRps !== undefined && input.avgRps > 0
      ? input.avgRps
      : ticks.length > 0
        ? ticks.reduce((acc, t) => acc + t.rps, 0) / ticks.length
        : durationSec > 0
          ? input.totalRequests / durationSec
          : 0;

  const computedPeakRps =
    input.peakRps !== undefined && input.peakRps > 0
      ? input.peakRps
      : ticks.length > 0
        ? Math.max(...ticks.map((t) => t.rps))
        : computedAvgRps;

  const avgRps = round2(computedAvgRps);
  const peakRps = round2(computedPeakRps);
  const opsPerMinute = Math.round(avgRps * 60);
  const opsPerHour = Math.round(avgRps * 3600);
  const successRatePct = round2(Math.max(0, 100 - input.errorRatePct));

  const ux = describeUserExperience(input.p95Ms, lang);
  const stability = analyzeStability(ticks, input.mode, lang);
  const failureGroups = groupFailures(input.errorSamples ?? []);

  const targetOps =
    input.targetOpsPerMinute && input.targetOpsPerMinute > 0
      ? Math.round(input.targetOpsPerMinute)
      : null;

  let targetAssessment: TargetCapacityAssessment | null = null;
  let targetStatus: ExecutiveVerdict = "ready";

  if (targetOps !== null) {
    const marginPct = round2(((opsPerMinute - targetOps) / targetOps) * 100);
    const opsStr = opsPerMinute.toLocaleString(lang);
    const targetStr = targetOps.toLocaleString(lang);

    if (opsPerMinute >= targetOps * 1.2) {
      targetStatus = "ready";
      targetAssessment = {
        meetsTarget: true,
        marginPct,
        headline:
          lang === "en-US"
            ? `Meets target with ${marginPct.toFixed(0)}% headroom`
            : lang === "es-ES"
              ? `Soporta la meta con ${marginPct.toFixed(0)}% de margen`
              : `Suporta a meta com ${marginPct.toFixed(0)}% de folga`,
        detail:
          lang === "en-US"
            ? `The system delivered ~${opsStr} ops/min vs. the ${targetStr}/min target.`
            : lang === "es-ES"
              ? `El sistema entregó ~${opsStr} operaciones/minuto frente a la meta de ${targetStr}/min.`
              : `O sistema entregou ~${opsStr} operações/minuto frente à meta de ${targetStr}/min.`,
      };
    } else if (opsPerMinute >= targetOps) {
      targetStatus = "attention";
      targetAssessment = {
        meetsTarget: true,
        marginPct,
        headline:
          lang === "en-US"
            ? `Meets target, but tight (${marginPct.toFixed(0)}% margin)`
            : lang === "es-ES"
              ? `Alcanza la meta, pero al límite (${marginPct.toFixed(0)}% de margen)`
              : `Atinge a meta, porém no limite (${marginPct.toFixed(0)}% de margem)`,
        detail:
          lang === "en-US"
            ? `Delivered ${opsStr}/min vs. ${targetStr}/min expected. At least 20% headroom is recommended for unexpected spikes.`
            : lang === "es-ES"
              ? `Entregó ${opsStr}/min frente a ${targetStr}/min esperados. Se recomienda un margen mínimo del 20% para picos inesperados.`
              : `Entregou ${opsStr}/min contra ${targetStr}/min esperados. Recomenda-se margem mínima de 20% para picos inesperados.`,
      };
    } else {
      targetStatus = "risk";
      targetAssessment = {
        meetsTarget: false,
        marginPct,
        headline:
          lang === "en-US"
            ? `Below expected target (${Math.abs(marginPct).toFixed(0)}% short)`
            : lang === "es-ES"
              ? `Por debajo de la meta esperada (${Math.abs(marginPct).toFixed(0)}% menos)`
              : `Abaixo da meta esperada (${Math.abs(marginPct).toFixed(0)}% abaixo)`,
        detail:
          lang === "en-US"
            ? `Delivered ${opsStr}/min, while expected traffic asks for ${targetStr}/min.`
            : lang === "es-ES"
              ? `Entregó ${opsStr}/min, mientras el escenario esperado requiere ${targetStr}/min.`
              : `Entregou ${opsStr}/min, enquanto o cenário esperado pede ${targetStr}/min.`,
      };
    }
  }

  let verdict: ExecutiveVerdict = "ready";
  if (
    !input.passedThresholds ||
    input.errorRatePct >= 2 ||
    ux.status === "risk" ||
    stability.status === "risk" ||
    targetStatus === "risk"
  ) {
    verdict = "risk";
  } else if (
    input.errorRatePct > 0 ||
    ux.status === "attention" ||
    stability.status === "attention" ||
    targetStatus === "attention"
  ) {
    verdict = "attention";
  }

  const verdictTitle =
    lang === "en-US"
      ? verdict === "ready"
        ? "Approved — System handled the tested load with headroom"
        : verdict === "attention"
          ? "Attention — Worked, but needs care for large spikes"
          : "High Risk — System did not safely handle the demand"
      : lang === "es-ES"
        ? verdict === "ready"
          ? "Aprobado — El sistema soportó la carga probada con margen"
          : verdict === "attention"
            ? "Atención — Funcionó, pero requiere cuidados ante grandes picos"
            : "Riesgo Alto — El sistema no soportó el nivel de exigencia con seguridad"
        : verdict === "ready"
          ? "Aprovado — Sistema aguentou a carga testada com folga"
          : verdict === "attention"
            ? "Atenção — Funcionou, mas exige cuidados para grandes picos"
            : "Risco Alto — Sistema não suportou o nível de exigência com segurança";

  const verdictSubtitle =
    lang === "en-US"
      ? verdict === "ready"
        ? `${successRatePct.toFixed(2)}% reliability, ${ux.label.toLowerCase()} responses, and stable behavior throughout execution.`
        : verdict === "attention"
          ? input.mode === "smoke"
            ? "The flow passed the quick functional check, but you should run Load mode to prove peak Black Friday capacity."
            : `Attention points detected (${successRatePct.toFixed(2)}% success rate, ${ux.label.toLowerCase()} response) before operating at peak.`
          : `${input.totalErrors} failures (${input.errorRatePct.toFixed(2)}%) or SLA violation detected; real risk of outage or severe slowdown at peak.`
      : lang === "es-ES"
        ? verdict === "ready"
          ? `Confiabilidad del ${successRatePct.toFixed(2)}%, respuesta ${ux.label.toLowerCase()} y comportamiento estable durante la ejecución.`
          : verdict === "attention"
            ? input.mode === "smoke"
              ? "El flujo superó la verificación funcional rápida, pero es necesario ejecutar en modo Carga (Load) para validar volumen de Black Friday."
              : `Se observaron puntos de atención (tasa de éxito ${successRatePct.toFixed(2)}%, respuesta ${ux.label.toLowerCase()}) antes de operar en pico máximo.`
            : `Ocurrieron ${input.totalErrors} fallos (${input.errorRatePct.toFixed(2)}%) o incumplimiento de metas; riesgo real de caída o lentitud severa en pico.`
        : verdict === "ready"
          ? `Confiabilidade de ${successRatePct.toFixed(2)}%, resposta ${ux.label.toLowerCase()} e comportamento estável ao longo da execução.`
          : verdict === "attention"
            ? input.mode === "smoke"
              ? "O fluxo passou na verificação funcional rápida, mas é necessário rodar o modo Carga (Load) para comprovar volume de Black Friday."
              : `Foram observados pontos de atenção (taxa de sucesso ${successRatePct.toFixed(2)}%, resposta ${ux.label.toLowerCase()}) antes de operar em pico máximo.`
            : `Ocorreram ${input.totalErrors} falhas (${input.errorRatePct.toFixed(2)}%) ou violação das metas definidas; há risco real de queda ou lentidão severa em pico.`;

  const reqStr = input.totalRequests.toLocaleString(lang);
  const errStr = input.totalErrors.toLocaleString(lang);
  const opsMinStr = opsPerMinute.toLocaleString(lang);
  const opsHourStr = opsPerHour.toLocaleString(lang);

  const loadQuestionAnswer: BusinessAnswer = {
    question:
      lang === "en-US"
        ? "Can it handle the tested load?"
        : lang === "es-ES"
          ? "¿Soporta la carga que fue probada?"
          : "Aguenta a carga que foi testada?",
    status: !input.passedThresholds || input.errorRatePct >= 2 ? "risk" : input.errorRatePct > 0 ? "attention" : "ready",
    answer:
      lang === "en-US"
        ? input.mode === "smoke"
          ? `In the quick functional test (${reqStr} requests), the flow responded with ${successRatePct.toFixed(2)}% success. Run Load mode to simulate dozens of concurrent users.`
          : input.passedThresholds && input.errorRatePct === 0
            ? `Yes. With ${maxActiveVus} concurrent users for ${durationSec.toFixed(0)}s, the system processed ${reqStr} operations with zero failures (100% success).`
            : `Partially or with failures: out of ${reqStr} operations with ${maxActiveVus} concurrent users, ${errStr} failed (${input.errorRatePct.toFixed(2)}%).`
        : lang === "es-ES"
          ? input.mode === "smoke"
            ? `En la prueba funcional rápida (${reqStr} peticiones), el flujo respondió con ${successRatePct.toFixed(2)}% de éxito. Ejecuta en modo Carga para simular usuarios simultáneos.`
            : input.passedThresholds && input.errorRatePct === 0
              ? `Sí. Con ${maxActiveVus} usuarios simultáneos durante ${durationSec.toFixed(0)}s, el sistema procesó ${reqStr} operaciones sin fallos (100% de éxito).`
              : `Parcialmente o con fallos: de las ${reqStr} operaciones ejecutadas con ${maxActiveVus} usuarios simultáneos, ${errStr} fallaron (${input.errorRatePct.toFixed(2)}%).`
          : input.mode === "smoke"
            ? `No teste funcional rápido (${reqStr} requisições), o fluxo respondeu com ${successRatePct.toFixed(2)}% de sucesso. Rode em modo Carga para simular dezenas de usuários simultâneos.`
            : input.passedThresholds && input.errorRatePct === 0
              ? `Sim. Com ${maxActiveVus} usuários simultâneos durante ${durationSec.toFixed(0)}s, o sistema processou ${reqStr} operações sem nenhuma falha (100% de sucesso).`
              : `Parcialmente ou com falhas: das ${reqStr} operações executadas com ${maxActiveVus} usuários simultâneos, ${errStr} falharam (${input.errorRatePct.toFixed(2)}%).`,
  };

  const peakQuestionAnswer: BusinessAnswer = targetAssessment
    ? {
        question:
          lang === "en-US"
            ? "Can it handle expected peak volume (e.g., Black Friday)?"
            : lang === "es-ES"
              ? "¿Soporta la volumetría esperada (ej.: Black Friday)?"
              : "Aguenta a volumetria esperada (ex.: Black Friday)?",
        status: targetStatus,
        answer: `${targetAssessment.headline}. ${targetAssessment.detail} ${
          stability.kind === "degrading"
            ? lang === "en-US"
              ? "In addition, response speed degraded over time."
              : lang === "es-ES"
                ? "Además, hubo pérdida de velocidad a lo largo del tiempo."
                : "Além disso, houve perda de velocidade ao longo do tempo."
            : ""
        }`.trim(),
      }
    : {
        question:
          lang === "en-US"
            ? "Will it survive peaks like Black Friday?"
            : lang === "es-ES"
              ? "¿Soporta picos como Black Friday?"
              : "Aguenta picos como Black Friday?",
        status: verdict,
        answer:
          lang === "en-US"
            ? input.mode === "smoke"
              ? "Not yet guaranteed: Smoke mode checks functional health, not peak traffic volume."
              : `At the measured pace, the system sustains ~${opsMinStr} operations/min (~${opsHourStr}/hour) with "${stability.label.toLowerCase()}" behavior. Enter your Black Friday target above to verify exact headroom.`
            : lang === "es-ES"
              ? input.mode === "smoke"
                ? "Todavía no es posible garantizarlo: el modo Smoke prueba la salud del flujo, no el volumen de pico."
                : `Al ritmo medido, el sistema sostiene ~${opsMinStr} operaciones/minuto (~${opsHourStr}/hora) con comportamiento "${stability.label.toLowerCase()}". Indica la meta de Black Friday arriba para validar el margen exacto.`
              : input.mode === "smoke"
                ? "Ainda não é possível garantir: o modo Smoke testa apenas a saúde do fluxo, não volume de pico."
                : `No ritmo medido, o sistema sustenta ~${opsMinStr} operações por minuto (~${opsHourStr}/hora) com comportamento "${stability.label.toLowerCase()}". Informe a meta de Black Friday acima para validar a folga exata.`,
      };

  const uxQuestionAnswer: BusinessAnswer = {
    question:
      lang === "en-US"
        ? "How does the user experience feel on screen?"
        : lang === "es-ES"
          ? "¿Cómo queda la experiencia del cliente en pantalla?"
          : "Como fica a experiência do cliente na tela?",
    status: ux.status,
    answer: `${ux.label} — ${ux.explanation}`,
  };

  const recommendations: string[] = [];
  if (input.mode === "smoke") {
    recommendations.push(
      lang === "en-US"
        ? "Run this same scenario in Load mode to validate behavior under concurrent users."
        : lang === "es-ES"
          ? "Ejecuta este mismo escenario en modo Load (Carga) para validar el comportamiento con usuarios simultáneos."
          : "Execute este mesmo cenário no modo Load (Carga) para validar o comportamento com usuários simultâneos."
    );
  }
  if (!input.passedThresholds && input.violations.length > 0) {
    recommendations.push(
      lang === "en-US"
        ? `Review the bottleneck that violated SLA thresholds: ${input.violations.join("; ")}.`
        : lang === "es-ES"
          ? `Revisar el cuello de botella que incumplió los límites definidos: ${input.violations.join("; ")}.`
          : `Revisar o gargalo que violou os limites combinados: ${input.violations.join("; ")}.`
    );
  }
  if (failureGroups.length > 0) {
    const top = failureGroups[0];
    const codeStr = top.statusCode || (lang === "en-US" ? "network error" : lang === "es-ES" ? "error de red" : "erro de rede");
    recommendations.push(
      lang === "en-US"
        ? `Investigate step "${top.step}" first (HTTP code ${codeStr}), which concentrated the most failures.`
        : lang === "es-ES"
          ? `Investigar primero el paso "${top.step}" (código HTTP ${codeStr}), donde se concentró la mayor cantidad de fallos.`
          : `Investigar primeiro o passo "${top.step}" (código HTTP ${codeStr}), onde se concentrou o maior número de falhas.`
    );
  }
  if (stability.status === "risk") {
    recommendations.push(
      lang === "en-US"
        ? "Evaluate horizontal scaling, connection pooling, or database queries since response times degraded during sustained load."
        : lang === "es-ES"
          ? "Evaluar escalabilidad horizontal, pool de conexiones o consultas a base de datos, ya que el tiempo de respuesta se degradó durante la carga continua."
          : "Avaliar escalabilidade horizontal, pool de conexões ou consultas ao banco, pois o tempo de resposta degradou durante o teste contínuo."
    );
  }
  if (targetAssessment && !targetAssessment.meetsTarget) {
    recommendations.push(
      lang === "en-US"
        ? "Increase infrastructure capacity or optimize the slowest endpoints before launching for the expected peak."
        : lang === "es-ES"
          ? "Aumentar la capacidad de infraestructura u optimizar los endpoints más lentos antes de liberar para el pico esperado."
          : "Aumentar a capacidade da infraestrutura ou otimizar os endpoints mais lentos antes de liberar para o pico esperado."
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      lang === "en-US"
        ? "Healthy system within tested parameters. Save this run in history to compare future changes before and after."
        : lang === "es-ES"
          ? "Sistema saludable bajo los parámetros probados. Guarda esta ejecución en el historial para comparar cambios futuros antes y después."
          : "Sistema saudável nos parâmetros testados. Salve esta execução no histórico para comparar antes e depois de futuras alterações."
    );
  }

  const modeLabel =
    lang === "en-US"
      ? input.mode === "load"
        ? "Load Test (Concurrent)"
        : "Smoke Test (Quick Check)"
      : lang === "es-ES"
        ? input.mode === "load"
          ? "Prueba de Carga (Simultánea)"
          : "Smoke Test (Validación Rápida)"
        : input.mode === "load"
          ? "Teste de Carga (Simultâneo)"
          : "Smoke Test (Validação Rápida)";

  return {
    language: lang,
    verdict,
    verdictTitle,
    verdictSubtitle,
    scenarioName: input.scenarioName || "Cenário LoadSmith",
    runId: input.runId,
    modeLabel,
    executedAtFormatted: formatDate(input.startedAt, lang),
    durationSec,
    maxActiveVus,
    successRatePct,
    totalRequests: input.totalRequests,
    totalErrors: input.totalErrors,
    errorRatePct: input.errorRatePct,
    avgRps,
    peakRps,
    opsPerMinute,
    opsPerHour,
    p95Ms: input.p95Ms,
    uxRatingLabel: ux.label,
    uxExplanation: ux.explanation,
    stabilityKind: stability.kind,
    stabilityLabel: stability.label,
    stabilityExplanation: stability.explanation,
    degradationPct: stability.degradationPct,
    targetOpsPerMinute: targetOps,
    targetAssessment,
    businessAnswers: [loadQuestionAnswer, peakQuestionAnswer, uxQuestionAnswer],
    failureGroups,
    recommendations,
  };
}

export function buildExecutiveSummaryText(report: ExecutiveReport): string {
  const lang = report.language;
  const icon =
    lang === "en-US"
      ? report.verdict === "ready"
        ? "[APPROVED]"
        : report.verdict === "attention"
          ? "[ATTENTION]"
          : "[HIGH RISK]"
      : lang === "es-ES"
        ? report.verdict === "ready"
          ? "[APROBADO]"
          : report.verdict === "attention"
            ? "[ATENCIÓN]"
            : "[RIESGO ALTO]"
        : report.verdict === "ready"
          ? "[APROVADO]"
          : report.verdict === "attention"
            ? "[ATENÇÃO]"
            : "[RISCO ALTO]";

  const opsMin = report.opsPerMinute.toLocaleString(lang);
  const totalReqs = report.totalRequests.toLocaleString(lang);
  const totalErrs = report.totalErrors.toLocaleString(lang);

  const lines: string[] =
    lang === "en-US"
      ? [
          `${icon} Executive Report — ${report.scenarioName}`,
          `Date: ${report.executedAtFormatted} | Mode: ${report.modeLabel}`,
          `Conclusion: ${report.verdictTitle}`,
          `${report.verdictSubtitle}`,
          "",
          "Capacity & Experience Summary:",
          `- Measured average capacity: ${opsMin} operations/minute (${report.avgRps.toFixed(1)} req/s, peak ${report.peakRps.toFixed(1)} req/s)`,
          `- Reliability: ${report.successRatePct.toFixed(2)}% success (${totalReqs} total, ${totalErrs} failures)`,
          `- User experience: ${report.uxRatingLabel} (95% within ${report.p95Ms.toFixed(0)} ms)`,
          `- Sustained stability: ${report.stabilityLabel}`,
        ]
      : lang === "es-ES"
        ? [
            `${icon} Informe Ejecutivo — ${report.scenarioName}`,
            `Fecha: ${report.executedAtFormatted} | Modo: ${report.modeLabel}`,
            `Conclusión: ${report.verdictTitle}`,
            `${report.verdictSubtitle}`,
            "",
            "Resumen de Capacidad y Experiencia:",
            `- Capacidad promedio medida: ${opsMin} operaciones/minuto (${report.avgRps.toFixed(1)} req/s, pico ${report.peakRps.toFixed(1)} req/s)`,
            `- Confiabilidad: ${report.successRatePct.toFixed(2)}% de éxito (${totalReqs} totales, ${totalErrs} fallos)`,
            `- Experiencia del usuario: ${report.uxRatingLabel} (95% hasta ${report.p95Ms.toFixed(0)} ms)`,
            `- Estabilidad continua: ${report.stabilityLabel}`,
          ]
        : [
            `${icon} Relatório Executivo — ${report.scenarioName}`,
            `Data: ${report.executedAtFormatted} | Modo: ${report.modeLabel}`,
            `Conclusão: ${report.verdictTitle}`,
            `${report.verdictSubtitle}`,
            "",
            "Resumo de Capacidade e Experiência:",
            `- Capacidade média medida: ${opsMin} operações/minuto (${report.avgRps.toFixed(1)} req/s, pico ${report.peakRps.toFixed(1)} req/s)`,
            `- Confiabilidade: ${report.successRatePct.toFixed(2)}% de sucesso (${totalReqs} totais, ${totalErrs} falhas)`,
            `- Experiência do usuário: ${report.uxRatingLabel} (95% até ${report.p95Ms.toFixed(0)} ms)`,
            `- Estabilidade contínua: ${report.stabilityLabel}`,
          ];

  if (report.targetAssessment && report.targetOpsPerMinute) {
    const targetStr = report.targetOpsPerMinute.toLocaleString(lang);
    lines.push(
      lang === "en-US"
        ? `- Simulated target (${targetStr}/min): ${report.targetAssessment.headline}`
        : lang === "es-ES"
          ? `- Meta simulada (${targetStr}/min): ${report.targetAssessment.headline}`
          : `- Meta simulada (${targetStr}/min): ${report.targetAssessment.headline}`
    );
  }

  lines.push(
    "",
    lang === "en-US" ? "Direct Answers:" : lang === "es-ES" ? "Respuestas Directas:" : "Respostas Diretas:"
  );
  for (const item of report.businessAnswers) {
    lines.push(`• ${item.question} ${item.answer}`);
  }

  lines.push(
    "",
    lang === "en-US" ? "Next Steps:" : lang === "es-ES" ? "Próximos Pasos:" : "Próximos Passos:"
  );
  for (const rec of report.recommendations) {
    lines.push(`- ${rec}`);
  }

  return lines.join("\n");
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildExecutiveHtml(report: ExecutiveReport): string {
  const lang = report.language;
  const labels =
    lang === "en-US"
      ? {
          ready: "APPROVED",
          attention: "ATTENTION",
          risk: "HIGH RISK",
          brand: "LoadSmith · Executive Capacity Report",
          titlePrefix: "Executive Report",
          meta: `Executed on ${escapeHtml(report.executedAtFormatted)} · ${escapeHtml(report.modeLabel)} · ${report.maxActiveVus} concurrent users`,
          printBtn: "Print / Save PDF",
          capLabel: "Measured Capacity",
          perHour: `~${report.opsPerHour.toLocaleString(lang)} per hour (${report.avgRps.toFixed(1)} req/s)`,
          relLabel: "Reliability",
          failuresOf: `${report.totalErrors.toLocaleString(lang)} failures of ${report.totalRequests.toLocaleString(lang)}`,
          uxLabel: "Customer Experience",
          p95Within: `95% within ${report.p95Ms.toFixed(0)} ms`,
          stabLabel: "Stability",
          duration: `Duration: ${report.durationSec.toFixed(1)}s`,
          answersHeading: "Decision-Making Answers",
          failuresHeading: "Where failures occurred",
          colStep: "Step",
          colCode: "HTTP Code",
          colCount: "Sample Count",
          colDetail: "Detail",
          netErr: "Network error",
          recsHeading: "Recommendations",
          generatedBy: "Generated by LoadSmith",
          runLabel: "Run",
        }
      : lang === "es-ES"
        ? {
            ready: "APROBADO",
            attention: "ATENCIÓN",
            risk: "RIESGO ALTO",
            brand: "LoadSmith · Informe Ejecutivo de Capacidad",
            titlePrefix: "Informe Ejecutivo",
            meta: `Ejecutado el ${escapeHtml(report.executedAtFormatted)} · ${escapeHtml(report.modeLabel)} · ${report.maxActiveVus} usuarios simultáneos`,
            printBtn: "Imprimir / Guardar PDF",
            capLabel: "Capacidad Medida",
            perHour: `~${report.opsPerHour.toLocaleString(lang)} por hora (${report.avgRps.toFixed(1)} req/s)`,
            relLabel: "Confiabilidad",
            failuresOf: `${report.totalErrors.toLocaleString(lang)} fallos de ${report.totalRequests.toLocaleString(lang)}`,
            uxLabel: "Experiencia del Cliente",
            p95Within: `95% hasta ${report.p95Ms.toFixed(0)} ms`,
            stabLabel: "Estabilidad",
            duration: `Duración: ${report.durationSec.toFixed(1)}s`,
            answersHeading: "Respuestas para Toma de Decisiones",
            failuresHeading: "Puntos donde ocurrieron fallos",
            colStep: "Paso",
            colCode: "Código HTTP",
            colCount: "Muestras",
            colDetail: "Detalle",
            netErr: "Error de red",
            recsHeading: "Recomendaciones",
            generatedBy: "Generado por LoadSmith",
            runLabel: "Ejecución",
          }
        : {
            ready: "APROVADO",
            attention: "ATENÇÃO",
            risk: "RISCO ALTO",
            brand: "LoadSmith · Relatório Executivo de Capacidade",
            titlePrefix: "Relatório Executivo",
            meta: `Executado em ${escapeHtml(report.executedAtFormatted)} · ${escapeHtml(report.modeLabel)} · ${report.maxActiveVus} usuários simultâneos`,
            printBtn: "Imprimir / Salvar PDF",
            capLabel: "Capacidade Medida",
            perHour: `~${report.opsPerHour.toLocaleString(lang)} por hora (${report.avgRps.toFixed(1)} req/s)`,
            relLabel: "Confiabilidade",
            failuresOf: `${report.totalErrors.toLocaleString(lang)} falhas em ${report.totalRequests.toLocaleString(lang)}`,
            uxLabel: "Experiência do Cliente",
            p95Within: `95% até ${report.p95Ms.toFixed(0)} ms`,
            stabLabel: "Estabilidade",
            duration: `Duração: ${report.durationSec.toFixed(1)}s`,
            answersHeading: "Respostas para Tomada de Decisão",
            failuresHeading: "Pontos onde ocorreram falhas",
            colStep: "Passo",
            colCode: "Código HTTP",
            colCount: "Ocorrências na amostra",
            colDetail: "Detalhe",
            netErr: "Erro de rede",
            recsHeading: "Recomendações",
            generatedBy: "Gerado pelo LoadSmith",
            runLabel: "Execução",
          };

  const verdictColors: Record<ExecutiveVerdict, { bg: string; border: string; text: string; badge: string }> = {
    ready: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", badge: labels.ready },
    attention: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", badge: labels.attention },
    risk: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", badge: labels.risk },
  };
  const vc = verdictColors[report.verdict];

  const answersHtml = report.businessAnswers
    .map((b) => {
      const c = verdictColors[b.status];
      return `
      <div class="qa-card">
        <div class="qa-top">
          <h3>${escapeHtml(b.question)}</h3>
          <span class="pill" style="background:${c.bg};color:${c.text};border-color:${c.border}">${c.badge}</span>
        </div>
        <p>${escapeHtml(b.answer)}</p>
      </div>`;
    })
    .join("");

  const failuresHtml =
    report.failureGroups.length === 0
      ? ""
      : `
      <section class="section">
        <h2>${labels.failuresHeading}</h2>
        <table>
          <thead><tr><th>${labels.colStep}</th><th>${labels.colCode}</th><th>${labels.colCount}</th><th>${labels.colDetail}</th></tr></thead>
          <tbody>
            ${report.failureGroups
              .map(
                (f) =>
                  `<tr><td>${escapeHtml(f.step)}</td><td>${f.statusCode || labels.netErr}</td><td>${f.count}</td><td>${escapeHtml(f.sampleMessage)}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>`;

  const recsHtml = report.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <title>${labels.titlePrefix} — ${escapeHtml(report.scenarioName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #0f172a; background: #f8fafc; line-height: 1.5; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 32px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 20px; }
    .brand { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0ea5e9; }
    h1 { margin: 4px 0 4px; font-size: 22px; color: #0f172a; }
    .meta { font-size: 12.5px; color: #475569; }
    .print-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #0f172a; color: #ffffff; font-weight: 600; cursor: pointer; }
    .verdict { padding: 18px 20px; border-radius: 12px; border: 2px solid ${vc.border}; background: ${vc.bg}; color: ${vc.text}; margin-bottom: 22px; }
    .verdict-badge { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; margin-bottom: 6px; }
    .verdict h2 { margin: 0 0 4px; font-size: 18px; }
    .verdict p { margin: 0; font-size: 13.5px; opacity: 0.92; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc; }
    .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; font-weight: 700; }
    .kpi-value { font-size: 22px; font-weight: 800; color: #0f172a; margin: 4px 0; }
    .kpi-sub { font-size: 12px; color: #475569; }
    .section { margin-top: 22px; }
    .section h2 { font-size: 15px; margin: 0 0 12px; color: #0f172a; }
    .qa-grid { display: grid; gap: 10px; }
    .qa-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .qa-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }
    .qa-top h3 { margin: 0; font-size: 14px; }
    .qa-card p { margin: 0; font-size: 13px; color: #334155; }
    .pill { font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 999px; border: 1px solid; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; color: #334155; }
    ul { margin: 0; padding-left: 20px; color: #334155; font-size: 13px; }
    li { margin-bottom: 6px; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
    @media print { body { background: #ffffff; padding: 0; } .container { border: none; box-shadow: none; padding: 0; } .print-btn { display: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">${labels.brand}</div>
        <h1>${escapeHtml(report.scenarioName)}</h1>
        <div class="meta">${labels.meta}</div>
      </div>
      <button class="print-btn" onclick="window.print()">${labels.printBtn}</button>
    </div>

    <div class="verdict">
      <div class="verdict-badge">${vc.badge}</div>
      <h2>${escapeHtml(report.verdictTitle)}</h2>
      <p>${escapeHtml(report.verdictSubtitle)}</p>
    </div>

    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">${labels.capLabel}</div>
        <div class="kpi-value">${report.opsPerMinute.toLocaleString(lang)}/min</div>
        <div class="kpi-sub">${labels.perHour}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">${labels.relLabel}</div>
        <div class="kpi-value">${report.successRatePct.toFixed(2)}%</div>
        <div class="kpi-sub">${labels.failuresOf}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">${labels.uxLabel}</div>
        <div class="kpi-value">${escapeHtml(report.uxRatingLabel)}</div>
        <div class="kpi-sub">${labels.p95Within}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">${labels.stabLabel}</div>
        <div class="kpi-value" style="font-size:16px">${escapeHtml(report.stabilityLabel)}</div>
        <div class="kpi-sub">${labels.duration}</div>
      </div>
    </div>

    <section class="section">
      <h2>${labels.answersHeading}</h2>
      <div class="qa-grid">${answersHtml}</div>
    </section>

    ${failuresHtml}

    <section class="section">
      <h2>${labels.recsHeading}</h2>
      <ul>${recsHtml}</ul>
    </section>

    <div class="footer">
      <span>${labels.generatedBy}</span>
      <span>${labels.runLabel}: ${escapeHtml(report.runId)}</span>
    </div>
  </div>
</body>
</html>`;
}
