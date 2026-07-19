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
const marker = "CCM_PHASE394=";

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
    reactive: require(dist("agents", "final-dispatch-reactive-compact.js")),
    sessions: require(dist("tasks", "agent-sessions.js")),
  };
}

function identities(fixture, side = "A") {
  return side === "A"
    ? {
      groupId: fixture.groupId,
      groupSessionId: fixture.sessionA,
      taskId: fixture.taskIdA || `task-a-${fixture.groupId.replace(/^phase392-group-/, "")}`,
      taskAgentSessionId: fixture.taskSessionA,
      provider: "codex",
      model: "phase392-codex-model",
    }
    : {
      groupId: fixture.groupId,
      groupSessionId: fixture.sessionB,
      taskId: fixture.taskIdB || `task-b-${fixture.groupId.replace(/^phase392-group-/, "")}`,
      taskAgentSessionId: fixture.taskSessionB,
      provider: "cursor",
      model: "phase392-cursor-model",
    };
}

function buildGateNearEstimate(gate, expected, capacity, targetTokens) {
  let low = 1;
  let high = Math.max(16, targetTokens * 8);
  let best = null;
  for (let attempt = 0; attempt < 32 && low <= high; attempt += 1) {
    const chars = Math.floor((low + high) / 2);
    const prompt = "x".repeat(chars);
    const candidate = gate.buildFinalWorkerDispatchPayloadGate({ ...expected, renderedPrompt: prompt, modelContextCapacity: capacity });
    best = { prompt, gate: candidate };
    if (candidate.estimated_total_input_tokens < targetTokens) low = chars + 1;
    else if (candidate.estimated_total_input_tokens > targetTokens) high = chars - 1;
    else break;
  }
  return best;
}

function verifyStage(fixtureFile, restart) {
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const { gate, reactive, sessions } = modules();
  const sessionRows = sessions.listTaskAgentSessions({ groupId: fixture.groupId });
  const sessionA = sessionRows.find(row => row.id === fixture.taskSessionA);
  const sessionB = sessionRows.find(row => row.id === fixture.taskSessionB);
  const baseline = sessionA?.providerContextUsageBaseline || null;
  const expectedA = identities(fixture, "A");
  const expectedB = identities(fixture, "B");
  const baselineVerification = gate.verifyFinalDispatchProviderUsageBaseline(baseline, expectedA);
  const threshold = 48_000;
  const targetEstimate = threshold - Math.max(1, Math.floor(Number(baseline?.positive_drift_tokens || 0) / 2));
  const capacity = {
    contextWindow: 64_000,
    reservedOutputTokens: 8_000,
    effectiveContextWindow: 56_000,
    autoCompactBufferTokens: 8_000,
    autoCompactThreshold: threshold,
    source: "phase394_test_capacity",
  };
  const nearThreshold = buildGateNearEstimate(gate, expectedA, capacity, targetEstimate);
  const prompt = nearThreshold.prompt;
  const rawGate = nearThreshold.gate;
  const calibratedGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expectedA, renderedPrompt: prompt, modelContextCapacity: capacity, providerUsageBaseline: baseline });
  const calibratedVerification = gate.verifyFinalWorkerDispatchPayloadGate(calibratedGate, { ...expectedA, renderedPrompt: prompt });
  const recovered = reactive.recoverFinalWorkerDispatchPayload({
    ...expectedA,
    renderedPrompt: prompt,
    recentContext: prompt,
    renderPrompt: context => context,
    finalDispatchPayloadGate: calibratedGate,
    modelContextCapacity: capacity,
    providerUsageBaseline: baseline,
  });
  const siblingGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expectedB, renderedPrompt: "short sibling prompt", providerUsageBaseline: baseline });
  const switchedProviderGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expectedA, provider: "cursor", renderedPrompt: "provider switch prompt", providerUsageBaseline: baseline });
  const checks = {
    reportedUsagePersistsAsBaseline: baselineVerification.valid === true && baseline?.status === "ready" && baseline?.body_free === true,
    baselineBindsExactTaskSession: baseline?.group_session_id === fixture.sessionA && baseline?.task_agent_session_id === fixture.taskSessionA && baseline?.provider === "codex" && baseline?.model === "phase392-codex-model",
    directAndCacheProduceObservedContext: baseline?.direct_input_tokens === 2_000 && baseline?.cache_read_input_tokens === 5_500 && baseline?.cache_creation_input_tokens === 300 && baseline?.observed_context_tokens === 7_800,
    positiveUnderestimateIsRemembered: baseline?.estimated_context_tokens === 7_367 && baseline?.positive_drift_tokens === 433,
    unreportedSiblingHasNoBaseline: !sessionB?.providerContextUsageBaseline,
    rawEstimateWouldDispatch: rawGate.status === "ready" && rawGate.provider_call_allowed === true && rawGate.estimated_total_input_tokens < threshold,
    observedBiasTriggersPreflightCompact: calibratedGate.status === "recompact_required" && calibratedGate.provider_call_allowed === false && calibratedGate.provider_usage_baseline_bias_tokens === 433,
    modelVisibleCountIncludesBiasOnce: calibratedGate.model_visible_input_tokens === calibratedGate.estimated_total_input_tokens + 433 && calibratedGate.token_basis === "provider_observed_baseline_plus_current_estimate",
    calibratedGateVerifies: calibratedVerification.valid === true,
    calibratedOverflowFailsClosed: recovered.recovered === false
      && recovered.gate.status === "recompact_required"
      && recovered.gate.provider_call_allowed === false
      && recovered.receipt?.status === "blocked"
      && recovered.receipt?.action === "rotate_native_generation_and_reinject_canonical_parent_context",
    recoveryKeepsObservedBaseline: recovered.gate.provider_usage_baseline_bias_tokens === 433 && recovered.gate.token_basis === "provider_observed_baseline_plus_current_estimate",
    siblingCannotConsumeBaseline: siblingGate.status === "calibration_invalid" && siblingGate.provider_call_allowed === false,
    providerSwitchCannotConsumeBaseline: switchedProviderGate.status === "calibration_invalid" && switchedProviderGate.provider_call_allowed === false,
    baselineChecksumStable: typeof baseline?.baseline_checksum === "string" && baseline.baseline_checksum.length === 64,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, baseline, rawGate, calibratedGate, siblingGate, switchedProviderGate }, null, 2));
  process.stdout.write(`${marker}${JSON.stringify({ pass: true, restart, checks: Object.keys(checks).length, baselineChecksum: baseline.baseline_checksum, checksDetail: checks })}\n`);
}

