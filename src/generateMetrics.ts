#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { buildMetricsSummary } from "./playwrightMetrics.js";

interface CliArgs {
  [key: string]: string | boolean | undefined;
}

function parseCliArguments(args: string[]): CliArgs {
  const result: CliArgs = {};
  for (const argument of args) {
    const [rawKey, rawValue] = argument.split("=");
    const key = rawKey.replace(/^--/, "");
    result[key] = rawValue ?? true;
  }
  return result;
}

function detectGitSha(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    const buildSourceVersion = process.env.BUILD_SOURCEVERSION?.slice(0, 7);
    const githubSha = process.env.GITHUB_SHA?.slice(0, 7);
    return buildSourceVersion || githubSha || null;
  }
}

function detectRunNumber(): string | null {
  return process.env.BUILD_BUILDNUMBER || process.env.GITHUB_RUN_NUMBER || null;
}

function detectBranchName(): string | null {
  return (
    process.env.BUILD_SOURCEBRANCHNAME ||
    process.env.GITHUB_REF_NAME ||
    process.env.BUILD_SOURCEBRANCH ||
    null
  );
}

function ensureDirectoryExists(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writePrettyJson(filePath: string, payload: unknown): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[metrics] wrote ${filePath}`);
}

(function main() {
  const args = parseCliArguments(process.argv.slice(2));

  const jsonPath =
    (args.json as string | undefined) || "test-results/results.json";

  const environmentName = (
    (args.env as string | undefined) ||
    process.env.ENV ||
    "DEV"
  ).toUpperCase();

  const reportUrl =
    (args.reportUrl as string | undefined) ||
    "playwright-report/index.html";

  const runIdArgument = args.runId as string | undefined;

  // Build summary from results.json
  const summary = buildMetricsSummary({
    jsonPath,
    environmentName,
    excludeGlobalSetup: true,
    excludeSkipped: true,
  });

  const now = new Date();
  const timestampISO = now.toISOString();
  const gitSha = detectGitSha();
  const runNumber = detectRunNumber();
  const branchName = detectBranchName();

  const defaultRunId = `${timestampISO.replace(/[:.]/g, "-")}${
    gitSha ? `-${gitSha}` : ""
  }`;

  const runId = runIdArgument || defaultRunId;

  const payload = {
    env: summary.env,
    runId,
    gitSha,
    branch: branchName,
    runNumber,
    timestampISO,
    totals: summary.totals,
    passRate: summary.passRate,
    reportUrl,
  };

  // per-run file
  const perRunPath = path.resolve(
    `artifacts/${environmentName.toLowerCase()}/${runId}/metrics.json`,
  );
  writePrettyJson(perRunPath, payload);

  // metrics-latest rollup
  const latestPath = path.resolve("site/metrics-latest.json");
  let latest: Record<string, unknown> = {};

  if (fs.existsSync(latestPath)) {
    try {
      const rawLatest = fs.readFileSync(latestPath, "utf8");
      latest = JSON.parse(rawLatest);
    } catch {
      latest = {};
    }
  }

  latest[environmentName] = payload;
  writePrettyJson(latestPath, latest);

  console.log(
    "[metrics] summary:",
    JSON.stringify(payload, null, 2),
  );
})();
