import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const collaboration = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "collaboration.js"));

const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase237-source-proof-${suffix}`;
const sessionA = `gcs_${Date.now().toString(36)}_proof_a`;
const sessionB = `gcs_${Date.now().toString(36)}_proof_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const project = "phase237-project";
const relPath = "current-source-verification-rule.md";
const query = "修改配置之前必须读取当前项目文件并核验";
const fixtureDir = path.join(root, "scratch", groupId);
const sourceFile = path.join(fixtureDir, "config", "current-state.json");
const outsideFile = path.join(root, "scratch", `${groupId}-outside.json`);
const taskIds = [];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function cleanupScope(scopeId) {
  const dir = path.resolve(typed.getGroupTypedMemoryDir(scopeId));
  const rootDir = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${rootDir}${path.sep}`) && path.basename(dir).startsWith("phase237-source-proof-")) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function cleanupSession(groupSessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId); } catch {}
  const messageFile = storage.getGroupChatSessionMessagesFile(groupId, groupSessionId);
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { fs.rmSync(file, { force: true }); } catch {}
  }
}

function cleanupRuntimeResidue() {
  for (const target of [
    path.join(runtimeRoot, "group-memory-reload", groupId),
    path.join(runtimeRoot, "group-memory-sessions", groupId),
    path.join(runtimeRoot, "group-messages", "sessions", groupId),
    path.join(runtimeRoot, "group-memory-compact-boundaries", groupId),
    path.join(runtimeRoot, "group-global-memory-arbitration", `${groupId}.json`),
  ]) {
    const resolved = path.resolve(target);
    if (resolved.startsWith(`${runtimeRoot}${path.sep}`)) fs.rmSync(resolved, { recursive: true, force: true });
  }
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.rmSync(outsideFile, { force: true });
}

function bindBundle(taskId, bundle) {
  taskIds.push(taskId);
  const taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "codex" });
  const prompt = `PHASE237_PROMPT\n\n${memory.renderGroupMemoryContextBundle(bundle)}\n\nPHASE237_TASK`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId,
    groupId,
    project,
    groupSessionId: sessionA,
    agentType: "codex",
    executionId: `${taskId}--${project}`,
    workerContextPacket: { packet_id: `packet-${taskId}`, memory: bundle },
    memoryContext: bundle,
    renderedPrompt: prompt,
  });
  sessions.recordTaskAgentMemoryContextDelivery(taskSession.id, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: prompt,
    snapshotRenderedPrompt: prompt,
    executionId: `${taskId}--${project}`,
    runtime: "codex",
    dispatched: true,
    executionSucceeded: true,
    output: "CCM_AGENT_RECEIPT phase237",
  });
  const source = sessions.listTaskAgentMemoryContextSnapshots({ taskId })
    .find(row => row.snapshot_id === bound.snapshot.snapshot_id);
  return { taskId, taskSession, bound, source };
}

function receiptFor(state, typedMemoryUsage) {
  const binding = state.bound.snapshot.context.group_session_memory_binding;
  const sectionEvidence = (binding.sessionMemorySectionEvidence || [])[0];
  return {
    agent: project,
    status: "done",
    task_agent_session_id: state.taskSession.id,
    memory_context_snapshot_id: state.bound.snapshot.snapshot_id,
    memory_context_snapshot_checksum: state.bound.snapshot.checksum,
    execution_id: `${state.taskId}--${project}`,
    memoryUsed: [`${relPath} current source checked`],
    memoryIgnored: [],
    typedMemoryUsage: [typedMemoryUsage],
    memoryContextUsage: {
      bindingId: binding.memoryBindingId,
      groupSessionId: binding.groupSessionId,
      sessionMemoryChecksum: binding.sessionMemoryChecksum,
      modelExtractionExecutionId: binding.modelExtractionExecutionId,
      modelExtractionReplayStatus: binding.modelExtractionReplayStatus,
      factSupersessionGraphChecksum: binding.factSupersessionGraphChecksum,
      usageState: "used",
      reason: "使用当前群聊会话记忆并核验类型化记忆。",
    },
    memoryFactCitations: sectionEvidence ? [{
      evidenceId: sectionEvidence.evidenceId,
      section: sectionEvidence.section,
      sectionChecksum: sectionEvidence.sectionChecksum,
      sourceTranscriptChecksum: sectionEvidence.sourceTranscriptChecksum,
      sourceMessageIds: sectionEvidence.sourceMessageIds || [],
      usage: "本轮使用当前 Session Memory。",
    }] : [],
  };
}

function collect(state, receipts) {
  return collaboration.collectTaskTypedMemoryConsumptionRows({
    id: state.taskId,
    group_id: groupId,
    group_session_id: sessionA,
    target_project: project,
  }, receipts, {
    taskAgentMemoryContextSnapshots: [state.source],
    execution: { id: `${state.taskId}--${project}` },
    projectWorkDir: fixtureDir,
  });
}

try {
  fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
  fs.writeFileSync(sourceFile, `${JSON.stringify({ retry: false, approval: "required" }, null, 2)}\n`);
  fs.writeFileSync(outsideFile, "outside project\n");
  typed.upsertGroupTypedMemoryDocument(scopeA, {
    type: "user",
    slug: "current-source-verification-rule",
    name: "当前源核验规则",
    description: "修改配置前必须读取当前项目文件。",
    source: "selftest:phase237-source-proof",
    body: "# Current source\n修改配置之前必须读取当前项目文件并核验，不得只依赖历史记忆。",
  });
  storage.saveGroupMessages(groupId, [], sessionA);
  storage.saveGroupMessages(groupId, [], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const bundle = memory.buildAgentMemoryContextBundle(groupId, project, query, {
    groupSessionId: sessionA,
    includeGlobalClaudeMemory: false,
    disableLedger: true,
    maxTypedMemory: 8,
  });
  const surfaced = bundle.group_state.typedMemory.recall.recalled.find(row => row.relPath === relPath);
  assert.ok(surfaced?.checksum, "typed memory fixture must be surfaced");

  const validState = bindBundle(`phase237-valid-${suffix}`, bundle);
  const validReceipt = receiptFor(validState, {
    relPath,
    usageState: "verified",
    currentSourceVerified: true,
    currentSourceEvidence: {
      evidenceType: "file_read",
      sourcePath: path.relative(fixtureDir, sourceFile),
      sourceChecksum: sha256(sourceFile),
    },
    reason: "本轮读取并核验当前项目配置。",
  });
  const validRows = collect(validState, [validReceipt]);
  const validTargetRow = validRows.find(row => row.rel_path === relPath);
  assert.equal(validTargetRow?.usage_state, "verified", "matching system file checksum must retain verified");
  assert.equal(validTargetRow?.current_source_proof_valid, true, "matching current source proof must be system validated");
  assert.equal(validTargetRow?.evidence_confidence, 1, "system current source proof must carry full confidence");
  const validLedger = typed.recordGroupTypedMemoryConsumptionLedger(scopeA, { taskId: validState.taskId, targetProject: project, rows: validRows });
  assert.equal(validLedger.recorded_count, validRows.length, "each surfaced doc observation must be recorded once");
  const afterValid = typed.buildGroupTypedMemoryRecall(scopeA, query, { targetProject: project, disableLedger: true, max: 8 });
  const validDoc = afterValid.recalled.find(row => row.relPath === relPath);
  assert.equal(validDoc.typedMemoryConsumption.adjustment, 6, "fresh proof-backed verified evidence must score +6");

  const missingState = bindBundle(`phase237-missing-${suffix}`, bundle);
  const missingReceipt = receiptFor(missingState, {
    relPath,
    usageState: "verified",
    currentSourceVerified: true,
    reason: "声称已核验但没有文件证明。",
  });
  const missingRows = collect(missingState, [missingReceipt]);
  const missingTargetRow = missingRows.find(row => row.rel_path === relPath);
  assert.equal(missingTargetRow?.usage_state, "used", "verified without system proof must downgrade to used");
  assert.ok(missingTargetRow?.anomaly_codes.includes("verified_without_system_current_source_proof"), "missing proof downgrade must remain observable");
  const missingLedger = typed.recordGroupTypedMemoryConsumptionLedger(scopeA, { taskId: missingState.taskId, targetProject: project, rows: missingRows });
  assert.equal(missingLedger.downgraded_verified_count, 1, "ledger write must report downgraded verified evidence");

  const mismatchState = bindBundle(`phase237-mismatch-${suffix}`, bundle);
  const mismatchRows = collect(mismatchState, [receiptFor(mismatchState, {
    relPath,
    usageState: "verified",
    currentSourceVerified: true,
    currentSourceEvidence: { evidenceType: "file_read", sourcePath: path.relative(fixtureDir, sourceFile), sourceChecksum: "0".repeat(64) },
    reason: "错误 checksum 不得通过。",
  })]);
  const mismatchTargetRow = mismatchRows.find(row => row.rel_path === relPath);
  assert.equal(mismatchTargetRow?.verification_status, "source_checksum_mismatch", "mismatched source checksum must be identified");
  assert.equal(mismatchTargetRow?.usage_state, "used", "mismatched source checksum must downgrade verified");

  const outsideState = bindBundle(`phase237-outside-${suffix}`, bundle);
  const outsideRows = collect(outsideState, [receiptFor(outsideState, {
    relPath,
    usageState: "verified",
    currentSourceVerified: true,
    currentSourceEvidence: { evidenceType: "file_read", sourcePath: outsideFile, sourceChecksum: sha256(outsideFile) },
    reason: "项目外文件不得作为当前源证明。",
  })]);
  const outsideTargetRow = outsideRows.find(row => row.rel_path === relPath);
  assert.equal(outsideTargetRow?.verification_status, "source_outside_project", "proof path must stay inside the project root");
  assert.equal(outsideTargetRow?.current_source_proof_valid, false, "outside-project proof must fail closed");

  const duplicate = typed.recordGroupTypedMemoryConsumptionLedger(scopeA, { taskId: validState.taskId, targetProject: project, rows: validRows });
  assert.equal(duplicate.duplicate_count, validRows.length, "same observations must not score twice even when replayed");

  const conflictingUsed = { ...validTargetRow, usage_state: "used", claimed_usage_state: "used", current_source_proof_valid: false };
  const conflictingIgnored = { ...validTargetRow, usage_state: "ignored", claimed_usage_state: "ignored", current_source_proof_valid: false };
  const conflict = typed.recordGroupTypedMemoryConsumptionLedger(scopeA, { taskId: validState.taskId, targetProject: project, rows: [conflictingUsed, conflictingIgnored] });
  assert.equal(conflict.conflict_count, 1, "opposing states for one observation must be quarantined as a conflict");
  assert.equal(conflict.recorded_count, 0, "conflicting duplicate observation must not alter ranking");

  const summary = typed.buildGroupTypedMemoryConsumptionSummary(scopeA, { targetProject: project, query });
  assert.equal(summary.proof_verified_entry_count, 1, "summary must expose proof-backed verified count");
  assert.ok(summary.downgraded_verified_entry_count >= 1, "summary must expose downgraded verified count");
  assert.ok(summary.anomaly_entry_count >= 1, "summary must expose anomalous self-attested verification");
  assert.equal(typed.readGroupTypedMemoryConsumptionLedger(scopeB).valid_entry_count, 0, "session B must not see session A proof feedback");

  console.log(JSON.stringify({
    pass: true,
    checks: 20,
    verifiedAdjustment: validDoc.typedMemoryConsumption.adjustment,
    proofVerified: summary.proof_verified_entry_count,
    downgradedVerified: summary.downgraded_verified_entry_count,
    anomalies: summary.anomaly_entry_count,
    duplicateSuppressed: true,
    conflictingObservationQuarantined: true,
    crossSessionRejected: true,
  }, null, 2));
} finally {
  for (const taskId of taskIds) {
    try { sessions.purgeTaskAgentSessions(taskId); } catch {}
  }
  cleanupScope(scopeA);
  cleanupScope(scopeB);
  cleanupScope(groupId);
  cleanupSession(sessionA);
  cleanupSession(sessionB);
  cleanupRuntimeResidue();
}
