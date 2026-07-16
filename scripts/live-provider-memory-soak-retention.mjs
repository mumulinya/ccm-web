#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const retention = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-retention.js"));
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const item = process.argv[index];
  if (!item.startsWith("--")) continue;
  const key = item.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else args.set(key, "true");
}
const numberArg = (name, fallback = undefined) => args.has(name) ? Number(args.get(name)) : fallback;
const result = retention.reconcileLiveProviderMemorySoakReports({
  prune: args.get("execute") === "true",
  dryRun: args.get("execute") !== "true",
  singleRetentionDays: numberArg("single-retention-days"),
  multiRetentionDays: numberArg("multi-retention-days"),
  fleetRetentionDays: numberArg("fleet-retention-days"),
  enduranceRetentionDays: numberArg("endurance-retention-days"),
  graceHours: numberArg("grace-hours"),
  maximumSingleReports: numberArg("maximum-single-reports"),
  maximumMultiReports: numberArg("maximum-multi-reports"),
  maximumFleetReports: numberArg("maximum-fleet-reports"),
  maximumEnduranceReports: numberArg("maximum-endurance-reports"),
  minimumSingleReports: numberArg("minimum-single-reports"),
  minimumMultiReports: numberArg("minimum-multi-reports"),
  minimumFleetReports: numberArg("minimum-fleet-reports"),
  minimumEnduranceReports: numberArg("minimum-endurance-reports"),
});
console.log(`LIVE_PROVIDER_MEMORY_SOAK_RETENTION=${JSON.stringify({
  schema: result.schema,
  generatedAt: result.generatedAt,
  dryRun: result.dryRun,
  policy: result.policy,
  summary: result.summary,
  candidateCount: result.prunableRows.length,
  prunedCount: result.pruned.length,
  skippedCount: result.skipped.length,
  audit: result.audit,
})}`);
if (!result.dryRun && result.skipped.length > 0) process.exitCode = 1;
