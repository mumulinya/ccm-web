import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase246-model-aware-budget-${nonce}`;
const groupSessionId = `gcs_phase246_${nonce}`;
const typedScopeId = `${groupId}--${groupSessionId}`;
const project = "phase246-project";
const taskId = "phase246-task";
const taskAgentSessionId = "tas_phase246_worker";
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function cleanupRuntimeResidue() {
  for (const topEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topDir = path.resolve(runtimeRoot, topEntry.name);
    let children = [];
    try { children = fs.readdirSync(topDir, { withFileTypes: true }); } catch { continue; }
    for (const child of children) {
      if (child.name !== groupId && !child.name.startsWith(`${groupId}.`) && !child.name.startsWith(`${groupId}--`)) continue;
      const target = path.resolve(topDir, child.name);
      if (!target.startsWith(`${topDir}${path.sep}`)) continue;
      fs.rmSync(target, { recursive: child.isDirectory(), force: true });
    }
  }
}

function makeDoc(relPath, content) {
  return {
    relPath,
    checksum: crypto.createHash("sha256").update(content).digest("hex").slice(0, 32),
    type: "project",
    name: relPath,
    description: content.slice(0, 120),
    snippet: content,
    score: 10,
  };
}

function makeCapsule(docs, options = {}, scope = `child-agent:${project}:${taskAgentSessionId}:precompact`, compactEpoch = "precompact") {
  return memory.buildChildTypedMemoryDeliveryCapsule({
    groupId,
    groupSessionId,
    targetProject: project,
    taskId,
    taskAgentSessionId,
    ledgerScope: { scope, compactEpoch, taskId, taskAgentSessionId },
    recall: { recalled: docs, surfaced: docs.map(doc => doc.relPath) },
  }, options);
}

function capsuleChecksum(capsule) {
  const rows = Array.isArray(capsule.rows) ? capsule.rows : [];
  return crypto.createHash("sha256").update(JSON.stringify([
    Number(capsule.version || 1),
    String(capsule.group_id || ""),
    String(capsule.group_session_id || ""),
    String(capsule.target_project || ""),
    String(capsule.task_id || ""),
    String(capsule.task_agent_session_id || ""),
    String(capsule.recall_scope || ""),
    String(capsule.compact_epoch || "precompact"),
    capsule.budget || {},
    Number(capsule.candidate_count || 0),
    Number(capsule.considered_count || 0),
    Number(capsule.delivered_count || 0),
    Number(capsule.delivered_chars || 0),
    Number(capsule.delivered_bytes || 0),
    Number(capsule.delivered_lines || 0),
    Number(capsule.delivered_tokens || 0),
    Number(capsule.session_delivered_bytes_after || 0),
    capsule.required_rel_paths || [],
    capsule.delivered_rel_paths || [],
    capsule.skipped_rel_paths || [],
    capsule.skipped_rows || [],
    Number(capsule.truncated_count || 0),
    capsule.budget_exhausted === true,
    rows.map(row => [
      row.rel_path,
      row.document_checksum,
      row.content_checksum,
      row.content,
      Number(row.source_chars || 0),
      Number(row.source_bytes || 0),
      Number(row.source_lines || 0),
      Number(row.source_tokens || 0),
      Number(row.delivered_chars || 0),
      Number(row.delivered_bytes || 0),
      Number(row.delivered_lines || 0),
      Number(row.delivered_tokens || 0),
      row.truncated === true,
      row.truncation_reasons || [],
    ]),
  ])).digest("hex").slice(0, 32);
}

try {
  cleanupRuntimeResidue();

  const defaults = orchestrator.defaultOrchestratorConfig();
  equal(defaults.typedMemoryDeliveryMaxDocuments, 5, "default document cap must match Claude Code");
  equal(defaults.typedMemoryDeliveryMaxBytesPerDocument, 4096, "default byte cap must match Claude Code");
  equal(defaults.typedMemoryDeliveryMaxLinesPerDocument, 200, "default line cap must match Claude Code");
  equal(defaults.typedMemoryDeliveryMaxSessionBytes, 61440, "default session cap must match Claude Code");
  equal(defaults.typedMemoryDeliveryMaxTokens, 5000, "default token cap must remain user bounded");

  const chinese = makeCapsule([makeDoc("project/chinese.md", "记忆投递必须按真实字节计算。".repeat(500))], {
    maxBytesPerDocument: 4096,
    maxLinesPerDocument: 200,
    maxTokens: 20000,
    modelContextWindow: 1_000_000,
  });
  ok(chinese.rows[0].delivered_bytes <= 4096, "Chinese UTF-8 content must stay within 4096 bytes");
  equal(Buffer.byteLength(chinese.rows[0].content, "utf8"), chinese.rows[0].delivered_bytes, "declared Chinese bytes must be exact");
  ok(!chinese.rows[0].content.includes("�"), "UTF-8 truncation must not emit replacement characters");
  equal(kernel.validateWorkerTypedMemoryDeliveryCapsule(chinese).checksum_valid, true, "Chinese capsule must validate");

  const lines = Array.from({ length: 300 }, (_, index) => `line-${String(index + 1).padStart(3, "0")}`).join("\n");
  const lineCapsule = makeCapsule([makeDoc("project/lines.md", lines)], { maxTokens: 20000, modelContextWindow: 1_000_000 });
  equal(lineCapsule.rows[0].delivered_lines, 200, "300-line memory must stop at line 200");
  ok(lineCapsule.rows[0].truncation_reasons.includes("line_limit"), "line truncation reason must be explicit");
  equal(lineCapsule.rows[0].content.split("\n").at(-1), "line-200", "line truncation must preserve the prefix boundary");

  const emojiCapsule = makeCapsule([makeDoc("project/unicode.md", "🧠".repeat(2000))], { maxTokens: 20000, modelContextWindow: 1_000_000 });
  ok(emojiCapsule.rows[0].delivered_bytes <= 4096, "emoji content must stay within the byte cap");
  ok(!/[\uD800-\uDBFF]$/.test(emojiCapsule.rows[0].content), "Unicode truncation must not leave a high surrogate");
  equal(kernel.validateWorkerTypedMemoryDeliveryCapsule(emojiCapsule).checksum_valid, true, "surrogate-safe capsule must validate");

  const smallWindow = makeCapsule([makeDoc("project/small-window.md", "small-window ".repeat(2000))], {
    maxTokens: 5000,
    modelContextWindow: 32_000,
  });
  equal(smallWindow.effective_max_tokens, 1000, "32K context must reduce memory delivery to 1000 tokens");
  ok(smallWindow.delivered_tokens <= 1000, "32K delivery must honor the reduced token budget");
  equal(makeCapsule([], { maxTokens: 5000, modelContextWindow: 516_000 }).effective_max_tokens, 5000, "516K must remain capped by the user limit");
  equal(makeCapsule([], { maxTokens: 5000, modelContextWindow: 1_000_000 }).effective_max_tokens, 5000, "1M must remain capped by the user limit");

  const scope = `child-agent:${project}:${taskAgentSessionId}:precompact`;
  for (let round = 0; round < 3; round += 1) {
    const before = typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, scope);
    const docs = Array.from({ length: 5 }, (_, index) => makeDoc(`project/round-${round}-${index}.md`, String(round + index).repeat(5000)));
    const capsule = makeCapsule(docs, {
      maxDocuments: 5,
      maxBytesPerDocument: 4096,
      maxSessionBytes: 61440,
      maxTokens: 20000,
      modelContextWindow: 1_000_000,
      sessionDeliveredBytes: before.deliveredBytes,
    }, scope);
    equal(capsule.delivered_bytes, 20480, `round ${round + 1} must deliver exactly 20KB`);
    typed.recordGroupTypedMemoryRecall(typedScopeId, scope, { recalled: docs, surfaced: docs.map(doc => doc.relPath) }, "phase246 cumulative budget", {
      scopeMetadata: { scopeKind: "task_agent_session", targetProject: project, taskId, taskAgentSessionId, compactEpoch: "precompact" },
      deliveryCapsule: capsule,
    });
  }
  const exhaustedStats = typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, scope);
  equal(exhaustedStats.deliveredBytes, 61440, "the ledger must accumulate exactly 60KB in the current scope");
  equal(exhaustedStats.deliveryCount, 3, "the ledger must count actual delivery turns");
  const exhausted = makeCapsule([makeDoc("project/exhausted.md", "x".repeat(5000))], {
    maxSessionBytes: 61440,
    maxTokens: 20000,
    modelContextWindow: 1_000_000,
    sessionDeliveredBytes: exhaustedStats.deliveredBytes,
  }, scope);
  equal(exhausted.delivered_count, 0, "the fourth prefetch must stop after 60KB");
  equal(exhausted.budget_exhausted, true, "the exhausted capsule must disclose its state");

  const compactScope = `child-agent:${project}:${taskAgentSessionId}:cmp_phase246_new`;
  const compactStats = typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, compactScope);
  equal(compactStats.deliveredBytes, 0, "a new compact epoch must start with a fresh ledger scope");
  const afterCompact = makeCapsule([makeDoc("project/post-compact.md", "post-compact ".repeat(600))], {
    maxSessionBytes: 61440,
    maxTokens: 5000,
    modelContextWindow: 516_000,
    sessionDeliveredBytes: compactStats.deliveredBytes,
  }, compactScope, "cmp_phase246_new");
  ok(afterCompact.delivered_count > 0, "memory delivery must resume after compact epoch changes");

  const tampered = structuredClone(chinese);
  tampered.rows[0].delivered_bytes += 1;
  tampered.capsule_checksum = capsuleChecksum(tampered);
  const tamperedValidation = kernel.validateWorkerTypedMemoryDeliveryCapsule(tampered);
  equal(tamperedValidation.computed_capsule_checksum, tampered.capsule_checksum, "tampered fixture must retain a valid aggregate checksum");
  equal(tamperedValidation.checksum_valid, false, "runtime recomputation must reject forged row statistics");
  ok(tamperedValidation.integrity_issues.includes("row_delivered_bytes_mismatch"), "runtime must report the forged byte statistic");
  const tamperedPacket = kernel.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 246", members: [{ project }] },
    project,
    task: "verify forged delivery statistics",
    taskId,
    taskAgentSessionId,
    memory: {
      schema: "ccm-group-memory-context-v1",
      group_id: groupId,
      group_session_id: groupSessionId,
      target_project: project,
      rendered_text: "PHASE246_GENERIC_MEMORY_WITHOUT_TYPED_BODY",
      session_binding: { task_id: taskId, task_agent_session_id: taskAgentSessionId },
      group_state: { typedMemory: { ledger: { scope: tampered.recall_scope, compactEpoch: tampered.compact_epoch } } },
      typed_memory_delivery_capsule: tampered,
    },
  });
  const tamperedPrompt = kernel.renderWorkerContextPacket(tamperedPacket);
  ok(tamperedPrompt.includes("INVALID delivery capsule"), "forged statistics must render a fail-closed warning");
  ok(!tamperedPrompt.includes(tampered.rows[0].content.slice(0, 80)), "forged capsule content must not enter the Worker prompt");

  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);
  const ignored = memory.buildAgentMemoryContextBundle(groupId, project, "本轮请忽略记忆，只处理当前任务", {
    groupSessionId,
    taskId,
    taskAgentSessionId,
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
  });
  equal(ignored.memory_policy.ignored, true, "ignore-memory semantics must remain authoritative");
  equal(ignored.typed_memory_delivery_capsule, undefined, "ignored memory must not create a delivery capsule");

  const globalMemorySource = fs.readFileSync(path.join(root, "backend", "agents", "global", "memory.ts"), "utf8");
  const globalAgentSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");
  ok(!globalMemorySource.includes("buildAgentMemoryContextBundle"), "Global Agent memory must not import group child memory bundles");
  ok(!globalAgentSource.includes("buildAgentMemoryContextBundle"), "Global Agent dispatch must remain free of group memory text");

  const memoryCenterSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  for (const field of [
    "typedMemoryDeliveryMaxDocuments",
    "typedMemoryDeliveryMaxBytesPerDocument",
    "typedMemoryDeliveryMaxLinesPerDocument",
    "typedMemoryDeliveryMaxSessionBytes",
    "typedMemoryDeliveryMaxTokens",
  ]) ok(memoryCenterSource.includes(field), `Memory Center must expose ${field}`);

  console.log(JSON.stringify({
    pass: true,
    checks,
    chineseDeliveredBytes: chinese.delivered_bytes,
    lineLimit: lineCapsule.rows[0].delivered_lines,
    smallWindowTokenBudget: smallWindow.effective_max_tokens,
    sessionDeliveredBytes: exhaustedStats.deliveredBytes,
    postCompactDeliveryResumed: afterCompact.delivered_count > 0,
    forgedStatsFailClosed: true,
  }, null, 2));
} finally {
  cleanupRuntimeResidue();
}
