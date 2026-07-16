import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "worker-context-compact-exact-session-distillation-selftest");
const home = path.join(scratch, "home");
const dist = path.join(root, "ccm-package", "dist");
const orchestratorFile = path.join(dist, "modules", "collaboration", "group-orchestrator.js");
const memoryCenterFile = path.join(dist, "modules", "knowledge", "memory-control-center.js");
const memoryIndexFile = path.join(dist, "modules", "collaboration", "group-memory-index.js");
const memoryFile = path.join(dist, "modules", "collaboration", "memory.js");
const groupId = "phase305-exact-session-distillation";
const sessionA = "gcs_phase305_a";
const sessionB = "gcs_phase305_b";
const sentinel = "PHASE305_PRIVATE_TASK_BODY_MUST_NOT_REACH_TYPED_MEMORY";
const require = createRequire(import.meta.url);

function childEnv() {
  return { ...process.env, HOME: home, USERPROFILE: home, CCM_SELFTEST_HOME: home };
}

function parseResult(stdout) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines.at(-1) || "{}");
}

function runChild(action, payload = {}) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child", action, JSON.stringify(payload)], {
    cwd: root,
    env: childEnv(),
    encoding: "utf8",
    timeout: 120_000,
  });
  if (result.status !== 0) throw new Error(`${action} failed (${result.status}): ${result.stderr || result.stdout}`);
  return parseResult(result.stdout);
}

if (process.argv[2] === "--child") {
  const action = process.argv[3];
  const payload = JSON.parse(process.argv[4] || "{}");
  if (action === "worker") {
    const orchestrator = require(orchestratorFile);
    const result = orchestrator.runCodedGroupOrchestrator({
      group: {
        id: payload.groupId,
        members: [
          { project: "coordinator", role: "coordinator" },
          { project: "api", agent: "codex" },
        ],
      },
      groupSessionId: payload.groupSessionId,
      message: `请在 api 项目实现 ${payload.label}，${sentinel}，并运行验证。${" context pressure".repeat(3400)}`,
      workerContextUsageOptions: { maxTokens: 1800, autoCompactBufferTokens: 120 },
      workerContextRetryOptions: { maxTaskChars: 1800 },
    });
    const assignment = (result.assignments || []).find(row => row.project === "api") || {};
    process.stdout.write(`${JSON.stringify({
      groupSessionId: assignment.group_session_id || "",
      retryStatus: assignment.context_compaction_retry?.status || "",
    })}\n`);
  } else if (action === "quality") {
    const center = require(memoryCenterFile);
    const report = center.buildMemoryQualityReport({
      groupIds: [payload.groupId],
      groupSessionIds: payload.groupSessionIds,
      checkIds: [
        "worker_context_packet_compact_outcome_retention_safety",
        "worker_context_packet_compact_strategy_memory",
        "worker_context_packet_compact_strategy_typed_memory",
        "worker_context_packet_ptl_emergency_downgrade",
        "worker_context_packet_ptl_emergency_typed_memory",
      ],
      refresh: true,
      generatedAt: payload.generatedAt,
    });
    const selected = Object.fromEntries((report.checks || []).map(check => [check.id, {
      status: check.status,
      report: check.report,
    }]));
    process.stdout.write(`${JSON.stringify({ status: report.status, checks: selected })}\n`);
  } else if (action === "inspect") {
    const memoryIndex = require(memoryIndexFile);
    const orchestrator = require(orchestratorFile);
    const typedScopeId = `${payload.groupId}--${payload.groupSessionId}`;
    const ledger = memoryIndex.readGroupTypedMemoryDistillationLedger(typedScopeId);
    const docs = memoryIndex.scanGroupTypedMemoryDocuments(typedScopeId);
    const outcome = orchestrator.readWorkerContextCompactOutcomeLedgerForCoordinator(payload.groupId, payload.groupSessionId);
    const strategy = orchestrator.readWorkerContextCompactStrategyMemoryForCoordinator(payload.groupId, payload.groupSessionId);
    const ptl = orchestrator.readWorkerContextPtlEmergencyHintForCoordinator(payload.groupId, payload.groupSessionId);
    process.stdout.write(`${JSON.stringify({
      typedScopeId,
      ledger,
      docs: docs.map(doc => ({ relPath: doc.relPath, source: doc.source, body: doc.body })),
      outcome: { file: outcome.file, entries: outcome.entries },
      strategy,
      ptl,
    })}\n`);
  } else if (action === "inspect-group") {
    const memoryIndex = require(memoryIndexFile);
    process.stdout.write(`${JSON.stringify({
      ledger: memoryIndex.readGroupTypedMemoryDistillationLedger(payload.groupId),
      docs: memoryIndex.scanGroupTypedMemoryDocuments(payload.groupId),
    })}\n`);
  } else if (action === "delete") {
    const memory = require(memoryFile);
    process.stdout.write(`${JSON.stringify(memory.deleteGroupSessionMemoryArtifacts(payload.groupId, payload.groupSessionId))}\n`);
  } else {
    throw new Error(`unknown child action: ${action}`);
  }
  process.exit(0);
}

fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });

const workersA = [1, 2, 3].map(index => runChild("worker", {
  groupId,
  groupSessionId: sessionA,
  label: `phase305-session-a-${index}`,
}));
const workerB = runChild("worker", {
  groupId,
  groupSessionId: sessionB,
  label: "phase305-session-b-1",
});

const qualityFirst = runChild("quality", {
  groupId,
  groupSessionIds: [sessionA, sessionB],
  generatedAt: "2026-07-15T06:00:00.000Z",
});
const inspectA = runChild("inspect", { groupId, groupSessionId: sessionA });
const inspectB = runChild("inspect", { groupId, groupSessionId: sessionB });
const inspectGroup = runChild("inspect-group", { groupId });
const qualityRestart = runChild("quality", {
  groupId,
  groupSessionIds: [sessionA, sessionB],
  generatedAt: "2026-07-15T06:01:00.000Z",
});
const inspectARestart = runChild("inspect", { groupId, groupSessionId: sessionA });

const strategyCheck = qualityFirst.checks?.worker_context_packet_compact_strategy_memory || {};
const retentionCheck = qualityFirst.checks?.worker_context_packet_compact_outcome_retention_safety || {};
const typedStrategyCheck = qualityFirst.checks?.worker_context_packet_compact_strategy_typed_memory || {};
const ptlCheck = qualityFirst.checks?.worker_context_packet_ptl_emergency_downgrade || {};
const typedPtlCheck = qualityFirst.checks?.worker_context_packet_ptl_emergency_typed_memory || {};
const strategyRows = strategyCheck.report?.groups || [];
const typedStrategyRows = typedStrategyCheck.report?.groups || [];
const ptlRows = ptlCheck.report?.groups || [];
const typedPtlRows = typedPtlCheck.report?.groups || [];
const archiveA = inspectA.ledger?.compactStrategyArchive || {};
const archiveB = inspectB.ledger?.compactStrategyArchive || {};
const ptlArchiveA = inspectA.ledger?.ptlEmergencyArchive || {};
const ptlArchiveB = inspectB.ledger?.ptlEmergencyArchive || {};
const rowsA = archiveA.outcome_rows || [];
const rowsB = archiveB.outcome_rows || [];
const ptlRowsA = ptlArchiveA.rows || [];
const ptlRowsB = ptlArchiveB.rows || [];
const docsTextA = JSON.stringify(inspectA.docs || []);
const docsTextB = JSON.stringify(inspectB.docs || []);
const rootDocsText = JSON.stringify(inspectGroup.docs || []);

const deletionA = runChild("delete", { groupId, groupSessionId: sessionA });
const afterDeleteA = runChild("inspect", { groupId, groupSessionId: sessionA });
const afterDeleteB = runChild("inspect", { groupId, groupSessionId: sessionB });

