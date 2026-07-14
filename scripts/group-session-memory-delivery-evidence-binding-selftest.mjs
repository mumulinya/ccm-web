import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const collaboration = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "collaboration.js"));

const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase234-evidence-${suffix}`;
const sessionA = `gcs_${Date.now().toString(36)}_evidence_a`;
const sessionB = `gcs_${Date.now().toString(36)}_evidence_b`;
const taskA = `phase234-task-a-${suffix}`;
const taskB = `phase234-task-b-${suffix}`;
const projectA = "phase234-project-a";
const projectB = "phase234-project-b";
const oldFact = "必须保留 PHASE234_OLD_RULE。";
const newFact = "必须执行 PHASE234_NEW_RULE。";
const sectionDescription = "_What is actively being worked on right now? Pending tasks not yet completed. Immediate next steps._";
const baseMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE234_BASE_${index}` : line)
  .join("\n")
  .trim();
const oldMarkdown = baseMarkdown.replace(sectionDescription, `${sectionDescription}\n- ${oldFact}`);
const newMarkdown = baseMarkdown.replace(sectionDescription, `${sectionDescription}\n- ${newFact}`);
const output = markdown => `<session_memory>\n${markdown}\n</session_memory>`;
const initialMessages = Array.from({ length: 8 }, (_, index) => ({
  id: `phase234-initial-${index + 1}`,
  role: index % 2 ? "assistant" : "user",
  content: `PHASE234_TRANSCRIPT_${index + 1} ${"会话交付证据。".repeat(90)}`,
  group_session_id: sessionA,
}));
const correctionMessage = {
  id: "phase234-correction-message",
  role: "user",
  content: `用户更正：${oldFact} 不再适用，改为 ${newFact}`,
  group_session_id: sessionA,
};

function cleanupSession(groupSessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId); } catch {}
  const messageFile = storage.getGroupChatSessionMessagesFile(groupId, groupSessionId);
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
}

function bindAndDeliver({ taskId, project, groupSessionId, bundle }) {
  const taskSession = sessions.openTaskAgentSession({ scopeId: taskId, taskId, groupId, project, agentType: "codex" });
  const prompt = `PHASE234_PROMPT\n\n${memory.renderGroupMemoryContextBundle(bundle)}\n\nPHASE234_TASK`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId,
    groupId,
    project,
    groupSessionId,
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
    output: "CCM_AGENT_RECEIPT phase234",
  });
  const source = sessions.listTaskAgentMemoryContextSnapshots({ taskId })
    .find(row => row.snapshot_id === bound.snapshot.snapshot_id);
  return { taskSession, prompt, bound, delivery, source, binding: bound.snapshot.context.group_session_memory_binding };
}

function makeReceipt(boundState, usageState = "used") {
  const { taskSession, bound, binding } = boundState;
  const evidence = binding.sessionMemorySectionEvidence.find(item =>
    (item.sourceMessageIds || []).includes(correctionMessage.id)) || binding.sessionMemorySectionEvidence[0];
  const activeFact = binding.activeFacts.find(item => item.sourceMessageId === correctionMessage.id) || binding.activeFacts[0];
  return {
    agent: projectA,
    status: "done",
    task_agent_session_id: taskSession.id,
    memory_context_snapshot_id: bound.snapshot.snapshot_id,
    memory_context_snapshot_checksum: bound.snapshot.checksum,
    memoryUsed: usageState === "ignored" ? [] : [`使用 ${binding.scopeId} 的 Session Memory`],
    memoryIgnored: usageState === "ignored" ? ["本轮明确忽略记忆，但保留交付证据绑定"] : [],
    memoryContextUsage: {
      bindingId: binding.memoryBindingId,
      groupSessionId: binding.groupSessionId,
      sessionMemoryChecksum: binding.sessionMemoryChecksum,
      modelExtractionExecutionId: binding.modelExtractionExecutionId,
      modelExtractionReplayStatus: binding.modelExtractionReplayStatus,
      factSupersessionGraphChecksum: binding.factSupersessionGraphChecksum,
      usageState,
      reason: usageState === "ignored" ? "用户要求本轮不采用历史内容。" : "用当前有效事实约束本轮实现。",
    },
    memoryFactCitations: usageState === "ignored" ? [] : [{
      evidenceId: evidence.evidenceId,
      section: evidence.section,
      sectionChecksum: evidence.sectionChecksum,
      sourceTranscriptChecksum: evidence.sourceTranscriptChecksum,
      sourceMessageIds: [correctionMessage.id],
      factId: activeFact.factId,
      factChecksum: activeFact.factChecksum,
      usage: "采用更正后的当前有效规则。",
    }],
  };
}

