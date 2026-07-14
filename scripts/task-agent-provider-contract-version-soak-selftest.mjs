import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-provider-contract-soak-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
process.env.CCM_CONTINUATION_SOAK_EPOCH = "svc_phase260_after_upgrade";

const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const continuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const memoryCenter = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function versionSnapshot(version, identity) {
  return {
    schema: "ccm-agent-runtime-version-snapshot-v1",
    version: 1,
    provider: "codex",
    command: "codex",
    executablePaths: [`C:/phase260/${identity}/codex.exe`],
    executableIdentityChecksum: identity,
    versionText: `codex-cli ${version}`,
    semanticVersion: version,
    status: "ok",
    observedAt: "2026-07-14T00:00:00.000Z",
    snapshotChecksum: `snapshot-${identity}`,
  };
}

function output(sessionId, snapshot, drift = false) {
  const raw = JSON.stringify(drift
    ? { type: "conversation.started", threadId: sessionId }
    : { type: "thread.started", thread_id: sessionId });
  return runtime.normalizeAgentCommandOutput("codex", raw, { runtimeVersionSnapshot: snapshot });
}

function evidence({ runnerRequestId, requested = "", returned = "", normalized, expected = "", resume = false }) {
  return continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: requested,
    returnedNativeSessionId: returned || normalized.rawSessionId,
    providerOutputContractEvidence: normalized.providerOutputContractEvidence,
    providerRuntimeVersionSnapshot: normalized.providerOutputContractEvidence.runtimeVersionSnapshot,
    expectedProviderContractId: expected,
    nativeResumeRequested: resume,
    runnerSuccess: true,
  });
}

function recordSoak(groupId, groupSessionId, taskAgentSessionId, phaseEvidence, index, epoch) {
  return soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId,
    phase: "continuation_evidence_captured",
    status: phaseEvidence.compatibilityStatus,
    eventKey: `phase260-contract-${index}`,
    serviceEpoch: epoch,
    evidence: {
      invocation_edge_id: `taie_phase260_${index}_${nonce}`,
      nativeContinuationEvidence: phaseEvidence,
    },
  });
}

