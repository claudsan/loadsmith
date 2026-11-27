# Changelog

All notable changes to **LoadSmith** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-27

### Added
- **CLI & Execution Engine (`engine/`):**
  - Sequential *fail-fast* verification (`--mode smoke`) and concurrent stress execution with Virtual Users, *ramp-up*, and *think time* (`--mode load`).
  - Real-time NDJSON event streaming (`RUN_STARTED`, `METRIC_TICK`, `ERROR_SAMPLE`, `RUN_FINISHED`) alongside optional human-readable `--pretty` output on `stderr`.
  - Graceful shutdown via `SIGINT`, `SIGTERM`, and cooperative `STOP` command over `stdin`.
  - Full YAML and JSON scenario support, JSONPath response extraction (`$.field`), per-step assertions, and automated SLA threshold checks (`thresholds.p95Ms` and `thresholds.maxErrorRatePct`).
  - Data-driven CSV feed (`dataFile`) supporting `round-robin` and `random` distribution modes, custom delimiters, and automatic UTF-8 BOM stripping.
  - Local `.env` secret loading (`envFile` or automatic detection in the scenario directory) and environment variable interpolation via `{{env.KEY}}`.
  - Self-signed / local HTTPS certificate support via `insecureSkipVerify: true`.
  - Built-in local demo server (`demoserver`) for offline testing and validation.

- **Desktop Application (`apps/desktop/`):**
  - Frameless dark forge UI with custom titlebar, window controls, zoom shortcuts (`Ctrl +/-/0`), productivity shortcuts (`Ctrl K`, `Ctrl S`, `Ctrl Enter`, `Esc`), and resizable workspace columns.
  - Full 3-language localization (**English**, **Português**, and **Español**) with vector flag switcher, automatic OS/browser locale detection on first launch, and persistent user preference.
  - Bidirectionally synced Visual Scenario Editor and YAML/JSON Code Editor, plus a paginated, searchable CSV records viewer.
  - 1-click **`cURL` importer** (compatible with Chrome DevTools, Postman, Insomnia, Bash, and Windows CMD) directly into scenario steps.
  - Complete sidebar scenario management (starter templates, inline rename, duplicate, delete with confirmation), automatic starter workspace (`Documents/LoadSmith`), and unsaved-changes protection (`isDirty`).
  - Real-time telemetry charts optimized for long runs with peak-preserving SVG downsampling (`p50`, `p95`, `p99`, `RPS`) and captured error samples.
  - 100% local offline run history and **Before vs. After** comparison view with percentage deltas across latency, throughput, and error rate.
  - **Executive Report** in plain business language featuring a traffic-light verdict, interactive peak Target Simulator (e.g., *Black Friday* ops/min), summary copy, standalone HTML export, and native **1-click PDF export**.

- **Cross-Platform Packaging, Website & CI/CD:**
  - Multi-platform `electron-builder` distribution for **Windows** (`.exe` NSIS installer & Portable), **macOS** (`.dmg` & `.zip` for Apple Silicon `arm64` & Intel `x64` with Universal Go binary), and **Linux** (`.AppImage` & `.deb`).
  - Clean-room isolated bundle verifier (`scripts/verify-packaged.mjs`) and automated GitHub Actions workflows (`ci.yml`, `release.yml`, and `pages.yml`).
  - Official trilingual GitHub Pages website (`docs/`) with screenshot carousel, interactive desktop simulator, and user manuals (`README.md`, `README.pt-BR.md`, `README.es-ES.md`).
