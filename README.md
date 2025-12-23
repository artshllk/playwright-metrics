# pw-metrics

![npm version](https://img.shields.io/npm/v/@artshllaku/pw-metrics?style=flat-square)
![Node.js](https://img.shields.io/badge/node-%3E=_18-brightgreen?style=flat-square)
![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

Playwright test metrics generator for local runs and CI pipelines.

pw-metrics reads a Playwright JSON report and emits small, consumable JSON metrics you can feed to dashboards, posting tools, or CI summaries.

It is designed for teams and individuals who want simple visibility into Playwright test results without building a custom reporting system.

## Highlights

- Per-run `metrics.json` with totals and run metadata
- A consolidated `metrics-latest.json` suitable for dashboards
- Small, framework-agnostic, CI-friendly

## Table of contents

- [Features](#features)
- [Categories (optional)](#categories-optional)
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

## Categories (optional)

This feature is optional and disabled by default. If you do nothing, pw-metrics behaves exactly like earlier versions.

pw-metrics supports custom test categories so you can break down results in a way that matches your test strategy. Categories are optional — if you don’t configure them the tool behaves exactly the same as without them.

You decide what a category means; the tool doesn't enforce naming or semantics.

### Common examples

- smoke
- regression
- security
- integration
- api
- mobile
- performance

### How categories match tests

A category groups tests using one or more matching rules. A test is included when any rule matches.

- Tags — Playwright annotations (for example `@smoke`).
- Project names — the Playwright project identifier.
- File path patterns — regular expressions matched against the test file path.

### Modes

Control how tests are assigned:

- Multi-category (default) — a test may belong to multiple categories (example: `api` + `security`).
- Exclusive — a test is counted only in the first matching category (useful for mutually-exclusive groups like `smoke` or `regression`).

### What metrics are produced

- Global totals (`all`, `passed`, `failed`, `skipped`, `timedOut`) are always computed.
- When categories are configured, pw-metrics adds a `categories` breakdown.

Each category contains:

- `total`
- `passed`
- `failed`
- `skipped`
- `timedOut`
- `passRate` (percentage)

If categories are not configured, the `categories` section is omitted.

### Example output (categories section only)

```json
{
  "totals": {
    "all": 30,
    "passed": 27,
    "failed": 2,
    "skipped": 1,
    "timedOut": 0
  },
  "passRate": 90,
  "categories": {
    "smoke": {
      "total": 10,
      "passed": 9,
      "failed": 1,
      "skipped": 0,
      "timedOut": 0,
      "passRate": 90
    },
    "security": {
      "total": 5,
      "passed": 4,
      "failed": 1,
      "skipped": 0,
      "timedOut": 0,
      "passRate": 80
    }
  }
}
```

### Example configuration

Create a `pw-metrics.config.json` at the repo root (CLI args always override config values):

This file is optional. It is useful when you want consistent behavior across local runs and CI.

```json
{
  "categories": [
    {
      "name": "smoke",
      "tags": ["@smoke"]
    },
    {
      "name": "security",
      "tags": ["@security"],
      "projectPatterns": ["security"]
    }
  ],
  "categoryMode": "multi"
}
```

Notes:

- Use `categoryMode: "exclusive"` to enable exclusive assignment.
- Tags, `projectPatterns` and path matching are additive — a test matches the category when any rule matches.

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

You can optionally create a `pw-metrics.config.json` at the repo root to define default values such as environment, output paths, and categories. CLI options take precedence over config values.

## Contributing

Contributions are welcome. Open issues for bugs or feature requests, and create PRs for changes. Keep PRs small and focused.

## Preview locally

Open the file in VS Code and press `Cmd+Shift+V` (macOS) or `Ctrl+Shift+V` (Windows/Linux) to preview the rendered Markdown.

## License

MIT — Art Shllaku
