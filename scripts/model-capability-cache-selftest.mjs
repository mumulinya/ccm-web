import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capability = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "model-capability-cache.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const handoff = require(path.join(root, "ccm-package", "dist", "agents", "worker-handoff.js"));
const taskSessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));

const unit = capability.runModelCapabilityCacheSelfTest();
assert.equal(unit.pass, true, JSON.stringify(unit, null, 2));
const nativeReceiptUnit = runtime.runNativeModelCapabilityReceiptSelfTest();
assert.equal(nativeReceiptUnit.pass, true, JSON.stringify(nativeReceiptUnit, null, 2));
const sessionIdentityUnit = taskSessions.runTaskAgentSessionModelIdentitySelfTest();
assert.equal(sessionIdentityUnit.pass, true, JSON.stringify(sessionIdentityUnit, null, 2));
const nativeCapacity = capability.resolveTrustedModelContextCapacity({
  provider: "codex",
  model: "gpt-phase217",
  now: new Date("2026-07-12T12:01:00.000Z"),
  nativeExecutorReceipt: nativeReceiptUnit.receipt,
});
const lifecycleProvider = `phase217-selftest-${process.pid}`;
const staleProvider = `phase218-stale-${process.pid}`;
const refreshProvider = `phase218-refresh-${process.pid}`;
const identityProvider = `phase219-identity-${process.pid}`;
const unsupportedProvider = `phase220-unsupported-${process.pid}`;
const refreshedProvider = `phase220-refreshed-${process.pid}`;
const pendingProvider = `phase221-pending-${process.pid}`;
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `ccm-capability-phase221-${process.pid}-`));
const outcomeJournal = path.join(tempRoot, 'outcomes.jsonl');
let lifecycleChecks = {};
try {
  const recorded = capability.recordModelCapabilityEvidence({
    provider: lifecycleProvider,
    source: "user_setting",
    contextWindow: 320_000,
    maxOutputTokens: 20_000,
    evidenceId: `phase217-lifecycle-${process.pid}`,
  });
  const originalHandoff = handoff.buildSelfContainedWorkerHandoff({
    project: "phase218-project",
    task: "capacity downgrade handoff",
    agentType: lifecycleProvider,
    memory: { schema: "phase218-memory", rendered_text: "capacity-memory-".repeat(800) },
  });
  const downgraded = capability.recordModelCapabilityEvidence({
    provider: lifecycleProvider,
    source: "user_setting",
    contextWindow: 64_000,
    maxOutputTokens: 8_000,
    evidenceId: `phase218-downgrade-${process.pid}`,
  });
  const downgradedHandoff = handoff.buildSelfContainedWorkerHandoff({
    project: "phase218-project",
    task: "capacity downgrade handoff",
    agentType: lifecycleProvider,
    workerContextPacket: originalHandoff.worker_context_packet,
    memory: { schema: "phase218-memory", rendered_text: "capacity-memory-".repeat(800) },
  });
  const revoked = capability.revokeModelCapabilityEvidence({
    provider: lifecycleProvider,
    evidenceId: downgraded.entry.evidenceId,
    reason: "phase217_selftest",
    actor: "selftest",
  });
  const fallbackAfterRevoke = capability.resolveTrustedModelContextCapacity({ provider: lifecycleProvider });
  const preview = capability.runModelCapabilityCacheMaintenance({ provider: lifecycleProvider, now: new Date("2027-12-31T00:00:00.000Z"), retentionDays: 1, dryRun: true });
  const executed = capability.runModelCapabilityCacheMaintenance({ provider: lifecycleProvider, now: new Date("2027-12-31T00:00:00.000Z"), retentionDays: 1, dryRun: false });
  const remaining = capability.readModelCapabilityCache().entries.filter(entry => entry.provider === lifecycleProvider);
  capability.recordModelCapabilityEvidence({
    provider: staleProvider,
    source: "user_setting",
    contextWindow: 64_000,
    maxOutputTokens: 8_000,
    checkedAt: "2025-01-01T00:00:00.000Z",
    expiresAt: "2025-02-01T00:00:00.000Z",
    evidenceId: `phase218-stale-${process.pid}`,
  });
  const staleSafe = capability.resolveTrustedModelContextCapacity({ provider: staleProvider });
  const refreshCheckedAt = new Date(Date.now() - Math.floor(89.5 * 24 * 60 * 60 * 1000)).toISOString();
  capability.recordModelCapabilityEvidence({
    provider: refreshProvider,
    source: "user_setting",
    contextWindow: 200_000,
    maxOutputTokens: 20_000,
    checkedAt: refreshCheckedAt,
    evidenceId: `phase218-refresh-${process.pid}`,
  });
  const refreshPlan = capability.buildModelCapabilityRefreshPlan();
  const metadataAbsentOutcome = capability.recordModelCapabilityRefreshOutcome({ provider: refreshProvider, outcome: "metadata_absent", journalFile: outcomeJournal, reason: "phase220 selftest" });
  const backoffPlan = capability.buildModelCapabilityRefreshPlan({ journalFile: outcomeJournal });
  const repeatedMetadataAbsent = capability.recordModelCapabilityRefreshOutcome({ provider: refreshProvider, outcome: "metadata_absent", journalFile: outcomeJournal, reason: "phase220 repeated selftest" });
  capability.recordModelCapabilityEvidence({
    provider: unsupportedProvider,
    source: "user_setting",
    contextWindow: 200_000,
    maxOutputTokens: 20_000,
    checkedAt: refreshCheckedAt,
    evidenceId: `phase220-unsupported-${process.pid}`,
  });
  const unsupportedOutcome = capability.recordModelCapabilityRefreshOutcome({ provider: unsupportedProvider, outcome: "unsupported", journalFile: outcomeJournal, reason: "phase220 selftest" });
  const unsupportedPlan = capability.buildModelCapabilityRefreshPlan({ journalFile: outcomeJournal });
  capability.recordModelCapabilityEvidence({
    provider: refreshedProvider,
    source: "user_setting",
    contextWindow: 200_000,
    maxOutputTokens: 20_000,
    checkedAt: refreshCheckedAt,
    evidenceId: `phase220-refreshed-old-${process.pid}`,
  });
  const refreshedWrite = capability.recordModelCapabilityEvidence({
    provider: refreshedProvider,
    source: "user_setting",
    contextWindow: 200_000,
    maxOutputTokens: 20_000,
    checkedAt: new Date().toISOString(),
    evidenceId: `phase220-refreshed-new-${process.pid}`,
  });
  const refreshedOutcome = capability.recordModelCapabilityRefreshOutcome({ provider: refreshedProvider, outcome: "refreshed", refreshRequest: refreshedWrite.refreshRequest, journalFile: outcomeJournal, receiptEvidenceChecksum: refreshedWrite.entry.checksum });
  const outcomeLedger = capability.buildModelCapabilityRefreshOutcomeLedger({ journalFile: outcomeJournal });
  const pendingCheckedAt = new Date(Date.now() - Math.floor(89.5 * 24 * 60 * 60 * 1000)).toISOString();
  capability.recordModelCapabilityEvidence({ provider: pendingProvider, source: "user_setting", contextWindow: 200_000, maxOutputTokens: 20_000, checkedAt: pendingCheckedAt, evidenceId: `phase221-pending-${process.pid}` });
  const pendingJournal = path.join(tempRoot, 'pending.jsonl');
  const pendingLease = `${pendingJournal}.lease.json`;
  const heldLease = capability.acquireModelCapabilityRefreshLease({ file: pendingLease, journalFile: pendingJournal, ttlMs: 10_000 });
  const queuedOutcome = capability.recordModelCapabilityRefreshOutcome({ provider: pendingProvider, outcome: "metadata_absent", journalFile: pendingJournal, leaseFile: pendingLease, pendingDir: `${pendingJournal}.pending` });
  if (heldLease.handle) capability.releaseModelCapabilityRefreshLease(heldLease.handle, 'phase221-selftest-release');
  const drainedStatus = capability.runModelCapabilityRefreshMaintenance({ leaseFile: pendingLease, journalFile: pendingJournal, pendingDir: `${pendingJournal}.pending`, queueFile: path.join(tempRoot, 'pending-queue.json'), statusFile: path.join(tempRoot, 'pending-status.json'), outcomeLedgerFile: path.join(tempRoot, 'pending-ledger.json'), archiveDir: path.join(tempRoot, 'pending-archive'), trigger: 'phase221-selftest' });
  const retentionJournal = path.join(tempRoot, 'retention.jsonl');
  fs.writeFileSync(retentionJournal, `${Array.from({ length: 45 }, (_, index) => JSON.stringify({ type: 'completed', at: new Date(Date.now() - (45 - index) * 1000).toISOString(), fencingToken: index + 1 })).join('\n')}\n`, 'utf-8');
  const retentionStatus = capability.runModelCapabilityRefreshMaintenance({ leaseFile: `${retentionJournal}.lease.json`, journalFile: retentionJournal, queueFile: path.join(tempRoot, 'retention-queue.json'), statusFile: path.join(tempRoot, 'retention-status.json'), outcomeLedgerFile: path.join(tempRoot, 'retention-ledger.json'), archiveDir: path.join(tempRoot, 'retention-archive'), maxJournalRows: 20, trigger: 'phase221-retention-selftest' });
  const retainedLineCount = fs.readFileSync(retentionJournal, 'utf-8').split(/\r?\n/).filter(Boolean).length;
  capability.recordModelCapabilityEvidence({
    provider: identityProvider,
    model: "model-phase219",
    source: "user_setting",
    contextWindow: 516_000,
    maxOutputTokens: 64_000,
    evidenceId: `phase219-identity-${process.pid}`,
  });
  const exactModelHandoff = handoff.buildSelfContainedWorkerHandoff({ project: "phase219-project", task: "exact model capacity", agentType: identityProvider, model: "model-phase219" });
  const unknownModelHandoff = handoff.buildSelfContainedWorkerHandoff({ project: "phase219-project", task: "unknown model safety", agentType: identityProvider });
  lifecycleChecks = {
    userEvidenceRecorded: recorded.entry.contextWindow === 320_000,
    evidenceRevoked: revoked.revoked === 1,
    revokedEvidenceFallsBack: fallbackAfterRevoke.conservativeFallback === true && fallbackAfterRevoke.fallbackReason === "trusted_capability_revoked",
    maintenancePreviewFindsCandidate: preview.candidateCount === 1 && preview.deletedCount === 0,
    maintenanceDeletesOnlyFilteredEvidence: executed.deletedCount === 1 && remaining.length === 0,
    workerHandoffBypassUsesProviderCapacity: originalHandoff.worker_context_packet.context_usage.max_tokens === 300_000,
    capacityDowngradeCreatesAlert: downgraded.downgrade?.previousContextWindow === 320_000 && downgraded.downgrade?.currentContextWindow === 64_000,
    reusedPacketRecompactsAfterDowngrade: downgradedHandoff.worker_context_packet.capacity_downgrade_gate?.action === "recompact_before_dispatch"
      && downgradedHandoff.worker_context_packet.context_compaction_retry?.schema === "ccm-worker-context-capacity-downgrade-recompact-v1"
      && downgradedHandoff.worker_context_packet.context_usage.max_tokens === 56_000,
    expiredSmallWindowRemainsSafeBound: staleSafe.source === "stale_safe_bound" && staleSafe.contextWindow === 64_000,
    refreshDueEntryIsQueued: refreshPlan.requests.some(entry => entry.provider === refreshProvider && entry.status === "pending_native_telemetry"),
    resumedModelUsesExactCapacity: exactModelHandoff.worker_context_packet.context_usage.max_tokens === 496_000,
    unknownModelDoesNotBorrowSpecificCapacity: unknownModelHandoff.worker_context_packet.context_usage.max_tokens === 180_000,
    taskSessionPersistsNativeModelIdentity: sessionIdentityUnit.pass === true,
    metadataAbsentEntersBackoff: metadataAbsentOutcome.recorded === true && backoffPlan.requests.some(entry => entry.provider === refreshProvider && entry.status === "backoff_metadata_absent"),
    backoffSuppressesRepeatedOutcome: repeatedMetadataAbsent.recorded === false && repeatedMetadataAbsent.reason === "no_refresh_due",
    unsupportedRefreshIsExplicit: unsupportedOutcome.recorded === true && unsupportedPlan.requests.some(entry => entry.provider === unsupportedProvider && entry.status === "unsupported"),
    refreshedOutcomeUsesReplacedDueRequest: refreshedWrite.refreshRequest?.provider === refreshedProvider && refreshedOutcome.recorded === true && refreshedOutcome.outcome === "refreshed",
    compactLedgerAggregatesProviderHealth: outcomeLedger.totals.refreshed === 1 && outcomeLedger.totals.unsupported === 1 && outcomeLedger.providers.some(row => row.provider === unsupportedProvider && row.health === "unsupported"),
    busyLeaseQueuesOutcome: queuedOutcome.recorded === true && queuedOutcome.queued === true,
    leaseHolderDrainsPendingOutcome: drainedStatus.pendingOutcomeDrained === 1 && (!fs.existsSync(`${pendingJournal}.pending`) || fs.readdirSync(`${pendingJournal}.pending`).length === 0),
    journalRetentionIsBoundedAndArchived: retainedLineCount <= 20 && retentionStatus.journalRetention.archived > 0 && fs.existsSync(retentionStatus.journalRetention.archiveFile),
  };
} finally {
  for (const provider of [lifecycleProvider, staleProvider, refreshProvider, identityProvider, unsupportedProvider, refreshedProvider, pendingProvider]) {
    capability.revokeModelCapabilityEvidence({ provider, reason: "phase218_selftest_cleanup", actor: "selftest" });
    capability.runModelCapabilityCacheMaintenance({ provider, now: new Date("2100-01-01T00:00:00.000Z"), retentionDays: 1, dryRun: false });
    capability.pruneModelCapabilityDowngradeAlerts({ provider });
  }
  capability.pruneModelCapabilityDowngradeAlerts({ providerPrefix: "phase21" });
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const trustedPacket = orchestrator.buildWorkerContextPacketForAssignment({
  project: "phase216-project",
  task: "verify per-provider context capacity",
  agentType: "codex",
}, "", [], {
  providerCapability: {
    source: "explicit_provider_capability",
    contextWindow: 516_000,
    maxOutputTokens: 64_000,
    checkedAt: "2026-07-12T00:00:00.000Z",
  },
});

const fallbackPacket = orchestrator.buildWorkerContextPacketForAssignment({
  project: "phase216-project",
  task: "verify conservative fallback",
  agentType: "unknown-openai-compatible",
}, "", [], {});

const checks = {
  trustedProviderUsesOwnEffectiveWindow: trustedPacket.context_usage.max_tokens === 496_000,
  trustedProviderCarriesProvenance: trustedPacket.model_context_capacity?.source === "explicit_provider_capability"
    && Boolean(trustedPacket.context_usage.capacity_provenance?.evidenceChecksum),
  unknownProviderDoesNotGuessLargeWindow: fallbackPacket.model_context_capacity?.contextWindow === 200_000
    && fallbackPacket.model_context_capacity?.conservativeFallback === true,
  fallbackWorkerBudgetUsesCcEffectiveWindow: fallbackPacket.context_usage.max_tokens === 180_000,
  workerPacketIdBindsCapacity: trustedPacket.packet_id !== fallbackPacket.packet_id,
  verifiedNativeReceiptCanSetCapacity: nativeCapacity.source === "native_executor_receipt"
    && nativeCapacity.contextWindow === 516_000,
  ...lifecycleChecks,
};

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
process.stdout.write(`${JSON.stringify({ pass: true, checks, unit: unit.checks, nativeReceipt: nativeReceiptUnit.checks }, null, 2)}\n`);
