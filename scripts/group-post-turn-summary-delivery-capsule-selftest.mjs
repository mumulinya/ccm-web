import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-post-turn-delivery-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const postTurn = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-post-turn-summary.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));

const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const assistant = (id, content, extra = {}) => ({ id, role: "assistant", agent: "api", content, timestamp: new Date().toISOString(), ...extra });

try {
  const groupId = "phase253-group-a";
  const otherGroupId = "phase253-group-b";
  const groupSessionId = storage.createGroupChatSession(groupId, "current").id;
  const otherSessionId = storage.createGroupChatSession(groupId, "isolated").id;
  storage.createGroupChatSession(otherGroupId, "other group");
  const messages = [
    { id: "user-1", role: "user", content: "continue delivery capsule work" },
    ...Array.from({ length: 9 }, (_, index) => assistant(`assistant-${index + 1}`, `TURN_${index + 1}`, {
      task_id: `task-${index + 1}`,
      status: index === 1 ? "blocked" : index === 4 ? "waiting" : "completed",
      blockers: index === 1 ? ["EARLY_BLOCKER_MUST_SURVIVE_SELECTION"] : [],
    })),
  ];
  const rawBefore = digest(messages);
  storage.saveGroupMessages(groupId, messages, groupSessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);
  postTurn.backfillGroupPostTurnSummaries(groupId, groupSessionId, messages, { maxMessages: 100 });

  const taskSession = sessions.openTaskAgentSession({
    scopeId: "phase253-scope",
    taskId: "phase253-task",
    groupId,
    project: "api",
    agentType: "codex",
  });
  assert.ok(taskSession?.id?.startsWith("tas_"));
  const bundle = memory.buildAgentMemoryContextBundle(groupId, "api", "implement capsule", {
    groupSessionId,
    taskId: "phase253-task",
    taskAgentSessionId: taskSession.id,
    nativeSessionId: "native-phase253-a",
    executionId: "execution-phase253-a",
    taskAgentSessionTurn: 1,
    agentType: "codex",
  });
  const capsule = bundle.post_turn_summary_delivery_capsule;
  const packet = runtime.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 253", members: [{ project: "api" }] },
    project: "api",
    task: "implement capsule",
    taskId: "phase253-task",
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    memory: bundle,
  });
  const renderedPrompt = runtime.renderWorkerContextPacket(packet);
  const admitted = memory.admitChildPostTurnSummaryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence: 1,
  });
  const selectedMessageIds = capsule.selected_summaries.map(row => row.summarizes_message_id);

  const snapshotBinding = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId: "phase253-task",
    groupId,
    project: "api",
    nativeSessionId: "native-phase253-a",
    executionId: "execution-phase253-a",
    turn: 1,
    workerContextPacket: packet,
    memoryContext: bundle,
    renderedPrompt,
  });
  const inventoryBeforeTamper = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId });
  const snapshotRowBeforeTamper = inventoryBeforeTamper.rows.find(row => row.snapshotId === snapshotBinding.snapshot.snapshot_id) || {};

  const resumeBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "resume capsule", {
    groupSessionId,
    taskId: "phase253-task",
    taskAgentSessionId: taskSession.id,
    nativeSessionId: "native-phase253-a",
    executionId: "execution-phase253-b",
    taskAgentSessionTurn: 2,
    agentType: "codex",
  });
  const resumeCapsule = resumeBundle.post_turn_summary_delivery_capsule;

  const wrongPromptAdmission = memory.admitChildPostTurnSummaryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt: "prompt deliberately omits capsule checksum",
    attemptSequence: 1,
  });
  const crossGroup = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { group_id: otherGroupId } });
  const crossSession = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { group_session_id: otherSessionId } });
  const crossTaskSession = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { task_agent_session_id: "tas_wrong" } });

  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, groupSessionId),
    compaction: { summaryChecksum: "phase253-new-compact-epoch" },
  }, groupSessionId);
  const compactEpochAdmission = memory.admitChildPostTurnSummaryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence: 1,
  });
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);

  postTurn.recordGroupPostTurnSummary(groupId, groupSessionId, assistant("assistant-10", "TURN_10_NEW_LEDGER_HEAD"));
  const changedHeadAdmission = memory.admitChildPostTurnSummaryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence: 1,
  });
  postTurn.recordGroupPostTurnSummary(groupId, groupSessionId, assistant("assistant-9", "TURN_9_REVISED"));
  const revisedLedger = postTurn.readGroupPostTurnSummaries(groupId, groupSessionId, { limit: 100 });
  const revisedValidation = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, {
    expectedBinding: { group_id: groupId, group_session_id: groupSessionId, task_agent_session_id: taskSession.id },
    ledger: revisedLedger,
    requireCurrentHead: false,
  });

  const ignoredBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "ignore memory for this turn", {
    groupSessionId,
    taskId: "phase253-ignore",
    taskAgentSessionId: taskSession.id,
    taskAgentSessionTurn: 1,
    ignoreMemory: true,
  });
  const globalBundle = memory.buildGlobalGroupMemoryContext("route only", {
    groups: [{ id: groupId, name: "Phase 253", members: [{ project: "api" }] }],
    disableLedger: true,
  });

  const tamperedSnapshot = JSON.parse(fs.readFileSync(snapshotBinding.snapshot.snapshot_file, "utf-8"));
  tamperedSnapshot.context.post_turn_summary_delivery_capsule.selected_summaries[0].message_checksum = "tampered";
  fs.writeFileSync(snapshotBinding.snapshot.snapshot_file, `${JSON.stringify(tamperedSnapshot, null, 2)}\n`, "utf-8");
  const inventoryAfterTamper = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId });
  const snapshotRowAfterTamper = inventoryAfterTamper.rows.find(row => row.snapshotId === snapshotBinding.snapshot.snapshot_id) || {};

  const checks = {
    capsuleCreatedForTasSession: capsule?.schema === postTurn.GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA && capsule.task_agent_session_id === taskSession.id,
    capsuleChecksumValid: postTurn.verifyGroupPostTurnSummaryDeliveryCapsuleChecksum(capsule) === true,
    noteworthyAndLatestSelection: capsule.selected_count === 6 && selectedMessageIds.includes("assistant-2") && selectedMessageIds.includes("assistant-9"),
    spawnAttemptBound: capsule.attempt_sequence === 1 && capsule.invocation_kind === "spawn",
    resumeAttemptBound: resumeCapsule.attempt_sequence === 2 && resumeCapsule.invocation_kind === "resume" && resumeCapsule.task_agent_session_id === taskSession.id,
    packetPromotesCapsule: packet.post_turn_summary_delivery_capsule?.capsule_checksum === capsule.capsule_checksum,
    promptContainsChecksum: renderedPrompt.includes(capsule.capsule_checksum),
    validDispatchAdmitted: admitted.admitted === true && admitted.capsule?.trusted_for_delivery === true,
    promptWithoutChecksumRejected: wrongPromptAdmission.admitted === false && wrongPromptAdmission.reason === "prompt_missing_post_turn_summary_capsule_checksum",
    compactEpochChangeRejected: compactEpochAdmission.admitted === false && compactEpochAdmission.reason === "post_turn_summary_compact_epoch_changed_before_dispatch",
    ledgerHeadChangeRejected: changedHeadAdmission.admitted === false && changedHeadAdmission.reason === "post_turn_summary_ledger_changed_before_dispatch",
    revisedMessageRejectsOldSelection: revisedValidation.trusted_for_delivery === false && revisedValidation.validation_issues.includes("selected_summary_no_longer_current"),
    crossGroupRejected: crossGroup.trusted_for_delivery === false && crossGroup.validation_issues.includes("group_id_mismatch"),
    crossSessionRejected: crossSession.trusted_for_delivery === false && crossSession.validation_issues.includes("group_session_id_mismatch"),
    crossTasRejected: crossTaskSession.trusted_for_delivery === false && crossTaskSession.validation_issues.includes("task_agent_session_id_mismatch"),
    ignoreMemoryHasNoCapsule: !ignoredBundle.post_turn_summary_delivery_capsule && !JSON.stringify(ignoredBundle).includes(postTurn.GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA),
    globalAgentHasNoCapsule: !JSON.stringify(globalBundle).includes(postTurn.GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA),
    snapshotPersistsValidCapsule: snapshotRowBeforeTamper.postTurnSummaryCapsuleValid === true && snapshotRowBeforeTamper.postTurnSummaryCapsulePromptBound === true,
    snapshotTamperFailsClosed: snapshotRowAfterTamper.status === "fail" && snapshotRowAfterTamper.checksumMatches === false && snapshotRowAfterTamper.postTurnSummaryCapsuleValid === false,
    rawTranscriptUnchanged: digest(messages) === rawBefore,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, admitted, compactEpochAdmission, changedHeadAdmission, revisedValidation, snapshotRowBeforeTamper, snapshotRowAfterTamper }, null, 2));
  console.log(JSON.stringify({ pass: true, checks, capsule: {
    checksum: capsule.capsule_checksum,
    selected: selectedMessageIds,
    ledgerHead: capsule.ledger_head_checksum,
  }, inventory: inventoryAfterTamper.summary }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
