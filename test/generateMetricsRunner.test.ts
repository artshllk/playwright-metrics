import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/playwrightMetrics.js", () => {
  return {
    buildMetricsSummary: vi.fn(() => ({
      env: "DEV",
      totals: { all: 10, passed: 9, failed: 1, skipped: 0, timedOut: 0 },
      passRate: 90,
    })),
  };
});

import * as runner from "../src/generateMetricsRunner.js";

describe("generateMetricsRunner", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-metrics-"));

    process.env.ENV = "DEV";
    delete process.env.BUILD_SOURCEVERSION;
    delete process.env.GITHUB_SHA;
    delete process.env.BUILD_BUILDNUMBER;
    delete process.env.GITHUB_RUN_NUMBER;
    delete process.env.BUILD_SOURCEBRANCHNAME;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.BUILD_SOURCEBRANCH;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("parses CLI arguments", () => {
    const out = runner.parseCliArguments([
      "--json=test-results/results.json",
      "--env=UAT",
      "--flagOnly",
    ]);

    expect(out.json).toBe("test-results/results.json");
    expect(out.env).toBe("UAT");
    expect(out.flagOnly).toBe(true);
  });

  it("detectGitSha falls back to env vars when git command fails", () => {
    process.env.GITHUB_SHA = "abcdef1234567890";
    const exec = vi.fn(() => {
      throw new Error("no git");
    });

    const sha = runner.detectGitSha(exec as any);
    expect(sha).toBe("abcdef1");
  });

  it("writes per-run metrics.json and updates metrics-latest.json", () => {
    const outDir = path.join(tmpDir, "artifacts");
    const latest = path.join(tmpDir, "site", "metrics-latest.json");

    const { payload, perRunPath, latestPath } = runner.runGenerateMetrics(
      [
        `--json=${path.join(tmpDir, "fake-results.json")}`,
        "--env=DEV",
        `--outDir=${outDir}`,
        `--latest=${latest}`,
      ],
      {
        detectGitSha: () => "acd12ef",
        detectRunNumber: () => "143",
        detectBranchName: () => "main",
        now: () => new Date("2025-01-12T10:30:22.123Z"),
      }
    );

    expect(perRunPath).toContain(path.join("artifacts", "dev"));
    expect(latestPath).toBe(path.resolve(latest));

    expect(fs.existsSync(perRunPath)).toBe(true);
    expect(fs.existsSync(latestPath)).toBe(true);

    const perRun = JSON.parse(fs.readFileSync(perRunPath, "utf8"));
    expect(perRun.env).toBe("DEV");
    expect(perRun.gitSha).toBe("acd12ef");
    expect(perRun.branch).toBe("main");
    expect(perRun.runNumber).toBe("143");
    expect(perRun.timestampISO).toBe("2025-01-12T10:30:22.123Z");
    expect(perRun.passRate).toBe(90);
    expect(perRun.totals.all).toBe(10);

    const latestJson = JSON.parse(fs.readFileSync(latestPath, "utf8"));
    expect(latestJson.DEV).toBeTruthy();
    expect(latestJson.DEV.env).toBe("DEV");

    expect(payload).toMatchObject({
      env: "DEV",
      gitSha: "acd12ef",
      branch: "main",
      runNumber: "143",
      passRate: 90,
    });
  });

  it("handles invalid metrics-latest.json by resetting it", () => {
    const outDir = path.join(tmpDir, "artifacts");
    const latest = path.join(tmpDir, "site", "metrics-latest.json");

    fs.mkdirSync(path.dirname(latest), { recursive: true });
    fs.writeFileSync(latest, "{ not valid json", "utf8");

    runner.runGenerateMetrics(
      [
        `--json=${path.join(tmpDir, "fake-results.json")}`,
        "--env=SIT",
        `--outDir=${outDir}`,
        `--latest=${latest}`,
      ],
      {
        detectGitSha: () => null,
        detectRunNumber: () => null,
        detectBranchName: () => null,
        now: () => new Date("2025-01-12T10:30:22.123Z"),
      }
    );

    const latestJson = JSON.parse(fs.readFileSync(latest, "utf8"));
    expect(latestJson.SIT).toBeTruthy();

    expect(latestJson.SIT.env).toBe("DEV");
  });
});
