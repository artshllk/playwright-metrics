#!/usr/bin/env node
import { buildMetricsSummary } from "./playwrightMetrics.js";

interface CliArgs {
  [key: string]: string | boolean | undefined;
}

function parseCliArguments(args: string[]): CliArgs {
  const result: CliArgs = {};

  function parseList(value: string | undefined): string[] {
    if (!value) return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function parseRegexList(value: string | undefined): RegExp[] {
    if (!value) return [];
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((pattern) => new RegExp(pattern, "i"));
  }

  for (const argument of args) {
    const [rawKey, rawValue] = argument.split("=");
    const key = rawKey.replace(/^--/, "");
    result[key] = rawValue ?? true;
  }
  return result;
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

  const summary = buildMetricsSummary({
    jsonPath,
    environmentName,
    excludeGlobalSetup: true,
    excludeSkipped: true,
  });

  const output = {
    env: summary.env,
    totals: summary.totals,
    passRate: summary.passRate,
  };

  console.log("[metrics] summary:", JSON.stringify(output, null, 2));
})();
