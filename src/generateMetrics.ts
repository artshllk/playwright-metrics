#!/usr/bin/env node
import { runGenerateMetrics } from "./generateMetricsRunner.js";

const result = runGenerateMetrics(process.argv.slice(2));
console.log("[metrics] summary:", JSON.stringify(result.payload, null, 2));
