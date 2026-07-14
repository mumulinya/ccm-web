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
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase232-supersession-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_facts_a`;
const sessionB = `gcs_${Date.now().toString(36)}_facts_b`;
const oldFact = "必须保留 PHASE232_OLD_CONSTRAINT。";
const newFact = "必须使用 PHASE232_NEW_CONSTRAINT。";
const description = "_What is actively being worked on right now? Pending tasks not yet completed. Immediate next steps._";
const baseMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE232_BASE_FACT_${index}` : line)
  .join("\n")
  .trim();
const oldMarkdown = baseMarkdown.replace(description, `${description}\n- ${oldFact}`);
const newMarkdown = baseMarkdown.replace(description, `${description}\n- ${newFact}`);
const output = markdown => `<session_memory>\n${markdown}\n</session_memory>`;
const initialMessages = Array.from({ length: 8 }, (_, index) => ({
  id: `phase232-initial-${index + 1}`,
  role: index % 2 ? "assistant" : "user",
  content: `PHASE232_INITIAL_${index + 1} ${"事实替代来源。".repeat(80)}`,
  group_session_id: sessionA,
}));
const correctionMessage = {
  id: "phase232-exact-correction-message",
  role: "user",
  content: `用户更正：${oldFact} 不再适用，改为 ${newFact}`,
  group_session_id: sessionA,
};

function cleanupSession(sessionId) {
  memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId);
  const messageFile = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
}

