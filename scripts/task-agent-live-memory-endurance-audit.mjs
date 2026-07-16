#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const endurance = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-endurance.js"));
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

const report = endurance.auditLiveProviderMemoryEndurance({
  groupPrefix: String(args.get("group-prefix") || ""),
  includeFixtures: args.get("include-fixtures") === "true",
  persist: args.get("no-persist") !== "true",
  lockTimeoutMs: args.has("lock-timeout-ms") ? Number(args.get("lock-timeout-ms")) : undefined,
});
console.log(`LIVE_PROVIDER_MEMORY_ENDURANCE=${JSON.stringify({
  schema: report.schema,
  generatedAt: report.generatedAt,
  reportChecksum: report.reportChecksum,
  reportFile: report.reportFile,
  summary: report.summary,
  concurrencyBuckets: report.concurrencyBuckets,
  attribution: report.attribution,
  gatePassed: report.gatePassed,
})}`);
if (!report.gatePassed) process.exitCode = 1;
