import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptFile = fileURLToPath(import.meta.url);
const fixtureScript = path.join(root, "scripts", "final-dispatch-model-view-exact-session-restart-selftest.mjs");
const marker = "CCM_PHASE395=";

function parseLine(output, prefix) {
  const line = String(output || "").split(/\r?\n/).find(row => row.startsWith(prefix));
  if (!line) throw new Error(`missing ${prefix} result`);
  return JSON.parse(line.slice(prefix.length));
}

function runProcess(args, home) {
  const child = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (child.status !== 0) {
    process.stderr.write(child.stdout || "");
    process.stderr.write(child.stderr || "");
    process.exit(child.status || 1);
  }
  return child.stdout;
}

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    gate: require(dist("agents", "final-dispatch-payload-gate.js")),
    sessions: require(dist("tasks", "agent-sessions.js")),
  };
}

function expectedIdentity(fixture) {
  return {
    groupId: fixture.groupId,
    groupSessionId: fixture.sessionA,
    taskId: fixture.taskIdA || `task-a-${fixture.groupId.replace(/^phase392-group-/, "")}`,
    taskAgentSessionId: fixture.taskSessionA,
    provider: "codex",
    model: "phase392-codex-model",
    providerContractId: "phase395-codex-contract-v1",
    providerRuntimeVersion: "phase395-codex-runtime-v1",
  };
}

function verifyStage(fixtureFile, restart) {
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const { gate, sessions } = modules();
  const session = sessions.listTaskAgentSessions({ groupId: fixture.groupId }).find(row => row.id === fixture.taskSessionA);
  const baseline = session?.providerContextUsageBaseline || null;
  const expected = expectedIdentity(fixture);
  const baselineVerification = gate.verifyFinalDispatchProviderUsageBaseline(baseline, expected);
  const matchingGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expected, renderedPrompt: "matching identity prompt", providerUsageBaseline: baseline });
  const modelSwitchGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expected, model: "phase395-codex-model-v2", renderedPrompt: "model switch prompt", providerUsageBaseline: baseline });
  const contractSwitchGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expected, providerContractId: "phase395-codex-contract-v2", renderedPrompt: "contract switch prompt", providerUsageBaseline: baseline });
  const runtimeSwitchGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expected, providerRuntimeVersion: "phase395-codex-runtime-v2", renderedPrompt: "runtime switch prompt", providerUsageBaseline: baseline });
  const anonymousModelBaseline = gate.buildFinalDispatchProviderUsageBaseline({
    ...expected,
    model: "",
    usage: {
      status: "reported",
      reported: true,
      direct_input_tokens: 2_000,
      cache_read_input_tokens: 5_500,
      cache_creation_input_tokens: 300,
      final_prompt_estimated_tokens: 7_367,
      usage_checksum: "a".repeat(64),
    },
  });
  const anonymousVerification = gate.verifyFinalDispatchProviderUsageBaseline(anonymousModelBaseline, { ...expected, model: "" });
  const productionSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-cross-agents-part-02-part-02.ts"), "utf8");
  const deliverySource = fs.readFileSync(path.join(root, "backend", "tasks", "agent-sessions-delivery.ts"), "utf8");
  const checks = {
    baselineBindsModelContractAndRuntime: baseline?.model === expected.model && baseline?.provider_contract_id === expected.providerContractId && baseline?.provider_runtime_version === expected.providerRuntimeVersion,
    exactIdentityVerifies: baselineVerification.valid === true,
    exactIdentityCanUseCalibration: matchingGate.status === "ready" && matchingGate.provider_call_allowed === true && matchingGate.provider_usage_baseline_status === "provider_observed",
    modelSwitchFailsClosed: modelSwitchGate.status === "calibration_invalid" && modelSwitchGate.provider_call_allowed === false,
    contractSwitchFailsClosed: contractSwitchGate.status === "calibration_invalid" && contractSwitchGate.provider_call_allowed === false,
    runtimeSwitchFailsClosed: runtimeSwitchGate.status === "calibration_invalid" && runtimeSwitchGate.provider_call_allowed === false,
    anonymousModelCannotCreateReadyBaseline: anonymousModelBaseline.status === "unavailable" && anonymousVerification.valid === false && anonymousVerification.issues.includes("provider_usage_baseline_model_missing"),
    productionRequiresKnownModelForReuse: productionSource.includes("&& activeProviderModel") && productionSource.includes("providerContextUsageBaseline.model"),
    productionMatchesContractAndRuntime: productionSource.includes("providerContextUsageBaseline.provider_contract_id") && productionSource.includes("providerContextUsageBaseline.provider_runtime_version"),
    receiptIdentityFeedsBaseline: deliverySource.includes("providerMemoryTransportUsage.provider_contract_id") && deliverySource.includes("providerMemoryTransportUsage.provider_runtime_version"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, baselineVerification, matchingGate, modelSwitchGate, contractSwitchGate, runtimeSwitchGate, anonymousVerification }, null, 2));
  process.stdout.write(`${marker}${JSON.stringify({ pass: true, restart, checks: Object.keys(checks).length, baselineChecksum: baseline.baseline_checksum, checksDetail: checks })}\n`);
}

const stage = process.argv[2] || "orchestrate";
if (stage === "verify") verifyStage(process.argv[3], false);
else if (stage === "restart") verifyStage(process.argv[3], true);
else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase395-provider-identity-"));
  const fixtureFile = path.join(home, ".cc-connect", "phase395-fixture.json");
  try {
    const create = parseLine(runProcess([fixtureScript, "create-calibrated", fixtureFile], home), "CCM_PHASE392=");
    assert.equal(create.fixture.calibrated, true);
    const verify = parseLine(runProcess([scriptFile, "verify", fixtureFile], home), marker);
    const restart = parseLine(runProcess([scriptFile, "restart", fixtureFile], home), marker);
    const checksumStable = verify.baselineChecksum === restart.baselineChecksum;
    assert.equal(checksumStable, true);
    process.stdout.write(`${JSON.stringify({
      pass: true,
      checks: 3 + verify.checks + restart.checks,
      create: { pass: true, calibrated: true },
      verify,
      restart,
      checksumStable,
    }, null, 2)}\n`);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