try {
  const unrelated = model.analyzeGroupSessionMemoryModelMergeQuality({
    currentNotes: oldMarkdown,
    markdown: newMarkdown,
    sourceText: JSON.stringify([{ id: "unrelated-correction", content: "用户更正：OLD_UNRELATED 不再使用，改为 NEW_UNRELATED。" }]),
    sourceTranscriptChecksum: "phase232-unrelated",
  });
  const exact = model.analyzeGroupSessionMemoryModelMergeQuality({
    currentNotes: oldMarkdown,
    markdown: newMarkdown,
    sourceText: JSON.stringify([{ id: correctionMessage.id, content: correctionMessage.content }]),
    sourceTranscriptChecksum: "phase232-exact",
  });
  const edge = exact.factSupersessionGraph?.edges?.[0];
  const tamperedGraph = JSON.parse(JSON.stringify(exact.factSupersessionGraph));
  tamperedGraph.edges[0].replacementText = "TAMPERED_REPLACEMENT";

  storage.saveGroupMessages(groupId, initialMessages, sessionA);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionA),
    persistentRequirements: [oldFact],
  }, sessionA);
  const first = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    executor: async () => ({ output: output(oldMarkdown), project: "phase232-stub", agentType: "codex" }),
  });
  storage.saveGroupMessages(groupId, [...initialMessages, correctionMessage], sessionA);
  const second = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({ output: output(newMarkdown), project: "phase232-stub", agentType: "codex" }),
  });
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionA}`);
  const childA = memory.buildAgentMemoryContextBundle(groupId, "phase232-project-a", "apply current constraint", { groupSessionId: sessionA });
  const groupMemoryFile = memory.getGroupMemoryFile(groupId, sessionA);
  const originalGroupMemoryText = fs.readFileSync(groupMemoryFile, "utf-8");
  const snapshotFile = snapshot.snapshotFile;
  const originalSnapshotText = fs.readFileSync(snapshotFile, "utf-8");
  const tamperedGroupMemory = JSON.parse(originalGroupMemoryText);
  tamperedGroupMemory.sessionMemory.factSupersessionGraph.activeFacts[0].text = "PHASE232_TAMPERED_CONTEXT_FACT";
  const tamperedSnapshot = JSON.parse(originalSnapshotText);
  tamperedSnapshot.factSupersessionGraph.activeFacts[0].text = "PHASE232_TAMPERED_CONTEXT_FACT";
  fs.writeFileSync(groupMemoryFile, `${JSON.stringify(tamperedGroupMemory, null, 2)}\n`, "utf-8");
  fs.writeFileSync(snapshotFile, `${JSON.stringify(tamperedSnapshot, null, 2)}\n`, "utf-8");
  const tamperedChild = memory.buildAgentMemoryContextBundle(groupId, "phase232-project-a", "tamper check", { groupSessionId: sessionA });
  fs.writeFileSync(groupMemoryFile, originalGroupMemoryText, "utf-8");
  fs.writeFileSync(snapshotFile, originalSnapshotText, "utf-8");

  storage.saveGroupMessages(groupId, [{ id: "phase232-b-1", role: "user", content: "SESSION_B_ISOLATED", group_session_id: sessionB }], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);
  const childB = memory.buildAgentMemoryContextBundle(groupId, "phase232-project-b", "isolated task", { groupSessionId: sessionB });
  const globalContext = memory.buildGlobalGroupMemoryContext("route projects only");
  const replay = model.replayGroupSessionMemoryModelExtraction(`${groupId}--${sessionA}`, second.executionId);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const fleetRow = fleet.groups?.[0] || {};

  const checks = {
    unrelatedCorrectionRejected: unrelated.pass === false
      && unrelated.lostConstraintCount >= 1
      && unrelated.factSupersessionGraph?.supersededFactCount === 0,
    exactReplacementAccepted: exact.pass === true
      && exact.lostConstraintCount === 0
      && exact.factSupersessionGraph?.supersededFactCount === 1,
    edgeBindsOldNewAndMessage: edge?.oldFactChecksum
      && edge?.newFactChecksum
      && edge?.sourceMessageId === correctionMessage.id
      && edge?.replacementText === newFact.replace(/[。；;]+$/, ""),
    graphChecksumVerifies: model.verifyGroupSessionMemoryFactSupersessionGraph(exact.factSupersessionGraph) === true,
    tamperedGraphFailsClosed: model.verifyGroupSessionMemoryFactSupersessionGraph(tamperedGraph) === false,
    committedGraphPersisted: first.committed === true
      && second.committed === true
      && snapshot.factSupersessionGraph?.supersededFactCount === 1
      && model.verifyGroupSessionMemoryFactSupersessionGraph(snapshot.factSupersessionGraph) === true,
    replayVerifiesGraph: replay.pass === true
      && replay.checks?.factSupersessionGraphValid === true
      && replay.checks?.factSupersessionGraphReplays === true,
    memoryCenterAuditsGraph: fleetRow.factSupersessionGraphValid === true
      && fleetRow.factSupersessionEdgeCount === 1
      && fleetRow.factSupersessionUnjustifiedLostCount === 0
      && fleet.overall?.factSupersessionGraphInvalidCount === 0,
    childGetsOnlyActiveReplacement: childA.group_session_id === sessionA
      && childA.rendered_text.includes("PHASE232_NEW_CONSTRAINT")
      && !childA.rendered_text.includes("PHASE232_OLD_CONSTRAINT")
      && childA.compaction?.sessionMemory?.factSupersession?.supersededFactCount === 1
      && !childA.compaction?.sessionMemory?.factSupersessionGraph,
    tamperedGraphFailsClosedAtDispatch: tamperedChild.compaction?.sessionMemory?.factSupersession?.graphValid === false
      && tamperedChild.compaction?.sessionMemory?.factSupersession?.activeFacts?.length === 0
      && !tamperedChild.rendered_text.includes("PHASE232_TAMPERED_CONTEXT_FACT"),
    otherSessionCannotSeeReplacement: childB.group_session_id === sessionB
      && !childB.rendered_text.includes("PHASE232_NEW_CONSTRAINT")
      && !JSON.stringify(childB).includes("PHASE232_NEW_CONSTRAINT"),
    globalAgentCannotSeeGroupFactBodies: !String(globalContext.rendered_text || "").includes("PHASE232_NEW_CONSTRAINT")
      && !String(globalContext.rendered_text || "").includes("PHASE232_OLD_CONSTRAINT"),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  if (!checks.tamperedGraphFailsClosedAtDispatch) {
    console.error(JSON.stringify({
      tamperedProjection: tamperedChild.compaction?.sessionMemory?.factSupersession || null,
      containsTamperedFact: tamperedChild.rendered_text.includes("PHASE232_TAMPERED_CONTEXT_FACT"),
    }, null, 2));
  }
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, unrelated, exact, edge, first, second, snapshot, replay }, null, 2));
  cleanupSession(sessionA);
  cleanupSession(sessionB);
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, sessionA)), false);
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, sessionB)), false);
  console.log(JSON.stringify({ pass: true, checks }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  cleanupSession(sessionA);
  cleanupSession(sessionB);
}
