import {
  CategoryConfig,
  CategoryDefinition,
  CategoryMetrics,
  FlattenedTestItem,
  hasTagAnnotation,
} from "../playwrightMetrics.js";

export function isInCategory(
  item: FlattenedTestItem,
  tags: string[] = [],
  patterns: RegExp[] = []
): boolean {
  const hasMatchingTag = tags.some((tag) =>
    hasTagAnnotation(item.annotations, tag)
  );

  const hasMatchingProject = patterns.some((re) => re.test(item.projectName));

  return hasMatchingTag || hasMatchingProject;
}

export function matchesCategory(
  item: FlattenedTestItem,
  def: CategoryDefinition
): boolean {
  const tags = def.tags ?? [];
  const projectPatterns = def.projectPatterns ?? [];
  const filePatterns = def.filePatterns ?? [];

  const hasTag =
    tags.length > 0 &&
    tags.some((tag) => hasTagAnnotation(item.annotations, tag));

  const hasProjectPattern =
    projectPatterns.length > 0 &&
    projectPatterns.some((pattern) =>
      item.projectName.toLowerCase().includes(pattern.toLowerCase())
    );

  const hasFilePattern =
    filePatterns.length > 0 &&
    filePatterns.some((pattern) =>
      item.file.toLowerCase().includes(pattern.toLowerCase())
    );

  return hasTag || hasProjectPattern || hasFilePattern;
}

export function buildCategoryMetrics(
  items: FlattenedTestItem[],
  categoryConfig?: CategoryConfig
): Record<string, CategoryMetrics> | undefined {
  if (!categoryConfig || !categoryConfig.categories?.length) {
    return undefined;
  }

  const mode = categoryConfig.categoryMode ?? "multi";

  // init metrics map
  const metrics: Record<string, CategoryMetrics> = {};
  for (const def of categoryConfig.categories) {
    metrics[def.name] = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      passRate: 0,
    };
  }

  for (const item of items) {
    const status = String(
      item.test?.outcome ?? item.test?.status ?? ""
    ).toLowerCase();

    const matchedNames: string[] = [];

    for (const def of categoryConfig.categories) {
      // this is where your helper comes in
      if (matchesCategory(item, def)) {
        matchedNames.push(def.name);
        if (mode === "exclusive") break;
      }
    }

    for (const name of matchedNames) {
      const cat = metrics[name];
      if (!cat) continue;

      cat.total += 1;

      if (status === "expected" || status === "passed") {
        cat.passed += 1;
      } else if (status === "unexpected" || status === "failed") {
        cat.failed += 1;
      } else if (status === "skipped") {
        cat.skipped += 1;
      } else if (status === "timedout") {
        cat.timedOut += 1;
      }
    }
  }

  // compute per-category passRate
  for (const cat of Object.values(metrics)) {
    const denom = cat.passed + cat.failed;
    cat.passRate = denom === 0 ? 0 : Math.round((cat.passed / denom) * 100);
  }

  return metrics;
}