function tamperStage(fixtureFile) {
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const storeFile = path.join(path.dirname(fixtureFile), "task-agent-sessions.json");
  const store = JSON.parse(fs.readFileSync(storeFile, "utf8"));
  const sessionA = store.sessions.find(row => row.id === fixture.taskSessionA);
  assert.ok(sessionA?.providerContextUsageBaseline);
  sessionA.providerContextUsageBaseline.observed_context_tokens += 1;
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), "utf8");
  process.stdout.write(`${marker}${JSON.stringify({ pass: true, tampered: true })}\n`);
}

function verifyTamperStage(fixtureFile) {
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const { gate, sessions } = modules();
  const sessionRows = sessions.listTaskAgentSessions({ groupId: fixture.groupId });
  const sessionA = sessionRows.find(row => row.id === fixture.taskSessionA);
  const sessionB = sessionRows.find(row => row.id === fixture.taskSessionB);
  const baseline = sessionA?.providerContextUsageBaseline || null;
  const expectedA = identities(fixture, "A");
  const baselineVerification = gate.verifyFinalDispatchProviderUsageBaseline(baseline, expectedA);
  const blockedGate = gate.buildFinalWorkerDispatchPayloadGate({ ...expectedA, renderedPrompt: "tampered baseline prompt", providerUsageBaseline: baseline });
  const blockedVerification = gate.verifyFinalWorkerDispatchPayloadGate(blockedGate, { ...expectedA, renderedPrompt: "tampered baseline prompt" });
  const cleanSiblingGate = gate.buildFinalWorkerDispatchPayloadGate({ ...identities(fixture, "B"), renderedPrompt: "clean sibling prompt" });
  const checks = {
    tamperedPersistedBaselineIsInvalid: baselineVerification.valid === false && baselineVerification.issues.includes("provider_usage_baseline_checksum_invalid"),
    tamperedBaselineFailsClosedBeforeProvider: blockedGate.status === "calibration_invalid" && blockedGate.provider_call_allowed === false && blockedGate.action === "fail_closed_invalid_provider_usage_baseline",
    invalidGateCannotPassVerification: blockedVerification.valid === false && blockedVerification.issues.includes("provider_usage_baseline_checksum_invalid"),
    siblingRemainsIndependent: !sessionB?.providerContextUsageBaseline && cleanSiblingGate.status === "ready" && cleanSiblingGate.provider_call_allowed === true,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, baselineVerification, blockedGate, blockedVerification, cleanSiblingGate }, null, 2));
  process.stdout.write(`${marker}${JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks })}\n`);
}

const stage = process.argv[2] || "orchestrate";
if (stage === "verify") verifyStage(process.argv[3], false);
else if (stage === "restart") verifyStage(process.argv[3], true);
else if (stage === "tamper") tamperStage(process.argv[3]);
else if (stage === "verify-tamper") verifyTamperStage(process.argv[3]);
else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase394-provider-baseline-"));
  const fixtureFile = path.join(home, ".cc-connect", "phase394-fixture.json");
  try {
    const create = parseLine(runProcess([fixtureScript, "create-calibrated", fixtureFile], home), "CCM_PHASE392=");
    assert.equal(create.fixture.calibrated, true);
    const verify = parseLine(runProcess([scriptFile, "verify", fixtureFile], home), marker);
    const restart = parseLine(runProcess([scriptFile, "restart", fixtureFile], home), marker);
    const checksumStable = verify.baselineChecksum === restart.baselineChecksum;
    assert.equal(checksumStable, true);
    const tamper = parseLine(runProcess([scriptFile, "tamper", fixtureFile], home), marker);
    const verifyTamper = parseLine(runProcess([scriptFile, "verify-tamper", fixtureFile], home), marker);
    process.stdout.write(`${JSON.stringify({
      pass: true,
      checks: 3 + verify.checks + restart.checks + verifyTamper.checks,
      create: { pass: true, calibrated: true },
      verify,
      restart,
      tamper,
      verifyTamper,
      checksumStable,
    }, null, 2)}\n`);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
