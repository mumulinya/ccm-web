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

const groupId = `phase280-semantic-topics-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_topics_a`;
const sessionB = `gcs_${Date.now().toString(36)}_topics_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const databaseRules = Array.from({ length: 17 }, (_, index) =>
  `必须长期使用 PHASE280_DATABASE_POLICY keeps RETENTION_${String(index + 1).padStart(2, "0")}`
);
const oldAccessibilityRule = "必须长期使用 PHASE280_ACCESSIBILITY_POLICY protects CONTRAST_AA";
const newAccessibilityRule = "必须长期使用 PHASE280_ACCESSIBILITY_REPLACEMENT protects CONTRAST_AAA";

function renderMarkdown(lines = []) {
  const populated = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
    .split("\n")
    .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE280_BASE_${index}` : line)
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

function activeTopics(archive) {
  return Object.values(archive?.topics || {}).filter(topic => topic.status === "active");
}

function activeFacts(archive) {
  return Object.values(archive?.facts || {}).filter(fact => fact.status === "active");
}

function topicFactFiles(archive) {
  return activeTopics(archive).flatMap(topic => (topic.docSlugs || []).map(slug => ({
    topic,
    file: path.join(typed.getGroupTypedMemoryDir(scopeA), `${slug}.md`),
  })));
}

function makePureFact(id, text, category = "user", topicId = "") {
  return [id, {
    schema: "ccm-group-session-model-extraction-typed-memory-fact-v1",
    status: "active",
    category,
    text,
    topicId,
    firstCommittedAt: `2026-07-14T00:00:${String(Number(id.replace(/\D/g, "") || 0)).padStart(2, "0")}Z`,
  }];
}

