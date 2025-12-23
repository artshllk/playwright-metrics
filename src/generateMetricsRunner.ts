import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { buildMetricsSummary } from "./playwrightMetrics.js";

export interface CliArgs {
  [key: string]: string | boolean | undefined;
}

export function parseCliArguments(args: string[]): CliArgs {
  const result: CliArgs = {};
  for (const argument of args) {
    const [rawKey, rawValue] = argument.split("=");
    const key = rawKey.replace(/^--/, "");
    result[key] = rawValue ?? true;
  }
  return result;
}

export function detectGitSha(exec = execSync): string | null {
  try {
    return exec("git rev-parse --short HEAD", {
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

export function detectRunNumber(): string | null {
  return process.env.BUILD_BUILDNUMBER || process.env.GITHUB_RUN_NUMBER || null;
}

export function detectBranchName(): string | null {
  return (
    process.env.BUILD_SOURCEBRANCHNAME ||
    process.env.GITHUB_REF_NAME ||
    process.env.BUILD_SOURCEBRANCH ||
    null
  );
}

export function ensureDirectoryExists(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

export function writePrettyJson(filePath: string, payload: unknown): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export type GenerateMetricsResult = {
  payload: Record<string, unknown>;
  perRunPath: string;
  latestPath: string;
};

export function runGenerateMetrics(
  argv: string[],
  deps?: {
    detectGitSha?: () => string | null;
    detectRunNumber?: () => string | null;
    detectBranchName?: () => string | null;
    now?: () => Date;
  }
): GenerateMetricsResult {
  const args = parseCliArguments(argv);

  const jsonPath =
    (args.json as string | undefined) || "test-results/results.json";

  const env = ((args.env as string) || process.env.ENV || "DEV").toUpperCase();

  const outDir = (args.outDir as string) || "artifacts";
  const latestFile = (args.latest as string) || "site/metrics-latest.json";

  const reportUrl =
    (args.reportUrl as string | undefined) || "playwright-report/index.html";

  const runIdArgument = args.runId as string | undefined;

  const summary = buildMetricsSummary({
    jsonPath,
    environmentName: env,
    excludeGlobalSetup: true,
    excludeSkipped: true,
  });

  const now = deps?.now ? deps.now() : new Date();
  const timestampISO = now.toISOString();

  const gitSha = deps?.detectGitSha ? deps.detectGitSha() : detectGitSha();
  const runNumber = deps?.detectRunNumber
    ? deps.detectRunNumber()
    : detectRunNumber();
  const branchName = deps?.detectBranchName
    ? deps.detectBranchName()
    : detectBranchName();

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

  const perRunPath = path.resolve(
    `${outDir}/${env.toLowerCase()}/${runId}/metrics.json`
  );
  writePrettyJson(perRunPath, payload);

  const latestPath = path.resolve(latestFile);
  let latest: Record<string, unknown> = {};

  if (fs.existsSync(latestPath)) {
    try {
      latest = JSON.parse(fs.readFileSync(latestPath, "utf8"));
    } catch {
      latest = {};
    }
  }

  latest[env] = payload;
  writePrettyJson(latestPath, latest);

  return { payload, perRunPath, latestPath };
}
