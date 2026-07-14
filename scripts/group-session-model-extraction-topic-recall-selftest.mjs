import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase282-topic-recall-${nonce}`;
const sessionA = `gcs_phase282_a_${nonce}`;
const sessionB = `gcs_phase282_b_${nonce}`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const fixtureDir = path.join(root, "scratch", groupId);
const currentSourceFile = path.join(fixtureDir, "current-frontend-policy.txt");
const currentSourceRelativePath = path.relative(root, currentSourceFile).replace(/\\/g, "/");
const databaseRules = Array.from({ length: 16 }, (_, index) =>
  `Must always use PHASE282_DATABASE_SHARD_${String(index + 1).padStart(2, "0")} database backup retention policy`
);
const chineseDatabaseRule = "必须长期使用数据库备份留存策略 PHASE282_DATABASE_ZH";
const frontendRule = "Must always use PHASE282_FRONTEND_A11Y frontend accessibility contrast checks";
const unclassifiedRule = "Always remember this";

function renderMarkdown(lines = []) {
  const populated = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
    .split("\n")
    .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE282_BASE_${index}` : line)
    .join("\n");
  const marker = "_What did the user ask to build? Any design decisions or other explanatory context_";
  return populated.replace(marker, `${marker}\n${lines.map(line => `- ${line}`).join("\n")}`).trim();
}

function output(markdown) {
  return `<session_memory>\n${markdown}\n</session_memory>`;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function cleanup(sessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { fs.rmSync(target, { force: true }); } catch {}
  }
}

function hasMarker(recall, marker) {
  return JSON.stringify(recall?.recalled || []).includes(marker);
}

