import { describe, expect, it, vi } from "vitest";

vi.mock("../src/playwrightMetrics.js", () => {
  return {
    buildMetricsSummary: vi.fn(() => ({
      env: "UAT",
      totals: { all: 5, passed: 5, failed: 0, skipped: 0, timedOut: 0 },
      passRate: 100,
    })),
  };
});

import {
  parseCliArguments,
  runParseResults,
} from "../src/parseResultsRunner.js";

describe("parseResultsRunner", () => {
  it("parses CLI arguments", () => {
    const out = parseCliArguments(["--json=a.json", "--env=SIT", "--flag"]);
    expect(out.json).toBe("a.json");
    expect(out.env).toBe("SIT");
    expect(out.flag).toBe(true);
  });

  it("returns summary output (no file writes)", () => {
    process.env.ENV = "DEV";

    const output = runParseResults(["--json=fake.json", "--env=UAT"]);

    expect(output).toEqual({
      env: "UAT",
      totals: { all: 5, passed: 5, failed: 0, skipped: 0, timedOut: 0 },
      passRate: 100,
    });
  });
});
