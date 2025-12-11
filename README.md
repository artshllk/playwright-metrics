# pw-metrics

![npm version](https://img.shields.io/npm/v/@artshllaku/pw-metrics?style=flat-square)
![Node.js](https://img.shields.io/badge/node-%3E=_18-brightgreen?style=flat-square)
![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

Playwright test metrics generator for local runs and CI pipelines.

pw-metrics reads a Playwright JSON report and emits small, consumable JSON metrics you can feed to dashboards, posting tools, or CI summaries.

Highlights

- Per-run `metrics.json` with totals and run metadata
- A consolidated `metrics-latest.json` suitable for dashboards
- Small, framework-agnostic, CI-friendly

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [CLI options](#cli-options)
- [Default output structure](#default-output-structure)
- [Example output](#example-output-metricsjson)
- [CI usage (GitHub Actions)](#ci-usage-github-actions)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Aggregates Playwright test results (passed / failed / skipped / timed out)
- Computes pass rate and collects run metadata (git SHA, branch, run ID, timestamp)
- Writes a per-run metrics file and updates `metrics-latest.json` for dashboards
- Minimal surface area and easy to extend

## Requirements

- Node.js 18+
- Playwright (to run tests)
- Use Playwright's JSON reporter to generate the input report

Example test run that writes a Playwright JSON report:

```bash
npx playwright test --reporter=json
# Common locations: test-results/results.json, playwright-report or a CI-provided path
```

## Installation

Use via npx (no install):

```bash
npx @artshllaku/pw-metrics --json=test-results/results.json --env=DEV
```

Or install as a dev-dependency:

```bash
npm install --save-dev @artshllaku/pw-metrics
# then run with:
npx pw-metrics --json=test-results/results.json --env=DEV
```

There are two main commands exported by the package:

- `pw-metrics` — generate per-run artifacts and update `metrics-latest.json`
- `pw-metrics-summary` — print a short summary to stdout (no files written)

## Quick start

Generate full metrics and write artifacts:

```bash
npx pw-metrics --json=test-results/results.json --env=DEV
```

Print summary only:

```bash
npx pw-metrics-summary --json=test-results/results.json --env=DEV
```

## CLI options

|        Option | Description                                              | Default                        |
| ------------: | :------------------------------------------------------- | :----------------------------- |
|      `--json` | Path to the Playwright JSON report                       | `test-results/results.json`    |
|       `--env` | Environment name                                         | `DEV`                          |
|    `--outDir` | Base output directory for per-run artifacts              | `artifacts`                    |
|    `--latest` | Path to the consolidated latest metrics file             | `site/metrics-latest.json`     |
| `--reportUrl` | Optional link to the Playwright HTML report              | `playwright-report/index.html` |
|     `--runId` | Override run ID (otherwise auto-generated ISO timestamp) | auto-generated                 |

Notes

- CLI args override values read from `pw-metrics.config.json` (if present).
- `--runId` is useful when you want predictable artifact paths in CI.

## Default output structure

```
artifacts/
└── <env>/
    └── <run-id>/
        └── metrics.json

site/
└── metrics-latest.json
```

## Example output (`metrics.json`)

```json
{
  "env": "DEV",
  "runId": "2025-01-12T10-30-22-acde12",
  "gitSha": "acd12ef",
  "branch": "main",
  "runNumber": "143",
  "timestampISO": "2025-01-12T10:30:22.123Z",
  "totals": {
    "all": 120,
    "passed": 114,
    "failed": 6,
    "skipped": 3,
    "timedOut": 1
  },
  "passRate": 95,
  "reportUrl": "playwright-report/index.html"
}
```

## CI usage (GitHub Actions)

Small example workflow that runs Playwright and then generates metrics:

```yaml
name: CI - Playwright + Metrics

on: [push, pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run Playwright tests (JSON reporter)
        run: npx playwright test --reporter=json
      - name: Upload Playwright report (optional)
        if: always()
        run: echo "upload step or artifact upload here"
      - name: Generate metrics
        run: npx pw-metrics --json=test-results/results.json --env=CI
        # optionally pass --outDir or --latest to change locations
```

## Configuration

You can optionally create a `pw-metrics.config.json` at the repo root to set defaults (env, paths, custom categories). CLI options take precedence over config values.

## Contributing

Contributions are welcome. Open issues for bugs or feature requests, and create PRs for changes. Keep PRs small and focused.

## Preview locally

Open the file in VS Code and press `Cmd+Shift+V` (macOS) or `Ctrl+Shift+V` (Windows/Linux) to preview the rendered Markdown.

## License

MIT — Art Shllaku

---

If you'd like a slightly different tone (shorter, more technical, or more marketing-forward) or want additional visuals (screenshots, badges for CI status, npm downloads), tell me which direction and I will update this README accordingly.

# pw-metrics

![npm version](https://img.shields.io/npm/v/@artshllaku/pw-metrics?style=flat-square)
![Node.js](https://img.shields.io/badge/node-%3E=_18-brightgreen?style=flat-square)

Playwright test metrics generator for local runs and CI pipelines.

`pw-metrics` reads a Playwright JSON report and generates lightweight JSON metrics you can use in dashboards or CI summaries.

Key outputs:

- Per-run `metrics.json` with totals and metadata
- A global `metrics-latest.json` for dashboards

Why this repo

- Simple, framework-agnostic JSON output
- CI-friendly (works with GitHub Actions, CircleCI, etc.)
- No database required — just files

## Features

- Aggregates Playwright test results (passed/failed/skipped/timed out)
- Calculates pass rate and collects basic run metadata (git SHA, branch, run id)
- Writes a per-run metrics file and updates a `metrics-latest.json` for dashboards
- Small surface area and easy to extend

## Requirements

- Node.js 18+
- Playwright (to run tests)
- Playwright tests must be run with the JSON reporter

Example test run that writes a Playwright JSON report:

```bash
npx playwright test --reporter=json
# the report is often saved under test-results/results.json (depends on your run setup)
```

## Installation

Use directly with npx (no install):

```bash
npx @artshllaku/pw-metrics --json=test-results/results.json --env=DEV
```

Or install as a dev dependency:

```bash
npm install --save-dev @artshllaku/pw-metrics
# then run with:
npx pw-metrics --json=test-results/results.json --env=DEV
```

There are two main entrypoints:

- `pw-metrics` — generates per-run artifacts and updates `metrics-latest.json`
- `pw-metrics-summary` — prints a short summary to the console (no files written)

## Quick start

Generate full metrics and write artifacts:

```bash
npx pw-metrics --json=test-results/results.json --env=DEV
```

Print summary only:

```bash
npx pw-metrics-summary --json=test-results/results.json --env=DEV
```

## CLI Options

| Option        | Description                              | Default                        |
| ------------- | ---------------------------------------- | ------------------------------ |
| `--json`      | Path to the Playwright JSON report       | `test-results/results.json`    |
| `--env`       | Environment name                         | `DEV`                          |
| `--outDir`    | Base output directory                    | `artifacts`                    |
| `--latest`    | Path to metrics-latest file              | `site/metrics-latest.json`     |
| `--reportUrl` | Link to Playwright HTML report           | `playwright-report/index.html` |
| `--runId`     | Custom run ID (otherwise auto-generated) | auto-generated                 |

## Default output structure

```
artifacts/
└── dev/
    └── <run-id>/
        └── metrics.json

site/
└── metrics-latest.json
```

## Example output (`metrics.json`)

```json
{
  "env": "DEV",
  "runId": "2025-01-12T10-30-22-acde12",
  "gitSha": "acd12ef",
  "branch": "main",
  "runNumber": "143",
  "timestampISO": "2025-01-12T10:30:22.123Z",
  "totals": {
    "all": 120,
    "passed": 114,
    "failed": 6,
    "skipped": 3,
    "timedOut": 1
  },
  "passRate": 95,
  "reportUrl": "playwright-report/index.html"
}
```

## CI Usage (GitHub Actions)

```yaml
- name: Run Playwright tests
  run: npx playwright test --reporter=json

- name: Generate metrics
  run: npx pw-metrics --env=CI
```

## Configuration

You can optionally keep a `pw-metrics.config.json` in your repo for advanced customization (categories, dashboard wiring, etc.). By default the tool uses CLI options and environment values.

## When to use pw-metrics

- You want simple test metrics without external tools
- You want JSON output to feed dashboards or other automation
- You need a lightweight CI-friendly summary that’s easy to store as artifacts

## Contributing

Contributions, issues and feature requests are welcome. Please open an issue or a PR.

## License

MIT — Art Shllaku