try {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(currentSourceFile, "frontend policy changed in current source\n", "utf-8");
  const rules = [...databaseRules, chineseDatabaseRule, frontendRule, unclassifiedRule];
  storage.saveGroupMessages(groupId, rules.map((content, index) => ({
    id: `phase282-rule-${index + 1}`,
    role: "user",
    content: `${content}。`,
    group_session_id: sessionA,
  })), sessionA);
  storage.saveGroupMessages(groupId, [{
    id: "phase282-session-b",
    role: "user",
    content: "PHASE282_SESSION_B_ONLY",
    group_session_id: sessionB,
  }], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const extraction = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({
      output: output(renderMarkdown(rules)),
      project: "phase282-stub",
      agentType: "codex",
    }),
  });
  assert.equal(extraction.committed, true, "model extraction must commit before recall assertions");

  const ledger = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const archive = ledger.modelExtractionTypedMemoryArchive;
  const facts = Object.values(archive?.facts || {}).filter(item => item.status === "active");
  const databaseFact = facts.find(item => item.text === databaseRules[0]);
  const frontendFact = facts.find(item => item.text === frontendRule);
  const unclassifiedFact = facts.find(item => item.text === unclassifiedRule);
  const databaseTopic = archive?.topics?.[databaseFact?.topicId];
  const frontendTopic = archive?.topics?.[frontendFact?.topicId];
  assert.ok(databaseTopic?.docSlugs?.length >= 2, JSON.stringify({
    message: "database topic must be split into multiple bounded files",
    databaseTopic,
    activeFacts: facts.map(item => ({ text: item.text, topicId: item.topicId, category: item.category })),
    topics: Object.values(archive?.topics || {}).map(item => ({ topicId: item.topicId, docSlugs: item.docSlugs, factCount: item.factChecksums?.length, concepts: item.concepts })),
  }, null, 2));
  assert.equal(unclassifiedFact?.topicId, "met_user_unclassified", "low-signal memory must remain unclassified");

  const unrelated = typed.buildGroupTypedMemoryRecall(scopeA, "quantum renderer unrelated work", { max: 8 });
  const englishRecall = typed.buildGroupTypedMemoryRecall(scopeA, "database backup retention", { max: 8 });
  const chineseRecall = typed.buildGroupTypedMemoryRecall(scopeA, "数据库备份留存", { max: 8 });
  const unclassifiedMiss = typed.buildGroupTypedMemoryRecall(scopeA, "unrelated deployment pipeline", { max: 8 });
  const unclassifiedHit = typed.buildGroupTypedMemoryRecall(scopeA, "Always remember this", { max: 8 });
  const bestPartRecall = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE282_DATABASE_SHARD_16", { max: 8 });
  const multiTopicRecall = typed.buildGroupTypedMemoryRecall(scopeA, "database backup retention and frontend accessibility contrast", { max: 8 });
  const databaseRelPaths = new Set((databaseTopic.docSlugs || []).map(slug => `${slug}.md`));
  const selectedDatabaseParts = (bestPartRecall.recalled || []).filter(row => databaseRelPaths.has(row.relPath));

  const frontendRelPath = `${frontendTopic.docSlugs[0]}.md`;
  const frontendDoc = typed.scanGroupTypedMemoryDocuments(scopeA).find(row => row.relPath === frontendRelPath);
  const sourceChecksum = sha256(currentSourceFile);
  const staleRecord = typed.recordGroupTypedMemoryStaleCandidates(scopeA, {
    rows: [{
      target_project: "phase282-project",
      task_id: "phase282-stale-task",
      execution_id: "phase282-stale-execution",
      task_agent_session_id: "phase282-stale-agent-session",
      memory_context_snapshot_id: "phase282-stale-snapshot",
      memory_context_snapshot_checksum: "phase282-stale-snapshot-checksum",
      delivery_receipt_checksum: "phase282-delivery-checksum",
      rel_path: frontendDoc.relPath,
      document_checksum: frontendDoc.checksum,
      usage_state: "verified",
      current_source_proof_valid: true,
      current_source_relative_path: currentSourceRelativePath,
      current_source_claimed_checksum: sourceChecksum,
      current_source_observed_checksum: sourceChecksum,
      current_source_proof_id: "phase282-current-source-proof",
      evidence_valid: true,
      receipt_evidence_checksum: "phase282-receipt-evidence",
      conflict_detected: true,
      conflict_kind: "behavior_changed",
      recommended_memory_action: "remove",
      conflict_reason: "Current frontend source supersedes this remembered policy",
    }],
  });
  assert.equal(staleRecord.recorded_count, 1, "pending stale conflict must be recorded");
  const quarantined = typed.buildGroupTypedMemoryRecall(scopeA, "frontend accessibility contrast", { max: 8, forceMemory: true });
  const explicitlyRequired = typed.buildGroupTypedMemoryRecall(scopeA, "frontend accessibility contrast", {
    max: 8,
    forceMemory: true,
    requiredRelPaths: [frontendRelPath],
  });
  const explicitlyRendered = typed.renderGroupTypedMemoryRecall(explicitlyRequired);

  const isolated = typed.buildGroupTypedMemoryRecall(scopeB, "database backup retention PHASE282_DATABASE_SHARD_16", { max: 8 });
  const bundle = memory.buildAgentMemoryContextBundle(groupId, "phase282-project", "PHASE282_DATABASE_SHARD_16", {
    groupSessionId: sessionA,
    taskId: "phase282-bundle-task",
    taskAgentSessionId: "phase282-child-session",
    taskAgentSessionTurn: 1,
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 5,
    maxRenderedChars: 20_000,
  });
  const bundleRecall = bundle.typedMemoryRecall || bundle.typed_memory_recall;
  const ignoredBundle = memory.buildAgentMemoryContextBundle(groupId, "phase282-project", "ignore memory for this task", {
    groupSessionId: sessionA,
    taskId: "phase282-ignore-task",
    taskAgentSessionId: "phase282-ignore-child",
    ignoreMemory: true,
  });

  const ledgerFile = typed.getGroupTypedMemoryDistillationLedgerFile(scopeA);
  const pristineLedger = fs.readFileSync(ledgerFile, "utf-8");
  const tamperedLedger = JSON.parse(pristineLedger);
  tamperedLedger.modelExtractionTypedMemoryArchive.topics[databaseTopic.topicId].name = "tampered topic";
  fs.writeFileSync(ledgerFile, JSON.stringify(tamperedLedger, null, 2), "utf-8");
  const tamperedRecall = typed.buildGroupTypedMemoryRecall(scopeA, "database backup retention", { max: 8, forceMemory: true });
  fs.writeFileSync(ledgerFile, pristineLedger, "utf-8");

  const checks = {
    unrelatedModelTopicsAllowEmptyRecall: unrelated.recalled.length === 0
      && unrelated.modelExtractionTopicScoring.relevance_gated_count > 0,
    englishQueryRecallsDatabaseTopic: (englishRecall.recalled || []).some(row =>
      row.modelExtractionTopicRecall?.topicId === databaseTopic.topicId && databaseRelPaths.has(row.relPath)),
    chineseQueryRecallsSameDatabaseTopic: (chineseRecall.recalled || []).some(row =>
      row.modelExtractionTopicRecall?.topicId === databaseTopic.topicId && databaseRelPaths.has(row.relPath)),
    unclassifiedNeedsStrongLexicalMatch: !hasMarker(unclassifiedMiss, unclassifiedRule)
      && hasMarker(unclassifiedHit, unclassifiedRule),
    sameTopicSelectsOnlyBestPart: selectedDatabaseParts.length === 1
      && hasMarker(bestPartRecall, "PHASE282_DATABASE_SHARD_16")
      && bestPartRecall.modelExtractionTopicScoring.topic_duplicate_count >= 1,
    distinctTopicsAreNotDeduplicated: (multiTopicRecall.recalled || []).some(row => row.modelExtractionTopicRecall?.topicId === databaseTopic.topicId)
      && (multiTopicRecall.recalled || []).some(row => row.modelExtractionTopicRecall?.topicId === frontendTopic.topicId),
    pendingConflictBlocksAutomaticRecall: !hasMarker(quarantined, "PHASE282_FRONTEND_A11Y")
      && quarantined.modelExtractionTopicScoring.stale_conflict_gated_count === 1,
    requiredConflictIsExplicitAndWarned: hasMarker(explicitlyRequired, "PHASE282_FRONTEND_A11Y")
      && explicitlyRendered.includes("PENDING STALE CONFLICT / REVERIFY REQUIRED")
      && explicitlyRendered.includes("不得把旧记忆当作事实"),
    archiveTamperFailsClosedEvenWhenForced: !(tamperedRecall.recalled || []).some(row =>
      row.source === "auto:model-extraction-evidence-admission")
      && tamperedRecall.modelExtractionTopicScoring.archive_valid === false
      && tamperedRecall.modelExtractionTopicScoring.archive_integrity_gated_count >= 1,
    exactSessionIsolation: isolated.recalled.length === 0
      && !JSON.stringify(isolated).includes("PHASE282_DATABASE_SHARD_16"),
    childBundleDeliversOnlySelectedTopicPart: hasMarker(bundleRecall, "PHASE282_DATABASE_SHARD_16")
      && (bundleRecall.recalled || []).filter(row => databaseRelPaths.has(row.relPath)).length === 1
      && !(bundleRecall.recalled || []).some(row => row.relPath === frontendRelPath),
    ignoreMemoryBehavesAsEmptyMemory: ignoredBundle.group_state?.typedMemory?.recall?.ignored === true
      && ignoredBundle.group_state.typedMemory.recall.recalled.length === 0,
    noLegacyDefaultSessionCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    databaseTopic,
    frontendTopic,
    unrelated,
    englishRecall,
    chineseRecall,
    unclassifiedMiss,
    unclassifiedHit,
    bestPartRecall,
    multiTopicRecall,
    quarantined,
    explicitlyRequired,
    tamperedRecall,
    bundleRecall,
  }, null, 2));
  console.log(JSON.stringify({ pass: true, checks, checkCount: Object.keys(checks).length }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  cleanup(sessionA);
  cleanup(sessionB);
  fs.rmSync(fixtureDir, { recursive: true, force: true });
}
