import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
  };
}

function reinjectionPlan() {
  return {
    schema: "ccm-post-compact-reinjection-v1",
    invokedSkillAttachments: [{ name: "phase327-skill", body: "PHASE327_SKILL_BODY", tokenCount: 10 }],
    invokedSkillAttachmentReceipt: { receipt_checksum: "skill-receipt", scope_id: "phase327-scope" },
    planAttachment: { body: "PHASE327_PLAN_BODY", tokenCount: 10, taskId: "task-phase327" },
    planAttachmentReceipt: { receipt_checksum: "plan-receipt", scope_id: "phase327-scope" },
    dynamicContextDeltaAttachment: { body: "PHASE327_DYNAMIC_BODY", tokenCount: 10, scanMode: "full" },
    dynamicContextDeltaReceipt: { receipt_checksum: "dynamic-receipt", scope_id: "phase327-scope" },
  };
}

function fixture() {
  const { compact } = modules();
  const groupId = "phase327-order-group";
  const groupSessionId = "gcs_phase327_order";
  const summaryChecksum = "phase327-summary-checksum";
  const preservedSegment = {
    schema: "ccm-group-preserved-segment-v1",
    version: 2,
    firstPreservedMessageId: "phase327-head",
    lastPreservedMessageId: "phase327-tail",
    headMessageId: "phase327-head",
    anchorMessageId: "phase327-anchor",
    tailMessageId: "phase327-tail",
    summaryMessageId: "phase327-anchor",
    anchorKind: "compact_summary",
    anchorMode: "suffix_preserving",
  };
  const boundary = {
    id: "compact-phase327-order",
    type: "auto",
    preservedSegment,
    post_compact_restore: { summaryChecksum, preservedSegment },
  };
  const plan = reinjectionPlan();
  const receipt = compact.buildGroupPostCompactMessageOrderReceipt({
    groupId,
    groupSessionId,
    boundary,
    summaryChecksum,
    preservedSegment,
    postCompactReinject: plan,
    hookRunId: "hook-run-phase327",
    postHookResults: [{ ok: true, ledgerEntry: { phase: "post", hook_index: 0, boundary_id: boundary.id, summary_checksum: summaryChecksum } }],
  });
  return { groupId, groupSessionId, summaryChecksum, boundary, plan, receipt };
}

function renderBundle(data, receipt = data.receipt) {
  const { memory } = modules();
  return memory.renderGroupMemoryContextBundle({
    group_id: data.groupId,
    group_session_id: data.groupSessionId,
    target_project: "phase327-worker",
    task_query: "PHASE327_TASK_MARKER",
    session_binding: { binding_id: "phase327-binding" },
    memory_policy: { ignored: false },
    compaction: {
      summaryChecksum: data.summaryChecksum,
      boundary: { ...data.boundary, postCompactMessageOrderReceipt: receipt },
      postCompactMessageOrderReceipt: receipt,
      postCompactReinject: data.plan,
      hookLedger: {
        schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
        hookRunId: "hook-run-phase327",
        file: "phase327-hook-ledger.json",
        stats: { pre: { ok: 1, total: 1 }, post: { ok: 1, total: 1 }, failed: 0 },
        recentEntries: [{ phase: "post", ok: true, duration_ms: 3, summary: { keys: ["phase327"] } }],
      },
      resumeProjection: { boundary: { boundaryId: data.boundary.id } },
    },
    group_state: {
      goal: "phase327",
      currentPhase: "verification",
      summaryText: "PHASE327_SUMMARY_MARKER",
      typedMemory: {},
    },
    resume_context: { text: "PHASE327_PRESERVED_MARKER" },
    relevant_historical_evidence: "PHASE327_RECENT_MARKER",
  });
}

