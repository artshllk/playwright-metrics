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

export function runParseResults(argv: string[]) {
  const args = parseCliArguments(argv);

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

  return {
    env: summary.env,
    totals: summary.totals,
    passRate: summary.passRate,
  };
}
