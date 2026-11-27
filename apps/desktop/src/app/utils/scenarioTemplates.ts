export type ScenarioTemplateId = "simple-api" | "auth-flow" | "csv-load";

export interface ScenarioTemplateOption {
  id: ScenarioTemplateId;
  label: string;
  description: string;
}

export const SCENARIO_TEMPLATES: ScenarioTemplateOption[] = [
  {
    id: "simple-api",
    label: "API REST Simples",
    description: "Health check GET com validação de status e tempo de resposta.",
  },
  {
    id: "auth-flow",
    label: "Login + Rota Autenticada",
    description: "Extrai token Bearer no login e reutiliza no passo seguinte.",
  },
  {
    id: "csv-load",
    label: "Carga com Massa CSV",
    description: "Alimenta variáveis {{email}} e {{sku}} via arquivo CSV.",
  },
];

export function buildScenarioTemplate(
  templateId: ScenarioTemplateId,
  scenarioName: string,
  isJson: boolean
): string {
  const safeName = scenarioName.trim() || "Novo Cenário";

  if (templateId === "auth-flow") {
    const model = {
      name: safeName,
      baseUrl: "http://127.0.0.1:8080",
      steps: [
        {
          id: "login",
          name: "Autenticação",
          method: "POST",
          path: "/auth/login",
          headers: { "Content-Type": "application/json" },
          body: { email: "user@example.com", password: "secret" },
          extract: { token: "$.token" },
          assert: { status: 200 },
        },
        {
          id: "list_orders",
          name: "Listar Pedidos",
          method: "GET",
          path: "/orders",
          headers: { Authorization: "Bearer {{token}}" },
          assert: { status: 200, maxDurationMs: 300 },
        },
      ],
      load: { vus: 15, rampUp: "5s", duration: "15s", thinkTimeMs: 120 },
      thresholds: { p95Ms: 300, maxErrorRatePct: 1.0 },
    };
    if (isJson) {
      return JSON.stringify(model, null, 2);
    }
    return `name: "${safeName}"
baseUrl: "http://127.0.0.1:8080"

steps:
  - id: login
    name: "Autenticação"
    method: POST
    path: "/auth/login"
    headers:
      Content-Type: "application/json"
    body:
      email: "user@example.com"
      password: "secret"
    extract:
      token: "$.token"
    assert:
      status: 200

  - id: list_orders
    name: "Listar Pedidos"
    method: GET
    path: "/orders"
    headers:
      Authorization: "Bearer {{token}}"
    assert:
      status: 200
      maxDurationMs: 300

load:
  vus: 15
  rampUp: "5s"
  duration: "15s"
  thinkTimeMs: 120

thresholds:
  p95Ms: 300
  maxErrorRatePct: 1.0
`;
  }

  if (templateId === "csv-load") {
    const model = {
      name: safeName,
      baseUrl: "http://127.0.0.1:8080",
      dataFile: {
        path: "./dados.csv",
        mode: "round-robin",
        delimiter: ",",
      },
      steps: [
        {
          id: "login",
          name: "Login com CSV",
          method: "POST",
          path: "/auth/login",
          headers: { "Content-Type": "application/json" },
          body: { email: "{{email}}", password: "secret" },
          extract: { token: "$.token" },
          assert: { status: 200 },
        },
        {
          id: "create_order",
          name: "Criar Pedido",
          method: "POST",
          path: "/orders",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer {{token}}",
          },
          body: { sku: "{{sku}}", quantity: 1 },
          assert: { status: 201, maxDurationMs: 350 },
        },
      ],
      load: { vus: 20, rampUp: "5s", duration: "20s", thinkTimeMs: 100 },
      thresholds: { p95Ms: 350, maxErrorRatePct: 1.0 },
    };
    if (isJson) {
      return JSON.stringify(model, null, 2);
    }
    return `name: "${safeName}"
baseUrl: "http://127.0.0.1:8080"

dataFile:
  path: "./dados.csv"
  mode: "round-robin"
  delimiter: ","

steps:
  - id: login
    name: "Login com CSV"
    method: POST
    path: "/auth/login"
    headers:
      Content-Type: "application/json"
    body:
      email: "{{email}}"
      password: "secret"
    extract:
      token: "$.token"
    assert:
      status: 200

  - id: create_order
    name: "Criar Pedido"
    method: POST
    path: "/orders"
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer {{token}}"
    body:
      sku: "{{sku}}"
      quantity: 1
    assert:
      status: 201
      maxDurationMs: 350

load:
  vus: 20
  rampUp: "5s"
  duration: "20s"
  thinkTimeMs: 100

thresholds:
  p95Ms: 350
  maxErrorRatePct: 1.0
`;
  }

  const simpleModel = {
    name: safeName,
    baseUrl: "http://127.0.0.1:8080",
    steps: [
      {
        id: "health",
        name: "Health Check",
        method: "GET",
        path: "/health",
        assert: { status: 200, maxDurationMs: 250 },
      },
    ],
    load: { vus: 10, rampUp: "3s", duration: "10s", thinkTimeMs: 100 },
    thresholds: { p95Ms: 250, maxErrorRatePct: 1.0 },
  };
  if (isJson) {
    return JSON.stringify(simpleModel, null, 2);
  }
  return `name: "${safeName}"
baseUrl: "http://127.0.0.1:8080"

steps:
  - id: health
    name: "Health Check"
    method: GET
    path: "/health"
    assert:
      status: 200
      maxDurationMs: 250

load:
  vus: 10
  rampUp: "3s"
  duration: "10s"
  thinkTimeMs: 100

thresholds:
  p95Ms: 250
  maxErrorRatePct: 1.0
`;
}
