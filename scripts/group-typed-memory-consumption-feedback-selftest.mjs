import assert from "node:assert/strict";
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
const groupId = `phase236-consumption-${suffix}`;
const sessionA = `gcs_${Date.now().toString(36)}_consumption_a`;
const sessionB = `gcs_${Date.now().toString(36)}_consumption_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const tamperScope = `phase236-consumption-tamper-${suffix}`;
const project = "phase236-project";
const query = "接口出错时不要再次尝试，先让人确认";
const targetRelPath = "interface-retry-approval-rule.md";

function upsertTarget(body) {
  return typed.upsertGroupTypedMemoryDocument(scopeA, {
    type: "user",
    slug: "interface-retry-approval-rule",
    name: "接口失败后的人工确认规则",
    description: "接口失败时的重试授权约束。",
    source: "selftest:phase236-consumption",
    body,
    updatedAt: new Date().toISOString(),
  });
}

function cleanupScope(scopeId) {
  const dir = path.resolve(typed.getGroupTypedMemoryDir(scopeId));
  const rootDir = path.resolve(path.dirname(dir));
  if (dir.startsWith(`${rootDir}${path.sep}`) && path.basename(dir).startsWith("phase236-consumption-")) {
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

function cleanupTaskAgentState(taskId) {
  try { sessions.purgeTaskAgentSessions(taskId); } catch {}
}

function cleanupGroupRuntimeResidue() {
  const targets = [
    path.join(runtimeRoot, "group-memory-reload", groupId),
    path.join(runtimeRoot, "group-memory-sessions", groupId),
    path.join(runtimeRoot, "group-messages", "sessions", groupId),
    path.join(runtimeRoot, "group-memory-compact-boundaries", groupId),
    path.join(runtimeRoot, "group-global-memory-arbitration", `${groupId}.json`),
  ];
  for (const target of targets) {
    const resolved = path.resolve(target);
    if (!resolved.startsWith(`${runtimeRoot}${path.sep}`)) continue;
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

function makeFactCitations(binding) {
  const evidence = (binding.sessionMemorySectionEvidence || [])[0];
  if (!evidence) return [];
  const sourceMessageIds = Array.isArray(evidence.sourceMessageIds) ? evidence.sourceMessageIds : [];
  const fact = (binding.activeFacts || []).find(item => sourceMessageIds.includes(item.sourceMessageId));
  return [{
    evidenceId: evidence.evidenceId,
    section: evidence.section,
    sectionChecksum: evidence.sectionChecksum,
    sourceTranscriptChecksum: evidence.sourceTranscriptChecksum,
    sourceMessageIds,
    factId: fact?.factId || "",
    factChecksum: fact?.factChecksum || "",
    usage: "本轮按当前 Session Memory 约束执行。",
  }];
}

function bindBundle(taskId, bundle) {
  const taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "codex" });
  const prompt = `PHASE236_PROMPT\n\n${memory.renderGroupMemoryContextBundle(bundle)}\n\nPHASE236_TASK`;
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
  const delivery = sessions.recordTaskAgentMemoryContextDelivery(taskSession.id, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: prompt,
    snapshotRenderedPrompt: prompt,
    executionId: `${taskId}--${project}`,
    runtime: "codex",
    dispatched: true,
    executionSucceeded: true,
    output: "CCM_AGENT_RECEIPT phase236",
  });
  const source = sessions.listTaskAgentMemoryContextSnapshots({ taskId })
    .find(row => row.snapshot_id === bound.snapshot.snapshot_id);
  return { taskId, taskSession, bound, delivery, source, binding: bound.snapshot.context.group_session_memory_binding };
}

function makeReceipt(state, usageState) {
  const typedRow = {
    relPath: targetRelPath,
    usageState,
    currentSourceVerified: usageState === "verified",
    reason: usageState === "ignored" ? "当前子任务与该约束无关。" : "该约束直接控制接口失败处理。",
  };
  return {
    agent: project,
    status: "done",
    task_agent_session_id: state.taskSession.id,
    memory_context_snapshot_id: state.bound.snapshot.snapshot_id,
    memory_context_snapshot_checksum: state.bound.snapshot.checksum,
    execution_id: `${state.taskId}--${project}`,
    memoryUsed: usageState === "ignored" ? ["使用当前 Session Memory 维持会话边界。"] : [`${targetRelPath}；current source verified=${usageState === "verified"}`],
    memoryIgnored: usageState === "ignored" ? [`${targetRelPath}；当前任务不采用。`] : [],
    typedMemoryUsage: [typedRow],
    memoryContextUsage: {
      bindingId: state.binding.memoryBindingId,
      groupSessionId: state.binding.groupSessionId,
      sessionMemoryChecksum: state.binding.sessionMemoryChecksum,
      modelExtractionExecutionId: state.binding.modelExtractionExecutionId,
      modelExtractionReplayStatus: state.binding.modelExtractionReplayStatus,
      factSupersessionGraphChecksum: state.binding.factSupersessionGraphChecksum,
      usageState: "used",
      reason: "使用当前群聊会话的 Session Memory。",
    },
    memoryFactCitations: makeFactCitations(state.binding),
  };
}

function collectAndRecord(state, receipt, taskSessionId = sessionA) {
  const task = {
    id: state.taskId,
    group_id: groupId,
    group_session_id: taskSessionId,
    target_project: project,
  };
  const rows = collaboration.collectTaskTypedMemoryConsumptionRows(task, [receipt], {
    taskAgentMemoryContextSnapshots: [state.source],
    execution: { id: `${state.taskId}--${project}` },
  });
  const ledger = typed.recordGroupTypedMemoryConsumptionLedger(`${groupId}--${taskSessionId}`, {
    taskId: state.taskId,
    executionId: `${state.taskId}--${project}`,
    targetProject: project,
    rows,
  });
  return { rows, ledger };
}

try {
  upsertTarget("# Retry policy\n接口调用失败后禁止自动重试，必须等待人工确认。");
  typed.upsertGroupTypedMemoryDocument(scopeA, {
    type: "project",
    slug: "generic-workflow",
    name: "普通开发流程",
    description: "一般项目工作记录。",
    source: "selftest:phase236-consumption",
    body: "# Workflow\n整理需求、更新文档、提交代码并发布版本。",
  });
  typed.upsertGroupTypedMemoryDocument(scopeB, {
    type: "user",
    slug: "session-b-only",
    name: "会话 B 独立规则",
    description: "只属于会话 B。",
    source: "selftest:phase236-consumption",
    body: "# Session B\n接口失败后允许自动重试。",
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
  const surfaced = bundle.group_state.typedMemory.recall.recalled.find(row => row.relPath === targetRelPath);
  assert.ok(surfaced?.checksum, "surfaced typed memory must carry its document checksum");

  const usedState = bindBundle(`phase236-used-${suffix}`, bundle);
  const usedReceipt = makeReceipt(usedState, "used");
  const used = collectAndRecord(usedState, usedReceipt);
  assert.ok(used.rows.some(row => row.rel_path === targetRelPath && row.usage_state === "used" && row.evidence_valid), "valid bound used receipt should produce a consumption row");
  assert.ok(used.ledger.recorded_count >= 1, "used row should be persisted");

  const afterUsed = typed.buildGroupTypedMemoryRecall(scopeA, query, { targetProject: project, disableLedger: true, max: 8 });
  const afterUsedTarget = afterUsed.recalled.find(row => row.relPath === targetRelPath);
  assert.ok(afterUsedTarget.typedMemoryConsumption.adjustment > 0, "used feedback should boost the same doc for a related query");
  assert.equal(afterUsed.typedMemoryConsumptionScoring.boosted_count >= 1, true, "boost should be observable");

  const ignoredState = bindBundle(`phase236-ignored-${suffix}`, bundle);
  const ignoredReceipt = makeReceipt(ignoredState, "ignored");
  const ignored = collectAndRecord(ignoredState, ignoredReceipt);
  assert.ok(ignored.rows.some(row => row.rel_path === targetRelPath && row.usage_state === "ignored"), "valid ignored receipt should be persisted");
  const conflicted = typed.buildGroupTypedMemoryRecall(scopeA, query, { targetProject: project, disableLedger: true, max: 8 });
  const conflictTarget = conflicted.recalled.find(row => row.relPath === targetRelPath);
  assert.equal(conflictTarget.typedMemoryConsumption.conflict, true, "opposing consumption evidence should require current-session re-evaluation");
  assert.equal(conflictTarget.typedMemoryConsumption.adjustment, 0, "conflicting history must not decide ranking by majority");

  const tamperedReceipt = {
    ...usedReceipt,
    memory_context_snapshot_checksum: "tampered-snapshot-checksum",
  };
  const tamperedRows = collaboration.collectTaskTypedMemoryConsumptionRows({
    id: usedState.taskId,
    group_id: groupId,
    group_session_id: sessionA,
    target_project: project,
  }, [tamperedReceipt], { taskAgentMemoryContextSnapshots: [usedState.source] });
  assert.deepEqual(tamperedRows, [], "tampered snapshot receipt must not affect consumption ranking");

  const crossSessionRows = collaboration.collectTaskTypedMemoryConsumptionRows({
    id: usedState.taskId,
    group_id: groupId,
    group_session_id: sessionB,
    target_project: project,
  }, [usedReceipt], { taskAgentMemoryContextSnapshots: [usedState.source] });
  assert.deepEqual(crossSessionRows, [], "valid session A evidence must not be replayed into session B");
  assert.equal(typed.readGroupTypedMemoryConsumptionLedger(scopeB).valid_entry_count, 0, "session B ledger must remain empty");

  upsertTarget("# Retry policy\n接口失败后禁止自动重试，必须等待人工批准，并记录审批编号。");
  const afterUpdate = typed.buildGroupTypedMemoryRecall(scopeA, query, { targetProject: project, disableLedger: true, max: 8 });
  const updatedTarget = afterUpdate.recalled.find(row => row.relPath === targetRelPath);
  assert.equal(updatedTarget.typedMemoryConsumption.matched_count, 0, "old feedback must not score a changed document checksum");

  const ignoredMemory = typed.buildGroupTypedMemoryRecall(scopeA, "本轮忽略记忆，只处理当前任务", { targetProject: project });
  assert.equal(ignoredMemory.ignored, true, "ignore-memory remains authoritative");
  assert.deepEqual(ignoredMemory.recalled, [], "ignore-memory recall must remain empty");

  const currentDoc = typed.buildGroupTypedMemoryIndex(scopeA).docs.find(row => row.relPath === targetRelPath);
  const stale = typed.recordGroupTypedMemoryConsumptionLedger(scopeA, {
    targetProject: project,
    rows: [{
      rel_path: targetRelPath,
      document_checksum: currentDoc.checksum,
      usage_state: "verified",
      evidence_valid: true,
      task_agent_session_id: "tas_stale_phase236",
      memory_context_snapshot_id: "tams_stale_phase236",
      memory_context_snapshot_checksum: "snapshot-stale-phase236",
      delivery_receipt_checksum: "delivery-stale-phase236",
      receipt_evidence_checksum: "receipt-stale-phase236",
      query_concepts: ["retry", "interface", "human_approval"],
      query_polarities: ["prohibit"],
      query_relations: ["approval_before_retry"],
      generated_at: "2026-01-01T00:00:00.000Z",
    }],
  });
  assert.equal(stale.recorded_count, 1, "stale evidence fixture should be accepted into the ledger");
  const staleSummary = typed.buildGroupTypedMemoryConsumptionSummary(scopeA, {
    targetProject: project,
    query,
    nowMs: Date.parse("2026-07-13T00:00:00.000Z"),
  });
  assert.ok(staleSummary.stale_entry_count >= 1, "feedback older than the stale window should be observable and score zero");

  typed.upsertGroupTypedMemoryDocument(tamperScope, {
    type: "user",
    slug: "tamper-rule",
    name: "Tamper rule",
    description: "Tamper fixture.",
    source: "selftest:phase236-consumption",
    body: "接口失败后禁止重试。",
  });
  const tamperDoc = typed.buildGroupTypedMemoryIndex(tamperScope).docs.find(row => row.relPath === "tamper-rule.md");
  typed.recordGroupTypedMemoryConsumptionLedger(tamperScope, {
    targetProject: project,
    rows: [{
      rel_path: "tamper-rule.md",
      document_checksum: tamperDoc.checksum,
      usage_state: "used",
      evidence_valid: true,
      task_agent_session_id: "tas_tamper_phase236",
      memory_context_snapshot_id: "tams_tamper_phase236",
      memory_context_snapshot_checksum: "snapshot-tamper-phase236",
      delivery_receipt_checksum: "delivery-tamper-phase236",
      receipt_evidence_checksum: "receipt-tamper-phase236",
      query_concepts: ["retry", "interface"],
    }],
  });
  const tamperFile = typed.getGroupTypedMemoryConsumptionLedgerFile(tamperScope);
  const tamperedLedger = JSON.parse(fs.readFileSync(tamperFile, "utf8"));
  tamperedLedger.entries[0].usage_state = "verified";
  fs.writeFileSync(tamperFile, JSON.stringify(tamperedLedger, null, 2));
  const rejectedTamper = typed.readGroupTypedMemoryConsumptionLedger(tamperScope);
  assert.equal(rejectedTamper.valid_entry_count, 0, "tampered entry must fail closed");
  assert.equal(rejectedTamper.invalid_entry_count, 1, "tamper must remain observable");

  console.log(JSON.stringify({
    pass: true,
    checks: 18,
    usedAdjustment: afterUsedTarget.typedMemoryConsumption.adjustment,
    conflict: conflictTarget.typedMemoryConsumption.conflict,
    crossSessionRejected: true,
    tamperRejected: true,
    changedChecksumInvalidated: true,
    staleEntryCount: staleSummary.stale_entry_count,
    ignoreMemory: true,
  }, null, 2));
} finally {
  cleanupTaskAgentState(`phase236-used-${suffix}`);
  cleanupTaskAgentState(`phase236-ignored-${suffix}`);
  cleanupScope(scopeA);
  cleanupScope(scopeB);
  cleanupScope(tamperScope);
  cleanupScope(groupId);
  cleanupSession(sessionA);
  cleanupSession(sessionB);
  cleanupGroupRuntimeResidue();
}
