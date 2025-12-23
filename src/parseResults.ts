#!/usr/bin/env node
import { runParseResults } from "./parseResultsRunner.js";

const output = runParseResults(process.argv.slice(2));
console.log("[metrics] summary:", JSON.stringify(output, null, 2));