try {
  const realVersions = ["claudecode", "codex", "cursor"].map(provider => runtime.captureAgentRuntimeVersionSnapshot(provider));
  for (const snapshot of realVersions) {
    equal(snapshot.status, "ok", `${snapshot.provider} real CLI version probe must succeed`);
    ok(snapshot.versionText, `${snapshot.provider} version text must be retained`);
    ok(snapshot.executableIdentityChecksum, `${snapshot.provider} executable identity must be checksummed`);
  }

  const versionA = versionSnapshot("0.115.0", "runtime-A");
  const versionB = versionSnapshot("0.116.0", "runtime-B");
  const versionC = versionSnapshot("0.117.0", "runtime-C");
  const nativeA = `thread-phase260-a-${nonce}`;
  const nativeC = `thread-phase260-c-${nonce}`;
  const normalizedA = output(nativeA, versionA);
  const normalizedARepeat = output(nativeA, { ...versionA, observedAt: "2026-07-14T01:00:00.000Z" });
  equal(normalizedA.providerOutputContractEvidence.schema, "ccm-provider-output-contract-evidence-v2", "provider output evidence must be versioned v2");
  equal(normalizedA.providerOutputContractEvidence.runtimeVersion, "0.115.0", "output contract must bind the CLI version");
  equal(normalizedA.providerOutputContractEvidence.providerContractId, normalizedARepeat.providerOutputContractEvidence.providerContractId, "observation time must not change a stable provider contract ID");

  const normalizedB = output(nativeA, versionB);
  const normalizedCDrift = output(nativeA, versionC, true);
  ok(normalizedA.providerOutputContractEvidence.providerContractId !== normalizedB.providerOutputContractEvidence.providerContractId, "binary version identity change must create a new contract epoch");
  equal(normalizedCDrift.providerOutputContractEvidence.status, "output_format_drift", "new-version output drift must remain fail closed");

  const groupId = `group-phase260-${nonce}`;
  const groupSessionId = `gcs_phase260_${nonce.replace(/[^a-z0-9]/gi, "")}`;
  const taskId = `task-phase260-${nonce}`;
  let taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: "phase260-project", agentType: "codex" });

  const spawnA = evidence({ runnerRequestId: `adr-phase260-spawn-a-${nonce}`, normalized: normalizedA });
  equal(spawnA.nativeSessionReusable, true, "first versioned spawn must capture a reusable native session");
  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, { success: true, nativeSessionId: nativeA, nativeContinuationEvidence: spawnA });
  equal(taskSession.providerContractId, normalizedA.providerOutputContractEvidence.providerContractId, "Task Agent session must persist the first trusted contract ID");
  equal(sessions.getTaskAgentSessionOptions(taskSession).expectedProviderContractId, taskSession.providerContractId, "next invocation must carry the prior contract expectation");
  recordSoak(groupId, groupSessionId, taskSession.id, spawnA, 1, "svc_phase260_before_upgrade");

  const stableResume = evidence({
    runnerRequestId: `adr-phase260-resume-a-${nonce}`,
    requested: nativeA,
    normalized: normalizedA,
    expected: taskSession.providerContractId,
    resume: true,
  });
  equal(stableResume.compatibilityStatus, "acknowledged", "same-version resume must stay acknowledged");
  equal(stableResume.providerContractTransition, false, "same-version resume must not create an epoch transition");
  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, { success: true, nativeSessionId: nativeA, nativeContinuationEvidence: stableResume });
  recordSoak(groupId, groupSessionId, taskSession.id, stableResume, 2, "svc_phase260_before_upgrade");

  const verifiedUpgrade = evidence({
    runnerRequestId: `adr-phase260-resume-b-${nonce}`,
    requested: nativeA,
    normalized: normalizedB,
    expected: taskSession.providerContractId,
    resume: true,
  });
  equal(verifiedUpgrade.providerContractTransition, true, "CLI upgrade must be explicit in continuation evidence");
  equal(verifiedUpgrade.providerContractContinuityVerified, true, "current-version matching native ID must verify upgrade continuity");
  equal(verifiedUpgrade.compatibilityStatus, "provider_runtime_contract_transition_verified", "verified upgrade must have an explicit status");
  equal(verifiedUpgrade.nativeSessionReusable, true, "verified upgrade may retain the native session");
  const contractA = taskSession.providerContractId;
  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, { success: true, nativeSessionId: nativeA, nativeContinuationEvidence: verifiedUpgrade });
  equal(taskSession.providerContractId, normalizedB.providerOutputContractEvidence.providerContractId, "verified upgrade must advance the persisted contract epoch");
  ok(taskSession.providerContractHistory.some(item => item.contractId === contractA), "superseded contract epoch must remain auditable");
  recordSoak(groupId, groupSessionId, taskSession.id, verifiedUpgrade, 3, "svc_phase260_after_upgrade");

  const driftedUpgrade = evidence({
    runnerRequestId: `adr-phase260-resume-c-drift-${nonce}`,
    requested: nativeA,
    normalized: normalizedCDrift,
    expected: taskSession.providerContractId,
    resume: true,
  });
  equal(driftedUpgrade.providerContractTransition, true, "drifted upgrade must still expose the attempted contract transition");
  equal(driftedUpgrade.providerContractContinuityVerified, false, "drifted output cannot verify version continuity");
  equal(driftedUpgrade.nativeSessionReusable, false, "old native session must be fenced after unverified upgrade");
  const contractB = taskSession.providerContractId;
  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, {
    success: true,
    nativeSessionId: "",
    nativeContinuationEvidence: driftedUpgrade,
    nativeContinuationUnverified: true,
  });
  equal(taskSession.resumeMode, "scratchpad", "unverified version transition must degrade to scratchpad");
  equal(taskSession.nativeSessionId, "", "unverified version transition must clear the old native ID");
  equal(taskSession.providerContractId, contractB, "unverified version must not replace the last trusted contract");
  equal(taskSession.pendingProviderContractId, normalizedCDrift.providerOutputContractEvidence.providerContractId, "new contract must remain pending for a clean recovery spawn");
  recordSoak(groupId, groupSessionId, taskSession.id, driftedUpgrade, 4, "svc_phase260_after_upgrade");

  taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: "phase260-project", agentType: "codex" });
  equal(taskSession.resumeMode, "native", "next turn must retry native capture after scratchpad protection");
  const recoveryOptions = sessions.getTaskAgentSessionOptions(taskSession);
  equal(recoveryOptions.expectedProviderContractId, normalizedCDrift.providerOutputContractEvidence.providerContractId, "recovery spawn must use the pending current-version contract");
  equal(recoveryOptions.resumeSession, false, "recovery must spawn instead of resuming the fenced old session");

  const normalizedCRecovery = output(nativeC, versionC);
  const recoveredSpawn = evidence({
    runnerRequestId: `adr-phase260-spawn-c-${nonce}`,
    normalized: normalizedCRecovery,
    expected: recoveryOptions.expectedProviderContractId,
  });
  equal(recoveredSpawn.providerContractContinuityVerified, true, "clean current-version spawn must verify the pending contract");
  equal(recoveredSpawn.nativeSessionReusable, true, "clean current-version spawn must produce a reusable session");
  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, { success: true, nativeSessionId: nativeC, nativeContinuationEvidence: recoveredSpawn });
  equal(taskSession.providerContractId, normalizedCRecovery.providerOutputContractEvidence.providerContractId, "recovery must promote the pending contract to trusted");
  equal(taskSession.pendingProviderContractId, "", "successful recovery must clear the pending contract");
  equal(taskSession.nativeSessionId, nativeC, "recovery must bind a new native session ID");
  recordSoak(groupId, groupSessionId, taskSession.id, recoveredSpawn, 5, "svc_phase260_after_upgrade");

  const report = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId });
  equal(report.schema, "ccm-task-agent-continuation-soak-report-v6", "soak report must expose compact-head-fenced artifact closure governance v6");
  equal(report.overall.validChainCount, 1, "version transition events must retain a valid hash chain");
  equal(report.overall.providerContractEpochCount, 3, "soak report must count all observed CLI contract epochs");
  equal(report.overall.providerContractTransitionCount, 2, "soak report must count verified and unverified upgrades");
  equal(report.overall.providerContractTransitionVerifiedCount, 1, "verified upgrade must be counted");
  equal(report.overall.providerContractTransitionUnverifiedCount, 1, "unverified upgrade must remain visible after recovery");
  equal(report.rows[0].restartObserved, true, "service epochs around the CLI upgrade must remain restart-visible");
  ok(report.rows[0].providerRuntimeVersions.includes("0.115.0") && report.rows[0].providerRuntimeVersions.includes("0.117.0"), "soak report must retain provider-version evidence");

  const center = memoryCenter.buildTaskAgentMemoryContextSnapshotReport({ groupId });
  equal(center.overall.continuationSoakProviderContractEpochCount, 3, "Memory Center must expose contract epochs");
  equal(center.overall.continuationSoakProviderContractTransitionVerifiedCount, 1, "Memory Center must expose verified upgrades");
  equal(center.overall.continuationSoakProviderContractTransitionUnverifiedCount, 1, "Memory Center must expose unsafe upgrades");
  equal(center.providerRuntimeContracts.schema, "ccm-memory-center-provider-runtime-contract-inventory-v1", "Memory Center must expose live provider contract inventory");
  equal(center.providerRuntimeContracts.rows.length, 3, "Memory Center must probe the three resumable providers");
  equal(center.overall.providerRuntimeContractHealthyCount, 3, "all installed resumable provider CLIs must be healthy");

  const tampered = { ...verifiedUpgrade, providerRuntimeVersion: "9.9.9" };
  equal(continuation.verifyNativeSessionContinuationEvidence(tampered).valid, false, "version-bound continuation evidence must detect tampering");

  const otherGroup = `group-phase260-other-${nonce}`;
  const isolated = soak.buildTaskAgentContinuationSoakReport({ groupId: otherGroup });
  equal(isolated.overall.chainCount, 0, "provider contract epochs must remain group-session isolated");
  const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId);
  ok(deletion.continuationSoakArtifacts.deleted >= 1, "group-session deletion must remove version-contract soak evidence");
  equal(soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId }).overall.chainCount, 0, "deleted group session must leave no contract chain");

  console.log(JSON.stringify({
    pass: true,
    checks,
    realVersions: realVersions.map(item => ({ provider: item.provider, version: item.versionText, contractIdentity: item.executableIdentityChecksum.slice(0, 12) })),
    report: report.overall,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