try {
  storage.saveGroupMessages(groupId, initialMessages, sessionA);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionA),
    persistentRequirements: [oldFact],
  }, sessionA);
  const first = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    executor: async () => ({ output: output(oldMarkdown), project: "phase234-stub", agentType: "codex" }),
  });
  storage.saveGroupMessages(groupId, [...initialMessages, correctionMessage], sessionA);
  const second = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({ output: output(newMarkdown), project: "phase234-stub", agentType: "codex" }),
  });

  storage.saveGroupMessages(groupId, [{
    id: "phase234-session-b-message",
    role: "user",
    content: "PHASE234_SESSION_B_ONLY",
    group_session_id: sessionB,
  }], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const bundleA = memory.buildAgentMemoryContextBundle(groupId, projectA, "apply current rule", { groupSessionId: sessionA, taskId: taskA });
  const bundleB = memory.buildAgentMemoryContextBundle(groupId, projectB, "isolated task", { groupSessionId: sessionB, taskId: taskB });
  const stateA = bindAndDeliver({ taskId: taskA, project: projectA, groupSessionId: sessionA, bundle: bundleA });
  const stateB = bindAndDeliver({ taskId: taskB, project: projectB, groupSessionId: sessionB, bundle: bundleB });
  const validReceipt = makeReceipt(stateA);
  const valid = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA }, validReceipt, { taskAgentMemoryContextSnapshots: [stateA.source] });

  const wrongGraph = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA },
    { ...validReceipt, memoryContextUsage: { ...validReceipt.memoryContextUsage, factSupersessionGraphChecksum: "wrong-graph" } },
    { taskAgentMemoryContextSnapshots: [stateA.source] },
  );
  const staleExecution = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA },
    { ...validReceipt, memoryContextUsage: { ...validReceipt.memoryContextUsage, modelExtractionExecutionId: first.executionId } },
    { taskAgentMemoryContextSnapshots: [stateA.source] },
  );
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionA}`);
  const supersededFact = snapshot.factSupersessionGraph.facts.find(fact => fact.status === "superseded");
  const supersededCitation = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA },
    {
      ...validReceipt,
      memoryFactCitations: validReceipt.memoryFactCitations.map(citation => ({
        ...citation,
        factId: supersededFact.factId,
        factChecksum: supersededFact.factChecksum,
      })),
    },
    { taskAgentMemoryContextSnapshots: [stateA.source] },
  );
  const ignoredReceipt = makeReceipt(stateA, "ignored");
  const ignored = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA }, ignoredReceipt, { taskAgentMemoryContextSnapshots: [stateA.source] });
  const crossSession = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectB }, { ...validReceipt, agent: projectB }, { taskAgentMemoryContextSnapshots: [stateB.source] });

  const tamperedSnapshotSource = JSON.parse(JSON.stringify(stateA.source));
  tamperedSnapshotSource.context.group_session_memory_binding.factSupersessionGraphChecksum = "tampered-snapshot-graph";
  const tamperedSnapshot = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA }, validReceipt, { taskAgentMemoryContextSnapshots: [tamperedSnapshotSource] });
  const tamperedDeliverySource = JSON.parse(JSON.stringify(stateA.source));
  tamperedDeliverySource.delivery_receipt.modelExtractionEvidenceValid = false;
  const tamperedDelivery = collaboration.evaluateReceiptTaskAgentMemoryContextSnapshot(
    { target_project: projectA }, validReceipt, { taskAgentMemoryContextSnapshots: [tamperedDeliverySource] });
  const globalContext = memory.buildGlobalGroupMemoryContext("route only");

  const checks = {
    committedExtractionPersistsReplayEvidence: first.committed === true
      && second.committed === true
      && second.deliveryEvidence?.replayPass === true
      && model.verifyGroupSessionMemoryModelExtractionReplayEvidence(second.deliveryEvidence) === true,
    bindingV2CarriesExactEvidence: stateA.binding.schema === "ccm-task-agent-group-session-memory-binding-v2"
      && stateA.binding.modelExtractionExecutionId === second.executionId
      && stateA.binding.modelExtractionReplayStatus === "verified"
      && stateA.binding.modelExtractionEvidenceValid === true
      && stateA.binding.deliveryReady === true
      && stateA.binding.factSupersessionGraphChecksum === second.deliveryEvidence.factSupersessionGraphChecksum,
    artifactPathsExcludedFromChildContext: !JSON.stringify(bundleA).includes("requestArtifactFile")
      && !JSON.stringify(bundleA).includes("resultArtifactFile")
      && !JSON.stringify(bundleA).includes("receiptFile"),
    validActiveFactCitationAccepted: valid.pass === true
      && valid.rows?.[0]?.memory_fact_citations?.[0]?.active_fact_binding_matches === true,
    wrongGraphChecksumRejected: wrongGraph.pass === false
      && wrongGraph.rows?.[0]?.fact_supersession_graph_checksum_matches === false,
    staleExtractionExecutionRejected: staleExecution.pass === false
      && staleExecution.rows?.[0]?.model_extraction_execution_matches === false,
    supersededFactCitationRejected: supersededCitation.pass === false
      && supersededCitation.rows?.[0]?.memory_fact_citations?.[0]?.active_fact_binding_matches === false,
    ignoredMemoryStillBindsEvidence: ignored.pass === true
      && ignored.declared_usage_state === "ignored"
      && ignored.declared_memory_fact_citations.length === 0,
    crossSessionEvidenceRejected: crossSession.pass === false,
    tamperedSnapshotRejected: tamperedSnapshot.pass === false,
    tamperedDeliveryReceiptRejected: tamperedDelivery.pass === false
      && tamperedDelivery.rows?.[0]?.delivery_bound === false,
    globalAgentExcludesGroupFactBodies: !JSON.stringify(globalContext).includes("PHASE234_NEW_RULE")
      && !JSON.stringify(globalContext).includes("PHASE234_OLD_RULE"),
    sessionBRemainsIsolated: !JSON.stringify(bundleB).includes("PHASE234_NEW_RULE")
      && stateB.binding.groupSessionId === sessionB,
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    first,
    second,
    binding: stateA.binding,
    valid,
    wrongGraph,
    staleExecution,
    supersededCitation,
    ignored,
    crossSession,
    tamperedSnapshot,
    tamperedDelivery,
  }, null, 2));

  sessions.purgeTaskAgentSessions(taskA);
  sessions.purgeTaskAgentSessions(taskB);
  cleanupSession(sessionA);
  cleanupSession(sessionB);
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, sessionA)), false);
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, sessionB)), false);
  console.log(JSON.stringify({ pass: true, checks }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { sessions.purgeTaskAgentSessions(taskA); } catch {}
  try { sessions.purgeTaskAgentSessions(taskB); } catch {}
  cleanupSession(sessionA);
  cleanupSession(sessionB);
}
