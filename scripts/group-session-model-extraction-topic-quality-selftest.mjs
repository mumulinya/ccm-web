import assert from "node:assert/strict";
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
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase281-topic-quality-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_quality_a`;
const sessionB = `gcs_${Date.now().toString(36)}_quality_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const englishDatabase = "Must always use database backup retention for PHASE281_DATA";
const chineseDatabase = "必须长期使用数据库备份留存策略 PHASE281_DATA_ZH";
const frontendAccessibility = "Must always use frontend accessibility checks PHASE281_UI";
const lowChinese = "必须长期记住这个";
const lowEnglish = "Always remember this";

function renderMarkdown(lines = []) {
  const populated = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
    .split("\n")
    .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE281_BASE_${index}` : line)
    .join("\n");
  const marker = "_What did the user ask to build? Any design decisions or other explanatory context_";
  return populated.replace(marker, `${marker}\n${lines.map(line => `- ${line}`).join("\n")}`).trim();
}

function output(markdown) {
  return `<session_memory>\n${markdown}\n</session_memory>`;
}

function cleanup(sessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
  }
}

function fact(id, text, topicId = "", at = "2026-07-14T00:00:00.000Z") {
  return [id, {
    schema: "ccm-group-session-model-extraction-typed-memory-fact-v1",
    status: "active",
    category: "user",
    text,
    topicId,
    firstCommittedAt: at,
  }];
}

try {
  const rules = [englishDatabase, chineseDatabase, frontendAccessibility, lowChinese, lowEnglish];
  const messages = rules.map((content, index) => ({
    id: `phase281-rule-${index + 1}`,
    role: "user",
    content: `${content}。`,
    group_session_id: sessionA,
  }));
  storage.saveGroupMessages(groupId, messages, sessionA);
  storage.saveGroupMessages(groupId, [
    { id: "phase281-session-b", role: "user", content: "PHASE281_SESSION_B_ONLY", group_session_id: sessionB },
  ], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const extraction = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({
      output: output(renderMarkdown(rules)),
      project: "phase281-stub",
      agentType: "codex",
    }),
  });
  const archive = typed.readGroupTypedMemoryDistillationLedger(scopeA).modelExtractionTypedMemoryArchive;
  const activeFacts = Object.values(archive?.facts || {}).filter(item => item.status === "active");
  const englishFact = activeFacts.find(item => item.text === englishDatabase);
  const chineseFact = activeFacts.find(item => item.text === chineseDatabase);
  const frontendFact = activeFacts.find(item => item.text === frontendAccessibility);
  const lowFacts = activeFacts.filter(item => [lowChinese, lowEnglish].includes(item.text));
  const databaseTopic = archive?.topics?.[englishFact?.topicId];
  const unclassifiedTopic = archive?.topics?.met_user_unclassified;
  const unclassifiedFile = path.join(typed.getGroupTypedMemoryDir(scopeA), `${unclassifiedTopic?.docSlugs?.[0] || "missing"}.md`);
  const unclassifiedText = fs.readFileSync(unclassifiedFile, "utf-8");

  const deterministicFacts = Object.fromEntries([
    fact("a", englishDatabase, "", "2026-07-14T00:00:00.000Z"),
    fact("b", chineseDatabase, "", "2026-07-14T00:00:01.000Z"),
    fact("c", frontendAccessibility, "", "2026-07-14T00:00:02.000Z"),
  ]);
  const deterministicForward = typed.buildGroupSessionModelExtractionTypedMemoryTopics(deterministicFacts, {}, { at: "2026-07-14T01:00:00.000Z" });
  const deterministicReverse = typed.buildGroupSessionModelExtractionTypedMemoryTopics(Object.fromEntries(Object.entries(deterministicFacts).reverse()), {}, { at: "2026-07-14T01:00:00.000Z" });
  const deterministicNextCommit = typed.buildGroupSessionModelExtractionTypedMemoryTopics(
    deterministicForward.facts,
    deterministicForward.topics,
    { at: "2026-07-14T01:30:00.000Z" },
  );

  const oldEnglishTopic = {
    schema: "ccm-group-session-model-extraction-topic-v1",
    version: 1,
    topicId: "met_old_english",
    category: "user",
    name: "Database backup",
    slug: "model-user-database-backup-old",
    concepts: ["database", "backup", "retention"],
    status: "active",
    factChecksums: ["old-en"],
    createdAt: "2026-07-13T00:00:00.000Z",
  };
  const oldChineseTopic = {
    schema: "ccm-group-session-model-extraction-topic-v1",
    version: 1,
    topicId: "met_old_chinese",
    category: "user",
    name: "数据库备份",
    slug: "model-user-database-backup-zh-old",
    concepts: ["数据库备份", "留存"],
    status: "active",
    factChecksums: ["old-zh"],
    createdAt: "2026-07-13T00:00:01.000Z",
  };
  const historical = typed.buildGroupSessionModelExtractionTypedMemoryTopics(Object.fromEntries([
    fact("old-en", englishDatabase, "met_old_english", "2026-07-13T00:00:00.000Z"),
    fact("old-zh", chineseDatabase, "met_old_chinese", "2026-07-13T00:00:01.000Z"),
    fact("old-low", lowChinese, "met_old_low", "2026-07-13T00:00:02.000Z"),
  ]), {
    met_old_english: oldEnglishTopic,
    met_old_chinese: oldChineseTopic,
    met_old_low: {
      schema: "ccm-group-session-model-extraction-topic-v1",
      version: 1,
      topicId: "met_old_low",
      category: "user",
      name: "Old low signal",
      slug: "model-user-old-low",
      concepts: ["这个"],
      status: "active",
      factChecksums: ["old-low"],
      createdAt: "2026-07-13T00:00:02.000Z",
    },
  }, { at: "2026-07-14T02:00:00.000Z" });

  const capacityFacts = Object.fromEntries([
    ...Array.from({ length: 41 }, (_, index) => fact(
      `capacity-${index}`,
      `MUST_KEEP_UNIQUE_TOPIC_${index} dedicated_value_${index}`,
      "",
      `2026-07-14T03:${String(index).padStart(2, "0")}:00.000Z`,
    )),
    fact("capacity-low-1", lowChinese, "", "2026-07-14T04:00:00.000Z"),
    fact("capacity-low-2", lowEnglish, "", "2026-07-14T04:00:01.000Z"),
  ]);
  const capacity = typed.buildGroupSessionModelExtractionTypedMemoryTopics(capacityFacts, {}, {
    at: "2026-07-14T05:00:00.000Z",
    maxTopicsPerCategory: 40,
  });
  const capacityActive = Object.values(capacity.topics).filter(topic => topic.status === "active" && topic.category === "user");

  const chineseRecall = typed.buildGroupTypedMemoryRecall(scopeA, "数据库备份留存", { max: 8 });
  const isolatedRecall = typed.buildGroupTypedMemoryRecall(scopeB, "database backup retention", { max: 8 });
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const row = report.groups?.[0] || {};

  const checks = {
    bilingualFactsReuseOneTopic: extraction.committed === true
      && extraction.typedMemoryCommit?.committed === true
      && englishFact?.topicId === chineseFact?.topicId
      && databaseTopic?.factChecksums?.length === 2
      && extraction.typedMemoryCommit?.crossLanguageReuseCount >= 1,
    unrelatedDomainStaysSeparate: frontendFact?.topicId
      && frontendFact.topicId !== englishFact?.topicId,
    lowSignalFactsShareUnclassifiedTopic: lowFacts.length === 2
      && lowFacts.every(item => item.topicId === "met_user_unclassified")
      && archive.unclassifiedFactCount === 2
      && archive.lowConfidenceFactCount === 2
      && unclassifiedTopic?.meanAssignmentConfidence < typed.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE,
    unclassifiedTopicRemainsEvidenceBound: unclassifiedText.includes(`#phase281-rule-4 ${lowChinese}`)
      && unclassifiedText.includes(`#phase281-rule-5 ${lowEnglish}`)
      && (unclassifiedText.match(/^- #/gm) || []).length === 2,
    assignmentsAreAuditable: activeFacts.every(item => item.topicAssignment?.schema === "ccm-group-session-model-extraction-topic-assignment-v1"
      && item.topicAssignment.version === typed.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION
      && Array.isArray(item.topicAssignment.concepts)),
    inputOrderDoesNotChangeAssignment: deterministicForward.facts.a.topicId === deterministicReverse.facts.a.topicId
      && deterministicForward.facts.b.topicId === deterministicReverse.facts.b.topicId
      && deterministicForward.facts.c.topicId === deterministicReverse.facts.c.topicId,
    assignmentProvenanceSurvivesLaterCommit: deterministicForward.crossLanguageReuseCount === 1
      && deterministicNextCommit.crossLanguageReuseCount === 1
      && deterministicNextCommit.facts.b.topicAssignment.crossLanguageReuse === true
      && deterministicNextCommit.facts.b.topicAssignment.initialStrategy === "semantic_similarity_reuse"
      && deterministicNextCommit.facts.b.topicAssignment.firstAssignedAt === "2026-07-14T01:00:00.000Z",
    oldBilingualTopicsRebalanceAndMerge: historical.mergedTopicCount >= 1
      && historical.topics.met_old_chinese?.status === "merged"
      && historical.facts["old-en"].topicId === historical.facts["old-zh"].topicId
      && historical.rebalancedFactCount >= 2
      && historical.facts["old-low"].topicId === "met_user_unclassified",
    capacityIncludesQualityBuckets: capacityActive.length <= 40
      && capacity.unclassifiedFactCount === 2
      && capacity.consolidatedFactCount >= 2
      && capacityActive.some(topic => topic.topicId === "met_user_unclassified")
      && capacityActive.some(topic => topic.topicId === "met_user_general"),
    bilingualTopicIsRecallable: JSON.stringify(chineseRecall.recalled || []).includes("PHASE281_DATA")
      && JSON.stringify(chineseRecall.recalled || []).includes("PHASE281_DATA_ZH"),
    exactSessionIsolation: !JSON.stringify(isolatedRecall).includes("PHASE281_DATA")
      && !fs.existsSync(path.join(typed.getGroupTypedMemoryDir(scopeB), `${databaseTopic?.slug || "missing"}.md`)),
    memoryCenterReportsQuality: row.modelExtractionTypedMemoryArchiveValid === true
      && row.modelExtractionTypedMemoryUnclassifiedFactCount === archive.unclassifiedFactCount
      && row.modelExtractionTypedMemoryLowConfidenceFactCount === archive.lowConfidenceFactCount
      && row.modelExtractionTypedMemoryRebalancedFactCount === archive.rebalancedFactCount
      && row.modelExtractionTypedMemoryCrossLanguageReuseCount === archive.crossLanguageReuseCount,
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    commit: extraction.typedMemoryCommit,
    archive,
    deterministicForward,
    deterministicReverse,
    deterministicNextCommit,
    historical,
    capacity,
    chineseRecall,
    row,
  }, null, 2));
  console.log(JSON.stringify({ pass: true, checks }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  cleanup(sessionA);
  cleanup(sessionB);
}
