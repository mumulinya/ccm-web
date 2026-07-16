#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const approval = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-wave-approval.js"));
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
const numberArg = name => args.has(name) ? Number(args.get(name)) : undefined;
const execute = args.get("execute") === "true";
const result = approval.reconcileLiveProviderMemoryWaveApprovals({
  maintenance: true,
  prune: execute,
  dryRun: !execute,
  retentionDays: numberArg("retention-days"),
  minimumRetained: numberArg("minimum-retained"),
  maximumReceipts: numberArg("maximum-receipts"),
  graceHours: numberArg("grace-hours"),
  claimStaleMs: numberArg("claim-stale-ms"),
  nowMs: numberArg("now-ms"),
});
console.log(`LIVE_PROVIDER_MEMORY_WAVE_APPROVAL_RETENTION=${JSON.stringify({
  schema: result.schema,
  generatedAt: result.generatedAt,
  dryRun: !execute,
  policy: result.policy,
  count: result.count,
  terminalCount: result.terminalCount,
  invalidCount: result.invalidCount,
  candidateCount: result.prunableCount,
  prunedCount: result.prunedCount,
  skippedCount: result.skippedCount,
  audit: result.audit,
})}`);
if (execute && result.skippedCount > 0) process.exitCode = 1;
