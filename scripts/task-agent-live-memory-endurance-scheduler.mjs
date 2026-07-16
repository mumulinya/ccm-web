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
const result = endurance.runLiveProviderMemoryEnduranceSchedulerTick({
  force: args.get("force") === "true",
  at: String(args.get("at") || ""),
  intervalMs: args.has("interval-ms") ? Number(args.get("interval-ms")) : undefined,
  groupPrefix: String(args.get("group-prefix") || ""),
  includeFixtures: args.get("include-fixtures") === "true",
});
console.log(`LIVE_PROVIDER_MEMORY_ENDURANCE_SCHEDULER=${JSON.stringify(result)}`);
if (result.destructiveActionAuthorized !== false || result.liveExecutionAuthorized !== false || result.policyMutationApplied !== false) process.exitCode = 1;