function verifyFixture(data) {
  const { compact } = modules();
  const valid = compact.verifyGroupPostCompactMessageOrderReceipt(data.receipt, {
    groupId: data.groupId,
    groupSessionId: data.groupSessionId,
    boundaryId: data.boundary.id,
    summaryChecksum: data.summaryChecksum,
  });
  assert.equal(valid.valid, true, valid.issues.join(","));
  assert.deepEqual(data.receipt.order, ["compact_boundary", "summary", "preserved_messages", "attachments", "post_compact_hooks"]);
  assert.equal(data.receipt.preserved_segment.head_message_id, "phase327-head");
  assert.equal(data.receipt.preserved_segment.anchor_message_id, "phase327-anchor");
  assert.equal(data.receipt.preserved_segment.tail_message_id, "phase327-tail");

  const rendered = renderBundle(data);
  const positions = [
    rendered.indexOf("PHASE327_SUMMARY_MARKER"),
    rendered.indexOf("PHASE327_PRESERVED_MARKER"),
    rendered.indexOf("PHASE327_RECENT_MARKER"),
    rendered.indexOf("PHASE327_SKILL_BODY"),
    rendered.indexOf("PHASE327_PLAN_BODY"),
    rendered.indexOf("PHASE327_DYNAMIC_BODY"),
    rendered.indexOf("压缩 Hook Ledger"),
  ];
  assert.equal(positions.every(position => position >= 0), true, JSON.stringify(positions));
  assert.equal(positions.every((position, index) => index === 0 || positions[index - 1] < position), true, JSON.stringify(positions));
  assert.equal(rendered.lastIndexOf("PHASE327_TASK_MARKER") > positions.at(-1), true);
  assert.match(rendered, /压缩后消息顺序凭证：status=verified/);

  const sibling = compact.verifyGroupPostCompactMessageOrderReceipt(data.receipt, {
    groupId: data.groupId,
    groupSessionId: "gcs_phase327_sibling",
  });
  assert.equal(sibling.valid, false);
  assert.equal(sibling.issues.includes("post_compact_message_order_session_mismatch"), true);

  const tampered = { ...data.receipt, order: [...data.receipt.order].reverse() };
  const tamperedRendered = renderBundle(data, tampered);
  assert.match(tamperedRendered, /压缩后消息顺序凭证：status=fail_closed/);
  assert.equal(tamperedRendered.includes("PHASE327_SKILL_BODY"), false);
  assert.equal(tamperedRendered.includes("PHASE327_PLAN_BODY"), false);
  assert.equal(tamperedRendered.includes("PHASE327_DYNAMIC_BODY"), false);
  assert.equal(tamperedRendered.includes("压缩 Hook Ledger"), false);
  return 14;
}

async function verifyCompactionPaths() {
  const { compact } = modules();
  const makeMessages = (count, prefix) => Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "phase327-worker" : undefined,
    content: `${prefix} message ${index} ${"context ".repeat(120)}`,
  }));
  const verifyStored = (result, groupId, groupSessionId) => {
    const receipt = result.memory?.compaction?.postCompactMessageOrderReceipt;
    assert.equal(receipt?.schema, "ccm-group-post-compact-message-order-receipt-v1");
    assert.equal(result.boundary?.post_compact_restore?.messageOrderReceipt?.receipt_checksum, receipt.receipt_checksum);
    const verified = compact.verifyGroupPostCompactMessageOrderReceipt(receipt, {
      groupId,
      groupSessionId,
      boundaryId: result.boundary?.id,
      summaryChecksum: result.memory?.compaction?.summaryChecksum,
    });
    assert.equal(verified.valid, true, verified.issues.join(","));
  };

  const fullGroupId = "phase327-full";
  const fullSessionId = "gcs_phase327_full";
  const full = await compact.compactGroupConversationMemory({
    groupId: fullGroupId,
    groupSessionId: fullSessionId,
    messages: makeMessages(40, "full"),
    memory: { goal: "phase327 full" },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "phase327-full.json",
    force: true,
  });
  assert.equal(full.compacted, true);
  verifyStored(full, fullGroupId, fullSessionId);

  const partialGroupId = "phase327-partial";
  const partialSessionId = "gcs_phase327_partial";
  const partial = await compact.compactGroupConversationMemory({
    groupId: partialGroupId,
    groupSessionId: partialSessionId,
    messages: makeMessages(40, "partial"),
    memory: { goal: "phase327 partial" },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "phase327-partial.json",
    partialCompact: { direction: "up_to", messageId: "partial-20", reason: "phase327 ordering" },
  });
  assert.equal(partial.boundary?.type, "partial-up-to");
  verifyStored(partial, partialGroupId, partialSessionId);

  const reactiveGroupId = "phase327-reactive";
  const reactiveSessionId = "gcs_phase327_reactive";
  const reactive = await compact.compactGroupConversationMemory({
    groupId: reactiveGroupId,
    groupSessionId: reactiveSessionId,
    messages: makeMessages(130, "reactive"),
    memory: { goal: "phase327 reactive" },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "phase327-reactive.json",
  });
  assert.equal(reactive.compacted, true);
  assert.equal(reactive.boundary?.type, "auto");
  verifyStored(reactive, reactiveGroupId, reactiveSessionId);
  return 13;
}

if (process.argv[2] === "--verify") {
  const data = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  const checks = verifyFixture(data) + await verifyCompactionPaths();
  process.stdout.write(`PHASE327_CHILD_RESULT=${JSON.stringify({ checks })}\n`);
} else {
  const data = fixture();
  const checks = verifyFixture(data) + await verifyCompactionPaths();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase327-"));
  const fixtureFile = path.join(dir, "fixture.json");
  fs.writeFileSync(fixtureFile, JSON.stringify(data), "utf8");
  const child = spawnSync(process.execPath, [file, "--verify", fixtureFile], { cwd: root, encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  const match = child.stdout.match(/PHASE327_CHILD_RESULT=(\{.*\})/);
  assert.ok(match, child.stdout);
  const childResult = JSON.parse(match[1]);
  assert.equal(childResult.checks, checks);
  console.log(`Phase 327 post-compact message order restart self-test: ${checks + 1}/${checks + 1}`);
}