const checks = {
  workersBindExpectedSessions: workersA.every(row => row.groupSessionId === sessionA && row.retryStatus === "blocked")
    && workerB.groupSessionId === sessionB && workerB.retryStatus === "blocked",
  qualityDiscoversBothNestedScopes: Number(strategyCheck.report?.overall?.exactSessionCount || 0) === 2
    && strategyRows.some(row => row.groupSessionId === sessionA)
    && strategyRows.some(row => row.groupSessionId === sessionB),
  qualityDoesNotUseLegacyAggregate: Number(strategyCheck.report?.overall?.legacyScopeCount || 0) === 0
    && strategyRows.every(row => row.legacy === false),
  retentionSafetyCoversExactSessions: retentionCheck.status === "ok"
    && Number(retentionCheck.report?.overall?.exactSessionCount || 0) === 2
    && Number(retentionCheck.report?.overall?.crossSessionRejectedCount || 0) === 0,
  exactStrategyQualityPasses: strategyCheck.status === "ok"
    && typedStrategyCheck.status === "ok"
    && typedStrategyRows.filter(row => Number(row.outcomeCount || row.strategySampleCount || 0) > 0).every(row => row.status === "ok"),
  exactPtlQualityPasses: ptlCheck.status === "ok"
    && typedPtlCheck.status === "ok"
    && ptlRows.some(row => row.groupSessionId === sessionA && row.engaged === true && row.emergencyLevel === "critical")
    && ptlRows.some(row => row.groupSessionId === sessionB && row.engaged === true && row.emergencyLevel === "critical" && row.taskCompactedBlockedCount === 1),
  typedMemoryUsesExactScopeDirectories: inspectA.typedScopeId === `${groupId}--${sessionA}`
    && inspectB.typedScopeId === `${groupId}--${sessionB}`
    && inspectA.ledger?.groupId === inspectA.typedScopeId
    && inspectB.ledger?.groupId === inspectB.typedScopeId,
  groupLevelTypedMemoryRemainsUntouched: (inspectGroup.docs || []).length === 0
    && !inspectGroup.ledger?.compactStrategyArchive
    && !inspectGroup.ledger?.ptlEmergencyArchive,
  compactArchivesAreSessionBound: archiveA.groupSessionId === sessionA
    && rowsA.length >= 1
    && rowsB.length === 0
    && rowsA.every(row => row.groupSessionId === sessionA)
    && (!archiveB.schema || archiveB.groupSessionId === sessionB),
  ptlArchivesAreSessionBound: ptlArchiveA.groupSessionId === sessionA
    && ptlArchiveB.groupSessionId === sessionB
    && ptlRowsA.every(row => row.groupSessionId === sessionA)
    && ptlRowsB.every(row => row.groupSessionId === sessionB),
  siblingOutcomeIdentitiesDoNotOverlap: rowsA.every(row => !rowsB.some(other => other.row_id === row.row_id || other.outcome_id === row.outcome_id)),
  typedDocsCarryExactSessionProvenance: docsTextA.includes(sessionA)
    && !docsTextA.includes(sessionB)
    && docsTextB.includes(sessionB)
    && !docsTextB.includes(sessionA),
  noPrivateTaskBodyInTypedMemory: !docsTextA.includes(sentinel)
    && !docsTextB.includes(sentinel)
    && !rootDocsText.includes(sentinel),
  restartDistillationIsIdempotent: qualityRestart.checks?.worker_context_packet_compact_strategy_typed_memory?.status === "ok"
    && Number(inspectARestart.ledger?.compactStrategyArchive?.outcome_count || 0) === Number(archiveA.outcome_count || 0)
    && (inspectARestart.docs || []).length === (inspectA.docs || []).length,
  sessionDeletionRemovesExactTypedMemory: Number(deletionA.deletedFiles || 0) > 0
    && (afterDeleteA.docs || []).length === 0
    && !afterDeleteA.ledger?.compactStrategyArchive,
  sessionDeletionPreservesSiblingTypedMemory: (afterDeleteB.docs || []).length === (inspectB.docs || []).length
    && afterDeleteB.ledger?.ptlEmergencyArchive?.groupSessionId === sessionB,
};

const pass = Object.values(checks).every(Boolean);
const output = {
  pass,
  checks,
  evidence: {
    strategyOverall: strategyCheck.report?.overall,
    retentionOverall: retentionCheck.report?.overall,
    typedStrategyOverall: typedStrategyCheck.report?.overall,
    ptlOverall: ptlCheck.report?.overall,
    typedPtlOverall: typedPtlCheck.report?.overall,
    sessionA: { outcomes: rowsA.length, ptlRows: ptlRowsA.length, docs: inspectA.docs?.length || 0 },
    sessionB: { outcomes: rowsB.length, ptlRows: ptlRowsB.length, docs: inspectB.docs?.length || 0 },
    deletedFiles: deletionA.deletedFiles || 0,
  },
};

fs.rmSync(scratch, { recursive: true, force: true });
console.log(JSON.stringify(output, null, 2));
if (!pass) process.exit(1);
