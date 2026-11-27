# Changelog

Todas as mudanças notáveis do **LoadSmith** serão documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-11-26

### Adicionado
- **Motor CLI em Go (`engine/`):**
  - Execução sequencial *fail-fast* (`--mode smoke`) e concorrente com Virtual Users, *ramp-up* e *think time* (`--mode load`).
  - Telemetria em tempo real via stream NDJSON estrito (`RUN_STARTED`, `METRIC_TICK`, `ERROR_SAMPLE`, `RUN_FINISHED`) e saída `--pretty` em `stderr`.
  - Encerramento gracioso via `SIGINT`, `SIGTERM` e comando cooperativo `STOP` via `stdin`.
  - Suporte a cenários YAML e JSON, extração JSONPath (`$.campo`), asserções por passo e avaliação de SLA (`thresholds.p95Ms` e `thresholds.maxErrorRatePct`).
  - Feed de massa de dados via CSV (`dataFile`) nos modos `round-robin` e `random`, com suporte a delimitadores customizados e remoção de UTF-8 BOM.
  - Carregamento de segredos via `.env` (`envFile` ou detecção automática na pasta do cenário) e variáveis de ambiente usando `{{env.CHAVE}}`.
  - Suporte a certificados HTTPS locais/autoassinados com `insecureSkipVerify: true`.
  - Servidor local de demonstração (`demoserver`) para testes e validações offline.

- **Aplicativo Desktop (`apps/desktop/`):**
  - Interface dark *obsidian* sem borda com título personalizado, controles de janela, zoom (`Ctrl +/-/0`), atalhos (`Ctrl K`, `Ctrl S`, `Ctrl Enter`, `Esc`) e colunas redimensionáveis.
  - Editor Visual e Editor de Código YAML/JSON sincronizados bidirecionalmente, além de Visualizador paginado/filtrável de registros CSV.
  - Importador de comandos **`cURL`** (compatível com Chrome DevTools, Postman, Insomnia, Bash e CMD) direto para passos do cenário.
  - CRUD completo de cenários na barra lateral (criar com modelos prontos, renomear inline, duplicar, excluir com confirmação), workspace inicial automático (`Documentos/LoadSmith`) e proteção contra alterações não salvas (`isDirty`).
  - Telemetria em tempo real otimizada para execuções longas com *downsampling* SVG preservando picos de latência (`p95`/`p99`) e contagem de erros.
  - Histórico local offline para comparação **Antes vs. Depois** com deltas percentuais de `p95`, `RPS` e taxa de erros.
  - **Relatório Executivo** em linguagem não técnica com semáforo de decisão, simulador de meta (*Black Friday* / pico esperado), cópia de resumo, exportação HTML e exportação nativa em **PDF (1 clique)**.

- **Empacotamento & Distribuição:**
  - Empacotamento Windows via `electron-builder` gerando instalador NSIS (`LoadSmith Setup 1.0.0.exe`) e executável portátil (`LoadSmith 1.0.0.exe`).
  - Validador isolado fora do monorepo (`scripts/verify-packaged.mjs`) e pipelines de CI/Release via GitHub Actions.