try {
  const firstMessages = [
    ...databaseRules.slice(0, 16).map((content, index) => ({
      id: `phase280-db-${index + 1}`,
      role: "user",
      content: `${content}。`,
      group_session_id: sessionA,
    })),
    { id: "phase280-accessibility-old", role: "user", content: `${oldAccessibilityRule}。`, group_session_id: sessionA },
  ];
  storage.saveGroupMessages(groupId, firstMessages, sessionA);
  storage.saveGroupMessages(groupId, [
    { id: "phase280-session-b", role: "user", content: "PHASE280_SESSION_B_ONLY", group_session_id: sessionB },
  ], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const first = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({
      output: output(renderMarkdown([...databaseRules.slice(0, 16), oldAccessibilityRule])),
      project: "phase280-stub",
      agentType: "codex",
    }),
  });
  const firstArchive = typed.readGroupTypedMemoryDistillationLedger(scopeA).modelExtractionTypedMemoryArchive;
  const firstFacts = activeFacts(firstArchive);
  const firstDatabaseFacts = firstFacts.filter(fact => fact.text.includes("PHASE280_DATABASE_POLICY"));
  const firstAccessibilityFact = firstFacts.find(fact => fact.text.includes("PHASE280_ACCESSIBILITY_POLICY"));
  const firstDatabaseTopic = firstArchive?.topics?.[firstDatabaseFacts[0]?.topicId];
  const firstAccessibilityTopic = firstArchive?.topics?.[firstAccessibilityFact?.topicId];
  const firstDatabaseFiles = (firstDatabaseTopic?.docSlugs || []).map(slug =>
    path.join(typed.getGroupTypedMemoryDir(scopeA), `${slug}.md`)
  );

  const correction = {
    id: "phase280-accessibility-correction",
    role: "user",
    content: `用户更正：${oldAccessibilityRule} 不再适用，改为 ${newAccessibilityRule}。`,
    group_session_id: sessionA,
  };
  const databaseSeventeen = {
    id: "phase280-db-17",
    role: "user",
    content: `${databaseRules[16]}。`,
    group_session_id: sessionA,
  };
  storage.saveGroupMessages(groupId, [...firstMessages, correction, databaseSeventeen], sessionA);
  const second = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({
      output: output(renderMarkdown([...databaseRules, newAccessibilityRule])),
      project: "phase280-stub",
      agentType: "codex",
    }),
  });
  const secondArchive = typed.readGroupTypedMemoryDistillationLedger(scopeA).modelExtractionTypedMemoryArchive;
  const secondFacts = activeFacts(secondArchive);
  const secondDatabaseFacts = secondFacts.filter(fact => fact.text.includes("PHASE280_DATABASE_POLICY"));
  const secondDatabaseTopic = secondArchive?.topics?.[secondDatabaseFacts[0]?.topicId];
  const retiredAccessibilityTopic = secondArchive?.topics?.[firstAccessibilityTopic?.topicId];
  const replacementFact = secondFacts.find(fact => fact.text.includes("PHASE280_ACCESSIBILITY_REPLACEMENT"));
  const replacementTopic = secondArchive?.topics?.[replacementFact?.topicId];
  const renderedTopicFiles = topicFactFiles(secondArchive);
  const perFileFactCounts = renderedTopicFiles.map(({ file }) => ({
    file,
    count: (fs.readFileSync(file, "utf-8").match(/^- #/gm) || []).length,
  }));

  const capFacts = Object.fromEntries(Array.from({ length: 42 }, (_, index) =>
    makePureFact(`cap-${index}`, `PHASE280_UNIQUE_${index}_POLICY value_${index}`)
  ));
  const capped = typed.buildGroupSessionModelExtractionTypedMemoryTopics(capFacts, {}, {
    at: "2026-07-14T01:00:00.000Z",
    maxTopicsPerCategory: 40,
  });
  const cappedActive = Object.values(capped.topics).filter(topic => topic.status === "active" && topic.category === "user");
  const historicalOverflowTopics = Object.fromEntries(Array.from({ length: 42 }, (_, index) => {
    const topicId = `met_historical_${String(index).padStart(2, "0")}`;
    return [topicId, {
      schema: "ccm-group-session-model-extraction-topic-v1",
      version: 1,
      topicId,
      category: "user",
      name: `Historical ${index}`,
      slug: `model-user-historical-${index}`,
      concepts: [`historical_${index}`],
      status: "active",
      factChecksums: [`historical-fact-${index}`],
      createdAt: `2026-07-13T00:${String(index).padStart(2, "0")}:00.000Z`,
    }];
  }));
  const historicalOverflowFacts = Object.fromEntries(Array.from({ length: 42 }, (_, index) =>
    makePureFact(`historical-fact-${index}`, `HISTORICAL_UNIQUE_${index} policy_${index}`, "user", `met_historical_${String(index).padStart(2, "0")}`)
  ));
  const historicalCapped = typed.buildGroupSessionModelExtractionTypedMemoryTopics(historicalOverflowFacts, historicalOverflowTopics, {
    at: "2026-07-14T01:30:00.000Z",
    maxTopicsPerCategory: 40,
  });
  const historicalCappedActive = Object.values(historicalCapped.topics).filter(topic => topic.status === "active" && topic.category === "user");

  const previousTopics = {
    met_merge_a: {
      schema: "ccm-group-session-model-extraction-topic-v1",
      version: 1,
      topicId: "met_merge_a",
      category: "user",
      name: "A",
      slug: "model-user-a",
      concepts: ["phase280_merge_policy", "retention", "database"],
      status: "active",
      factChecksums: ["old-a"],
      createdAt: "2026-07-14T00:00:00.000Z",
    },
    met_merge_b: {
      schema: "ccm-group-session-model-extraction-topic-v1",
      version: 1,
      topicId: "met_merge_b",
      category: "user",
      name: "B",
      slug: "model-user-b",
      concepts: ["phase280_merge_policy", "retention", "database", "backup"],
      status: "active",
      factChecksums: ["old-b"],
      createdAt: "2026-07-14T00:00:01.000Z",
    },
  };
  const merged = typed.buildGroupSessionModelExtractionTypedMemoryTopics(Object.fromEntries([
    makePureFact("merge-1", "PHASE280_MERGE_POLICY retention database", "user", "met_merge_b"),
  ]), previousTopics, { at: "2026-07-14T02:00:00.000Z" });
  const unsafe = typed.buildGroupSessionModelExtractionTypedMemoryTopics(Object.fromEntries([
    makePureFact("unsafe-1", "../../WINDOWS_SYSTEM32 SECRET_POLICY"),
  ]), {}, { at: "2026-07-14T03:00:00.000Z" });
  const unsafeTopic = Object.values(unsafe.topics).find(topic => topic.status === "active");

  const indexFile = typed.getGroupTypedMemoryIndexFile(scopeA);
  const indexText = fs.readFileSync(indexFile, "utf-8");
  const truncatedProjection = typed.truncateGroupTypedMemoryEntrypointContent(
    Array.from({ length: 240 }, (_, index) => `- [topic ${index}](topic-${index}.md)`).join("\n")
  );
  const isolatedRecall = typed.buildGroupTypedMemoryRecall(scopeB, "PHASE280_DATABASE_POLICY", { max: 8 });
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const row = report.groups?.[0] || {};

  const checks = {
    semanticConceptsCreateDistinctTopics: first.committed === true
      && first.typedMemoryCommit?.committed === true
      && firstDatabaseTopic?.topicId
      && firstAccessibilityTopic?.topicId
      && firstDatabaseTopic.topicId !== firstAccessibilityTopic.topicId,
    sameConceptReusesStableTopic: firstDatabaseFacts.length === 16
      && new Set(firstDatabaseFacts.map(fact => fact.topicId)).size === 1
      && secondDatabaseFacts.length === 17
      && new Set(secondDatabaseFacts.map(fact => fact.topicId)).size === 1
      && secondDatabaseTopic?.topicId === firstDatabaseTopic?.topicId
      && second.typedMemoryCommit?.reusedTopicCount >= 1,
    topicFilesAreBoundedAndSplit: firstDatabaseFiles.length === 2
      && secondDatabaseTopic?.docSlugs?.length === 2
      && perFileFactCounts.length >= 3
      && perFileFactCounts.every(item => item.count > 0 && item.count <= typed.GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE),
    supersessionRetiresAndDeletesOldTopic: second.typedMemoryCommit?.supersededCount >= 1
      && retiredAccessibilityTopic?.status === "retired"
      && (firstAccessibilityTopic?.docSlugs || []).every(slug => !fs.existsSync(path.join(typed.getGroupTypedMemoryDir(scopeA), `${slug}.md`)))
      && replacementTopic?.status === "active"
      && replacementTopic?.category === "feedback",
    topicCapIncludesConsolidatedTopic: cappedActive.length === 40
      && capped.consolidatedFactCount === 3
      && cappedActive.filter(topic => topic.topicId === "met_user_general").length === 1
      && historicalCappedActive.length === 40
      && historicalCapped.consolidatedFactCount === 3
      && Object.values(historicalCapped.topics).filter(topic => topic.status === "retired").length === 3,
    similarHistoricalTopicsMerge: merged.mergedTopicCount === 1
      && merged.topics.met_merge_b?.status === "merged"
      && merged.topics.met_merge_b?.mergedIntoTopicId === "met_merge_a"
      && merged.facts["merge-1"]?.topicId === "met_merge_a"
      && merged.retiredTopicCount === 0,
    slugAndPathRemainSystemControlled: unsafeTopic?.slug
      && /^[a-z0-9][a-z0-9_-]*$/.test(unsafeTopic.slug)
      && !unsafeTopic.slug.includes("..")
      && !unsafeTopic.slug.includes("/")
      && !unsafeTopic.slug.includes("\\"),
    memoryIndexRemainsBoundedProjection: indexText.trim().split("\n").length <= typed.GROUP_TYPED_MEMORY_MAX_INDEX_LINES
      && truncatedProjection.truncated === true
      && truncatedProjection.loadedLineCount <= typed.GROUP_TYPED_MEMORY_MAX_INDEX_LINES,
    otherSessionCannotSeeTopics: !JSON.stringify(isolatedRecall).includes("PHASE280_DATABASE_POLICY")
      && !fs.existsSync(path.join(typed.getGroupTypedMemoryDir(scopeB), `${secondDatabaseTopic?.slug || "missing"}.md`)),
    memoryCenterReportsTopicLifecycle: row.modelExtractionTypedMemoryArchiveValid === true
      && row.modelExtractionTypedMemoryActiveTopicCount === secondArchive.activeTopicCount
      && row.modelExtractionTypedMemoryRetiredTopicCount === secondArchive.retiredTopicCount
      && row.modelExtractionTypedMemoryMergedTopicCount === secondArchive.mergedTopicCount
      && row.modelExtractionTypedMemoryConsolidatedFactCount === secondArchive.consolidatedFactCount,
    noLegacyFixedTopicFilesRemain: !fs.existsSync(path.join(typed.getGroupTypedMemoryDir(scopeA), "model-extracted-user-constraints.md"))
      && !fs.existsSync(path.join(typed.getGroupTypedMemoryDir(scopeA), "model-extracted-corrections.md")),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    first: first.typedMemoryCommit,
    second: second.typedMemoryCommit,
    firstArchive,
    secondArchive,
    capped,
    historicalCapped,
    merged,
    unsafeTopic,
    perFileFactCounts,
    row,
  }, null, 2));
  console.log(JSON.stringify({ pass: true, checks }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  cleanup(sessionA);
  cleanup(sessionB);
}
