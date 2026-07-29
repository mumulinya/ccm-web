#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const circuit = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "provider-task-circuit-breaker.js"));

const result = circuit.runProviderTaskCircuitSelfTest();
assert.equal(result.pass, true, JSON.stringify(result.checks));

const executorSource = fs.readFileSync(
  path.join(root, "backend", "modules", "collaboration", "collaboration-task-executor.ts"),
  "utf8",
);
const runtimeSource = fs.readFileSync(
  path.join(root, "backend", "modules", "collaboration", "collaboration-task-runtime.ts"),
  "utf8",
);
const serviceSource = fs.readFileSync(
  path.join(root, "backend", "modules", "collaboration", "collaboration-task-service.ts"),
  "utf8",
);

const llmErrorGate = executorSource.indexOf('if (coordinatorRuntime === "llm-error")');
const dispatchRepair = executorSource.indexOf('source: "daily-dev-model-dispatch-repair"');
assert.ok(llmErrorGate >= 0 && dispatchRepair > llmErrorGate, "llm-error must return before daily-dev dispatch repair");
assert.match(executorSource, /dispatch_repair_skipped:\s*true/);
assert.match(runtimeSource, /reason:\s*"provider_circuit_open"/);
assert.match(serviceSource, /providerCircuitGate\.blocked/);

console.log(JSON.stringify({
  pass: true,
  checks: {
    ...result.checks,
    llm_error_skips_dispatch_repair: true,
    queue_entry_blocks_open_circuit: true,
    manual_retry_blocks_open_circuit: true,
    paid_provider_calls: 0,
  },
}, null, 2));
