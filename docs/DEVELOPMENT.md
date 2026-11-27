# LoadSmith — Developer Guide

> End-user manuals: [English](../README.md) · [Português](../README.pt-BR.md) · [Español](../README.es-ES.md)

## Architecture

- **`engine/`** — Go CLI. Executes YAML/JSON scenarios in `smoke` (sequential, fail-fast) and `load` (concurrent VUs, ramp-up, think time) modes and streams strict **NDJSON** on `stdout` (`RUN_STARTED`, `METRIC_TICK`, `ERROR_SAMPLE`, `RUN_FINISHED`). `--pretty` prints a human summary to `stderr`.
- **`apps/desktop/`** — Electron + React + TypeScript + Vite. Spawns the Go binary as a sidecar, persists runs locally (`sql.js`), and renders the UI (3 languages).
- **`scripts/`** — cross-platform Node `.mjs` scripts (no Bash/WSL required).

```text
loadsmith/
├── .github/workflows/        # ci.yml, release.yml
├── docs/                     # DEVELOPMENT.md, screenshots/
├── engine/                   # Go engine (cmd/loadsmith, cmd/demoserver, internal/*)
├── apps/desktop/             # Electron app (electron/main, electron/preload, src/*)
├── scripts/                  # build-engine, sync-sidecar, verify-packaged
├── examples/                 # sample scenarios and CSV
├── schemas/                  # JSON Schemas (scenario, stream events)
├── README.md / README.pt-BR.md / README.es-ES.md
├── LICENSE
└── CHANGELOG.md
```

## Prerequisites

- **Go 1.24+** (on Windows, if not on `PATH`, scripts auto-detect it or accept `GO_BIN`).
- **Node.js 22+** and npm.

## Engine (CLI)

```powershell
cd engine
go vet ./...
go test -v ./...

# Demo server (terminal 1)
go run ./cmd/demoserver --addr :8080 --latency 15ms --fail-rate 0.0

# Smoke / Load (terminal 2)
go run ./cmd/loadsmith --scenario ../examples/api-flow.yaml --mode smoke --pretty
go run ./cmd/loadsmith --scenario ../examples/api-flow.yaml --mode load --window 500ms --pretty
```

## Desktop app

```powershell
npm --prefix apps/desktop install
npm run prepare:sidecar        # builds engine + syncs to apps/desktop/resources/bin
npm run dev:desktop            # dev mode

npm --prefix apps/desktop run typecheck
npm run test:desktop
npm run build:desktop
```

## Packaging (Windows)

```powershell
npm run package:win            # NSIS installer + portable .exe in apps/desktop/release/
npm run package:dir            # unpacked build only
npm run verify:packaged        # clean-room check outside the repo, PATH empty
```

Tagging `v*` triggers `.github/workflows/release.yml` (tests → package → verify → SHA256SUMS → GitHub Release).

## Scenario reference

```yaml
name: "My scenario"
baseUrl: "https://127.0.0.1:8443"
insecureSkipVerify: true        # allow self-signed HTTPS
envFile: "./staging.env"        # optional; defaults to .env next to the scenario

variables:
  userEmail: "user@example.com"

dataFile:
  path: "./users.csv"           # first row = variable names
  delimiter: ","
  mode: "round-robin"           # or "random"

steps:
  - id: login
    method: POST
    path: /auth/login
    headers: { Content-Type: application/json }
    body: { email: "{{email}}", password: "{{env.API_SECRET}}" }
    extract: { token: "$.token" }
    assert: { status: 200, maxDurationMs: 300 }

smoke: { iterations: 1 }
load: { vus: 20, rampUp: "5s", duration: "30s", thinkTimeMs: 100 }
thresholds: { p95Ms: 250, maxErrorRatePct: 1.0 }
```

Variable precedence: process env (`env.*`) → `.env` → `variables` → CSV row → `extract`.

## Keyboard shortcuts

`Ctrl K` search · `Ctrl S` save · `Ctrl Enter` run · `Esc` stop/close · `Ctrl +/-/0` zoom.

## Internationalization

Dictionaries live in `apps/desktop/src/i18n/locales/` (`ptBR.ts` is the source of truth; `enUS.ts` and `esES.ts` are typed as `TranslationDict`, so a missing key fails `typecheck`). The Executive Report engine (`src/app/utils/executiveReport.ts`) is localized separately.
