import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const phase = process.argv.find(arg => arg.startsWith("--phase="))?.slice(8) || "parent";
const stateFile = process.env.CCM_PHASE300_STATE_FILE || "";
const scenarioJson = process.env.CCM_PHASE300_SCENARIOS || "[]";
const scenarios = JSON.parse(scenarioJson);

function rowsFor(scenario) {
  return Array.from({ length: 30 }, (_, index) => ({
    id: `${scenario.key}-message-${index + 1}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "group-main" : undefined,
    content: `${index === 0 ? `PHASE300_${scenario.key.toUpperCase()}_RAW_SENTINEL ` : ""}${`restart generation context ${index + 1} `.repeat(360)}`,
    group_session_id: scenario.sessionId,
    timestamp: new Date(Date.UTC(2026, 6, 15, 3, index)).toISOString(),
  }));
}

function providerOutcome(scenario, generation, suffix) {
  return {
    version: 2,
    group_id: scenario.groupId,
    group_session_id: scenario.sessionId,
    task_agent_session_id: `tas_${scenario.key}`,
    native_session_id: `native_${scenario.key}`,
    receipt_id: `pncer_${scenario.key}_${suffix}`,
    receipt_checksum: `checksum_${scenario.key}_${suffix}`,
    capacity_generation: generation,
    status: "native_applied",
    strong_proof: true,
    provider_outcome_verified: true,
    provider_response_input_tokens: 218000,
    provider_response_output_tokens: 800,
    cleared_input_tokens: 42000,
    cleared_tool_uses: 6,
    beta_headers: ["context-management-2025-06-27"],
    sent_at: new Date().toISOString(),
  };
}

if (phase === "crash") {
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
  const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
  const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
  const compactHead = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));
  const capacity = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "provider-native-compact-session-capacity.js"));
  const results = [];

  for (const scenario of scenarios) {
    const rows = rowsFor(scenario);
    storage.saveGroupMessages(scenario.groupId, rows, scenario.sessionId);
    capacity.recordProviderNativeCompactSessionOutcome(providerOutcome(scenario, 1, "g1"));
    capacity.consumeProviderNativeCompactSessionCapacity({
      groupId: scenario.groupId,
      groupSessionId: scenario.sessionId,
      taskAgentSessionId: `tas_${scenario.key}`,
      nativeSessionId: `native_${scenario.key}`,
      rawActiveTokens: 260000,
    });
    const transcriptPath = storage.getGroupChatSessionMessagesFile(scenario.groupId, scenario.sessionId);
    const compacted = await compaction.compactGroupConversationMemory({
      groupId: scenario.groupId,
      groupSessionId: scenario.sessionId,
      messages: rows,
      memory: memory.createEmptyGroupMemory(scenario.groupId, scenario.sessionId),
      transcriptPath,
      force: true,
      config: { minKeepMessages: 6, minKeepTokens: 3000, maxKeepTokens: 7000 },
    });
    assert.equal(compacted.compacted, true);
    const saved = memory.saveGroupMemory(scenario.groupId, compacted.memory, scenario.sessionId);
    const committedHead = scenario.commitHead
      ? compactHead.commitGroupCompactHead({
        groupId: scenario.groupId,
        groupSessionId: scenario.sessionId,
        compactTransactionReceipt: compacted.compactTransactionReceipt,
      }).head
      : null;
    const journal = boundary.readGroupMemoryBoundaryJournal(scenario.groupId, scenario.sessionId);
    results.push({
      key: scenario.key,
      commitHead: scenario.commitHead,
      transcriptPath,
      rawMessageCount: rows.length,
      boundaryId: saved.compactBoundary?.id || "",
      receiptChecksum: saved.compaction?.compactTransactionReceipt?.receipt_checksum || "",
      journalCommitCount: journal.commitCount,
      journalBoundaryId: journal.latestCommit?.boundaryId || "",
      compactHead: committedHead,
      capacity: capacity.buildProviderNativeCompactSessionCapacitySummary(scenario.groupId, scenario.sessionId),
    });
  }

  const untouched = scenarios[0].untouched;
  capacity.recordProviderNativeCompactSessionOutcome(providerOutcome(untouched, 1, "g1"));
  fs.writeFileSync(stateFile, JSON.stringify({
    schema: "ccm-phase300-generation-crash-window-v1",
    ccmDir: path.dirname(path.dirname(results[0].transcriptPath)),
    scenarios: results,
    untouched: capacity.buildProviderNativeCompactSessionCapacitySummary(untouched.groupId, untouched.sessionId),
  }, null, 2), "utf-8");
  process.exit(73);
}

if (phase === "restart") {
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
  const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
  const compactHead = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));
  const capacity = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "provider-native-compact-session-capacity.js"));
  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const results = [];

  for (const scenario of scenarios) {
    const rows = storage.getGroupMessages(scenario.groupId, scenario.sessionId);
    const stored = memory.loadGroupMemory(scenario.groupId, scenario.sessionId);
    const before = {
      head: compactHead.readGroupCompactHead(scenario.groupId, scenario.sessionId),
      capacity: capacity.buildProviderNativeCompactSessionCapacitySummary(scenario.groupId, scenario.sessionId),
    };
    const first = memory.prepareGroupMemoryResumeProjection(scenario.groupId, scenario.sessionId, rows, stored, {
      recentLimit: 6,
      olderLimit: 10,
      minKeepMessages: 6,
      minKeepTokens: 3000,
      maxKeepTokens: 7000,
    });
    const afterFirst = {
      head: compactHead.readGroupCompactHead(scenario.groupId, scenario.sessionId),
      capacity: capacity.buildProviderNativeCompactSessionCapacitySummary(scenario.groupId, scenario.sessionId),
    };
    const second = memory.prepareGroupMemoryResumeProjection(
      scenario.groupId,
      scenario.sessionId,
      rows,
      memory.loadGroupMemory(scenario.groupId, scenario.sessionId),
      { recentLimit: 6, olderLimit: 10, minKeepMessages: 6, minKeepTokens: 3000, maxKeepTokens: 7000 },
    );
    const afterSecond = capacity.buildProviderNativeCompactSessionCapacitySummary(scenario.groupId, scenario.sessionId);
    const tamperedReconciliation = capacity.reconcileProviderNativeCompactSessionCapacityReset({
      groupId: scenario.groupId,
      groupSessionId: scenario.sessionId,
      compactHead: { ...afterFirst.head, head_checksum: "tampered-phase300-head" },
    });
    const afterTamper = capacity.buildProviderNativeCompactSessionCapacitySummary(scenario.groupId, scenario.sessionId);
    const delayed = capacity.recordProviderNativeCompactSessionOutcome(providerOutcome(scenario, 1, "delayed_g1"));
    const afterDelayed = capacity.buildProviderNativeCompactSessionCapacitySummary(scenario.groupId, scenario.sessionId);
    const bundle = memory.buildAgentMemoryContextBundle(scenario.groupId, "phase300-worker", "verify restart generation reconciliation", {
      groupSessionId: scenario.sessionId,
      taskAgentSessionId: `tas_${scenario.key}`,
      nativeSessionId: `native_${scenario.key}`,
      agentType: "anthropic-api",
      transport: "anthropic_api",
      provider: "anthropic",
      supportsApiContextManagement: true,
      nativeApiRequestLayer: true,
      betaHeaders: ["context-management-2025-06-27"],
    });
    const detail = center.getMemoryCenterScope("group", `${scenario.groupId}::${scenario.sessionId}`);
    const proofs = boundary.readGroupMemoryResumeProjectionProofs(scenario.groupId, scenario.sessionId);
    const ledgerText = fs.readFileSync(capacity.getProviderNativeCompactSessionCapacityLedgerFile(scenario.groupId, scenario.sessionId), "utf-8");
    results.push({
      key: scenario.key,
      commitHead: scenario.commitHead,
      rawMessageCount: rows.length,
      before,
      first: {
        headRecovery: first.compactHeadRecovery,
        reconciliation: first.providerNativeCompactSessionCapacityReconciliation,
      },
      afterFirst,
      second: {
        headRecovery: second.compactHeadRecovery,
        reconciliation: second.providerNativeCompactSessionCapacityReconciliation,
      },
      afterSecond,
      tamperedReconciliation,
      afterTamper,
      delayed,
      afterDelayed,
      bundle: {
        generation: bundle.compaction?.providerNativeCompactSessionGenerationFence?.generation || 0,
        reconciliation: bundle.compaction?.providerNativeCompactSessionCapacityReconciliation || null,
        nativeApplyGeneration: bundle.compaction?.apiMicrocompactNativeApplyPlan?.providerSessionCapacityGeneration || 0,
        renderedReconciliation: String(bundle.rendered_text || "").includes("Provider compact generation 对账"),
      },
      center: {
        generation: detail.postCompactUsage?.providerNativeCompactSessionCapacity?.generation || 0,
        reconciliation: detail.postCompactUsage?.providerNativeCompactSessionCapacity?.reconciliation || null,
      },
      proofs: {
        valid: proofs.valid,
        rows: proofs.recentProofs.map(row => row.providerNativeCompactSessionCapacityReconciliation).filter(Boolean),
      },
      ledgerBodyFree: !ledgerText.includes(`PHASE300_${scenario.key.toUpperCase()}_RAW_SENTINEL`)
        && !ledgerText.includes("restart generation context"),
    });
  }

  const untouched = scenarios[0].untouched;
  fs.writeFileSync(stateFile, JSON.stringify({
    schema: "ccm-phase300-generation-restart-result-v1",
    ccmDir: path.dirname(path.dirname(storage.getGroupChatSessionMessagesFile(scenarios[0].groupId, scenarios[0].sessionId))),
    scenarios: results,
    untouched: capacity.buildProviderNativeCompactSessionCapacitySummary(untouched.groupId, untouched.sessionId),
  }, null, 2), "utf-8");
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase300-generation-restart-home-"));
const suffix = `${process.pid}-${Date.now().toString(36)}`;
const untouched = {
  key: `untouched-${suffix}`,
  groupId: `phase300-untouched-${suffix}`,
  sessionId: `gcs_phase300_untouched_${suffix}`,
};
const testScenarios = [
  {
    key: `journal-only-${suffix}`,
    groupId: `phase300-journal-only-${suffix}`,
    sessionId: `gcs_phase300_journal_${suffix}`,
    commitHead: false,
    untouched,
  },
  {
    key: `head-committed-${suffix}`,
    groupId: `phase300-head-committed-${suffix}`,
    sessionId: `gcs_phase300_head_${suffix}`,
    commitHead: true,
    untouched,
  },
];
const crashState = path.join(tempHome, "phase300-crash.json");
const restartState = path.join(tempHome, "phase300-restart.json");
const childEnv = {
  ...process.env,
  HOME: tempHome,
  USERPROFILE: tempHome,
  CCM_PHASE300_SCENARIOS: JSON.stringify(testScenarios),
};

try {
  const crash = spawnSync(process.execPath, [scriptFile, "--phase=crash"], {
    cwd: root,
    env: { ...childEnv, CCM_PHASE300_STATE_FILE: crashState },
    encoding: "utf-8",
    timeout: 90_000,
  });
  assert.equal(crash.status, 73, JSON.stringify({ status: crash.status, stdout: crash.stdout, stderr: crash.stderr }, null, 2));
  const before = JSON.parse(fs.readFileSync(crashState, "utf-8"));

  const restart = spawnSync(process.execPath, [scriptFile, "--phase=restart"], {
    cwd: root,
    env: { ...childEnv, CCM_PHASE300_STATE_FILE: restartState },
    encoding: "utf-8",
    timeout: 90_000,
  });
  assert.equal(restart.status, 0, JSON.stringify({ status: restart.status, stdout: restart.stdout, stderr: restart.stderr }, null, 2));
  const after = JSON.parse(fs.readFileSync(restartState, "utf-8"));
  const journalOnly = after.scenarios.find(row => row.commitHead === false);
  const headCommitted = after.scenarios.find(row => row.commitHead === true);
  const beforeRows = new Map(before.scenarios.map(row => [row.key, row]));
  const checks = {
    childProcessesUseIsolatedHome: String(before.ccmDir || "").toLowerCase().startsWith(path.join(tempHome, ".cc-connect").toLowerCase())
      && String(after.ccmDir || "").toLowerCase().startsWith(path.join(tempHome, ".cc-connect").toLowerCase()),
    crashPersistsGenerationOneCredit: before.scenarios.every(row => row.capacity.generation === 1
      && row.capacity.session_count === 1
      && row.capacity.provider_cleared_input_tokens_latest_total === 42000),
    bothDurableCrashWindowsCreated: before.scenarios.every(row => row.journalCommitCount === 1
      && row.boundaryId === row.journalBoundaryId
      && row.receiptChecksum.length === 64)
      && before.scenarios.some(row => !row.compactHead)
      && before.scenarios.some(row => row.compactHead?.generation === 1),
    journalOnlyRestartRecoversHeadThenCapacity: journalOnly.first.headRecovery?.status === "recovered"
      && journalOnly.first.reconciliation?.status === "recovered"
      && journalOnly.afterFirst.head?.generation === 1
      && journalOnly.afterFirst.capacity.generation === 2,
    committedHeadRestartRecoversCapacityDirectly: headCommitted.first.headRecovery?.status === "current"
      && headCommitted.first.reconciliation?.status === "recovered"
      && headCommitted.afterFirst.head?.generation === 1
      && headCommitted.afterFirst.capacity.generation === 2,
    resetClearsPreCrashDerivedState: after.scenarios.every(row => row.afterFirst.capacity.session_count === 0
      && row.afterFirst.capacity.sticky_beta_session_count === 0
      && row.afterFirst.capacity.last_reset?.boundary_id === beforeRows.get(row.key)?.boundaryId
      && row.afterFirst.capacity.last_reset?.compact_head_generation === 1),
    repeatedResumeIsIdempotent: after.scenarios.every(row => row.second.reconciliation?.status === "current"
      && row.second.reconciliation?.idempotent === true
      && row.afterSecond.generation === 2
      && row.afterSecond.reset_count === 1),
    tamperedHeadFailsClosedWithoutAdvancing: after.scenarios.every(row => row.tamperedReconciliation.status === "fail_closed"
      && row.afterTamper.generation === 2
      && row.afterTamper.reset_count === 1),
    delayedGenerationOneOutcomesAreFenced: after.scenarios.every(row => row.delayed.recorded === false
      && row.delayed.stale === true
      && row.delayed.reason === "stale_generation_after_compact_reset"
      && row.afterDelayed.rejected_outcome_count === 1
      && row.afterDelayed.session_count === 0),
    childAgentBundlesUseRecoveredGeneration: after.scenarios.every(row => row.bundle.generation === 2
      && row.bundle.reconciliation?.status === "current"
      && row.bundle.nativeApplyGeneration === 2
      && row.bundle.renderedReconciliation === true),
    memoryCenterShowsCurrentReconciliation: after.scenarios.every(row => row.center.generation === 2
      && row.center.reconciliation?.status === "current"),
    resumeProofsCarryRecoveryAudit: after.scenarios.every(row => row.proofs.valid === true
      && row.proofs.rows.some(proof => proof.status === "recovered")
      && row.proofs.rows.some(proof => proof.status === "current")),
    untouchedSessionRemainsGenerationOne: before.untouched.generation === 1
      && after.untouched.generation === 1
      && after.untouched.session_count === 1,
    rawTranscriptsAndLedgersStayBodySafe: after.scenarios.every(row => row.rawMessageCount === 30 && row.ledgerBodyFree === true),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, before, after }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase300-provider-generation-restart-reconciliation-selftest-v1", checks }, null, 2)}\n`);
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
