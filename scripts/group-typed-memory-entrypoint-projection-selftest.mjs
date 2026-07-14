import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase276-entrypoint-projection-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `group-phase276-${process.pid}-${Date.now().toString(36)}`;
const sessionId = `gcs_phase276_${process.pid}_${Date.now().toString(36)}`;
const scopeId = `${groupId}--${sessionId}`;
const otherScopeId = `${groupId}--gcs_phase276_other_${process.pid}`;
const memoryDir = typed.getGroupTypedMemoryDir(scopeId);
const otherMemoryDir = typed.getGroupTypedMemoryDir(otherScopeId);

function writeTopic(dir, index, sentinel) {
  const suffix = String(index).padStart(3, "0");
  const file = path.join(dir, `phase276-topic-${suffix}.md`);
  const description = `Durable session memory ${suffix} ${"bounded-index-description ".repeat(6)}`.slice(0, 150);
  const content = [
    "---",
    `name: Phase 276 Topic ${suffix}`,
    `description: ${description}`,
    "type: user",
    "source: phase276-entrypoint-projection-selftest",
    `updated_at: 2026-07-14T08:${String(index % 60).padStart(2, "0")}:00.000Z`,
    `checksum: phase276-${suffix}`,
    "---",
    "",
    `# Phase 276 Topic ${suffix}`,
    "",
    `Long-term rule ${sentinel}. Apply only in ${scopeId}.`,
    "",
  ].join("\n");
  fs.writeFileSync(file, content, "utf-8");
  return file;
}

try {
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(otherMemoryDir, { recursive: true });
  const finalSentinel = "PHASE276_LAST_TOPIC_DISCOVERABLE";
  for (let index = 0; index < 230; index += 1) {
    writeTopic(memoryDir, index, index === 229 ? finalSentinel : `PHASE276_TOPIC_${String(index).padStart(3, "0")}`);
  }
  writeTopic(otherMemoryDir, 0, "PHASE276_OTHER_SESSION_ONLY");

  const index = typed.buildGroupTypedMemoryIndex(scopeId);
  const otherIndex = typed.buildGroupTypedMemoryIndex(otherScopeId);
  const diskContent = fs.readFileSync(index.file, "utf-8");
  const diskContentBeforeRebuild = diskContent;
  const projection = typed.truncateGroupTypedMemoryEntrypointContent(diskContent);
  const loadPlan = typed.buildGroupTypedMemoryLoadPlan(scopeId, { maxEntries: 240 });
  const recall = typed.buildGroupTypedMemoryRecall(scopeId, finalSentinel, { max: 5 });
  const otherRecall = typed.buildGroupTypedMemoryRecall(otherScopeId, finalSentinel, { max: 5 });
  const rebuilt = typed.buildGroupTypedMemoryIndex(scopeId);
  const diskContentAfterRebuild = fs.readFileSync(rebuilt.file, "utf-8");
  const entrypoint = loadPlan.entries.find(entry => entry.kind === "entrypoint");
  const centerDiagnostics = center.buildGroupPostCompactUsageDiagnostics(groupId, { groupSessionId: sessionId }, sessionId);
  const centerEntrypoint = centerDiagnostics.typedMemory.entrypoint;

  const checks = {
    diskIndexKeepsAllTopics: index.docs.length === 230
      && diskContent.includes("phase276-topic-000.md")
      && diskContent.includes("phase276-topic-229.md"),
    diskIndexExceedsInjectionCaps: index.lineCount > typed.GROUP_TYPED_MEMORY_MAX_INDEX_LINES
      && index.bytes > typed.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES,
    projectionAppliesBothCaps: projection.wasLineTruncated === true
      && projection.wasByteTruncated === true
      && projection.loadedLineCount <= typed.GROUP_TYPED_MEMORY_MAX_INDEX_LINES
      && projection.loadedByteCount <= typed.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES,
    projectionWarnsWithoutMutatingDisk: projection.content.includes("> WARNING: MEMORY.md")
      && !diskContent.includes("> WARNING: MEMORY.md"),
    loadPlanUsesBoundedEntrypoint: loadPlan.entrypointTruncated === true
      && loadPlan.entryListTruncated === false
      && loadPlan.status === "truncated"
      && entrypoint.entrypointTruncation.truncated === true
      && entrypoint.sourceBytes > entrypoint.bytes,
    lateTopicRemainsSemanticallyDiscoverable: recall.candidateCount === 230
      && recall.recalled.some(row => row.relPath === "phase276-topic-229.md" && row.body.includes(finalSentinel)),
    otherSessionCannotRecallLateTopic: otherRecall.recalled.every(row => !row.body.includes(finalSentinel)),
    indexRebuildIsIdempotent: rebuilt.changed === false && diskContentBeforeRebuild === diskContentAfterRebuild,
    noTopicFilesWereDropped: fs.readdirSync(memoryDir).filter(name => /^phase276-topic-\d+\.md$/.test(name)).length === 230,
    memoryCenterShowsDiskAndInjectionCapacity: centerEntrypoint.completeOnDisk === true
      && centerEntrypoint.documentCount === 230
      && centerEntrypoint.diskBytes === index.bytes
      && centerEntrypoint.injectionTruncated === true
      && centerEntrypoint.injectionBytes <= typed.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES,
  };
  checks.otherSessionIndexIsIndependent = otherIndex.docs.length === 1
    && !fs.readFileSync(otherIndex.file, "utf-8").includes("phase276-topic-229.md");
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase276-group-typed-memory-entrypoint-projection-selftest-v1",
    checks,
    disk: { lines: index.lineCount, bytes: index.bytes, docs: index.docs.length },
    projection: {
      loadedLines: projection.loadedLineCount,
      loadedBytes: projection.loadedByteCount,
      lineTruncated: projection.wasLineTruncated,
      byteTruncated: projection.wasByteTruncated,
    },
    recall: recall.surfaced,
  }, null, 2)}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
