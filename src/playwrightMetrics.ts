#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildCategoryMetrics, isInCategory } from "./helpers/helpers.js";

export interface FlattenedTestItem {
  test: any;
  annotations: any[];
  projectName: string;
  titlePath: string[];
  file: string;
}

export interface StatusCounts {
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  other: number;
}

export interface MetricsTotals {
  all: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
}

export interface CategoryDefinition {
  name: string;
  tags?: string[];
  projectPatterns?: string[];
  filePatterns?: string[];
}

export interface CategoryConfig {
  categories: CategoryDefinition[];
  categoryMode?: "multi" | "exclusive";
}

export interface CategoryMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  passRate: number;
}

export interface MetricsSummary {
  env: string;
  totals: MetricsTotals;
  passRate: number;
  categories?: Record<string, CategoryMetrics>;
}

export interface ParseOptions {
  jsonPath: string;
  environmentName: string;
  excludeGlobalSetup?: boolean;
  excludeSkipped?: boolean;
  categoryConfig?: CategoryConfig;
}
/**
 * Read JSON file from disk and parse it.
 */
export function readJsonFile(filePath: string): any {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`[metrics] results.json not found at ${absolutePath}`);
    process.exit(2);
  }

  const rawContent = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(rawContent);
}

function normalizeTag(tag: unknown): string {
  return String(tag ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function hasTagAnnotation(annotations: any[], tag: string): boolean {
  const expected = normalizeTag(tag);

  return annotations.some((annotation) => {
    const annotationType = String(annotation?.type ?? "").toLowerCase();
    const description = normalizeTag(annotation?.description);
    return annotationType === "tag" && description === expected;
  });
}

function isSkipped(test: any): boolean {
  const status = String(test?.outcome ?? test?.status ?? "").toLowerCase();
  return status === "skipped";
}

function isGlobalSetup(item: FlattenedTestItem): boolean {
  const filePathLower = (item.file || "").toLowerCase();
  const titlesLower = (item.titlePath || []).join(" / ").toLowerCase();

  return (
    filePathLower.endsWith("global.setup.ts") ||
    titlesLower.includes("global.setup.ts")
  );
}

/**
 * Flatten the Playwright JSON results tree into a list of tests.
 */
export function flattenTests(root: any): FlattenedTestItem[] {
  const flattened: FlattenedTestItem[] = [];

  const stack: Array<{
    node: any;
    inheritedAnnotations: any[];
    titlePath: string[];
  }> = [
    {
      node: root,
      inheritedAnnotations: root.annotations || [],
      titlePath: [root.title || ""],
    },
  ];

  while (stack.length > 0) {
    const { node, inheritedAnnotations, titlePath } = stack.pop()!;

    for (const suite of node.suites || []) {
      const suiteAnnotations = [
        ...inheritedAnnotations,
        ...(suite.annotations || []),
      ];
      const suiteTitlePath = [...titlePath, suite.title || ""];
      stack.push({
        node: suite,
        inheritedAnnotations: suiteAnnotations,
        titlePath: suiteTitlePath,
      });
    }

    for (const spec of node.specs || []) {
      const specAnnotations = [
        ...inheritedAnnotations,
        ...(spec.annotations || []),
      ];
      const specTitlePath = [...titlePath, spec.title || ""];

      const specFilePath =
        spec.location?.file ||
        node.location?.file ||
        (spec.tests && spec.tests[0]?.location?.file) ||
        "";

      for (const test of spec.tests || []) {
        const testAnnotations = [
          ...specAnnotations,
          ...(test.annotations || []),
        ];
        const filePath = test.location?.file || specFilePath || "";

        flattened.push({
          test,
          annotations: testAnnotations,
          projectName: test.projectName || "",
          titlePath: specTitlePath,
          file: filePath,
        });
      }
    }
  }

  return flattened;
}

/**
 * Count test statuses.
 */
export function countStatuses(items: FlattenedTestItem[]): StatusCounts {
  const counts: StatusCounts = {
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
    other: 0,
  };

  for (const { test } of items) {
    const status = String(test?.outcome ?? test?.status ?? "").toLowerCase();

    if (status === "expected" || status === "passed") {
      counts.passed += 1;
    } else if (status === "unexpected" || status === "failed") {
      counts.failed += 1;
    } else if (status === "skipped") {
      counts.skipped += 1;
    } else if (status === "timedout") {
      counts.timedOut += 1;
    } else if (status === "interrupted") {
      counts.interrupted += 1;
    } else {
      counts.other += 1;
    }
  }

  return counts;
}

/**
 * Build a metrics summary from a Playwright JSON results file.
 */
export function buildMetricsSummary(options: ParseOptions): MetricsSummary {
  const {
    jsonPath,
    environmentName,
    excludeGlobalSetup = true,
    excludeSkipped = true,
    categoryConfig,
  } = options;

  const data = readJsonFile(jsonPath);
  const suites = data.suites || [];

  const rawItems = suites.flatMap((suite: any) => flattenTests(suite));

  const filteredItems = rawItems.filter((item: FlattenedTestItem) => {
    if (excludeGlobalSetup && isGlobalSetup(item)) return false;
    if (excludeSkipped && isSkipped(item.test)) return false;
    return true;
  });

  const statusCounts = countStatuses(filteredItems);

  const totals: MetricsTotals = {
    all: filteredItems.length,
    passed: statusCounts.passed,
    failed: statusCounts.failed,
    skipped: statusCounts.skipped,
    timedOut: statusCounts.timedOut,
  };

  // global pass rate
  const globalDenominator = statusCounts.passed + statusCounts.failed;
  const passRate =
    globalDenominator === 0
      ? 0
      : Math.round((statusCounts.passed / globalDenominator) * 100);

  // categories (optional)
  const categories = buildCategoryMetrics(filteredItems, categoryConfig);

  return {
    env: environmentName.toUpperCase(),
    totals,
    passRate,
    categories,
  };
}

export function buildRunPayload(args: {
  jsonPath: string;
  env: string;
  reportUrl?: string;
  runId?: string;
  gitSha?: string | null;
  branch?: string | null;
  runNumber?: string | null;
  categoryConfig?: CategoryConfig;
}): Record<string, unknown> {
  const summary = buildMetricsSummary({
    jsonPath: args.jsonPath,
    environmentName: args.env,
    excludeGlobalSetup: true,
    excludeSkipped: true,
    categoryConfig: args.categoryConfig,
  });

  return {
    env: summary.env,
    runId: args.runId,
    gitSha: args.gitSha,
    branch: args.branch,
    runNumber: args.runNumber,
    totals: summary.totals,
    passRate: summary.passRate,
    categories: summary.categories,
    reportUrl: args.reportUrl,
    timestampISO: new Date().toISOString(),
  };
}
