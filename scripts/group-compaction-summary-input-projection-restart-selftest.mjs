import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE320_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function fixtureMessages(groupSessionId) {
  const binary = Buffer.from("PHASE320_BINARY_SENTINEL ".repeat(500)).toString("base64");
  const messages = [
    {
      id: "phase320-media-user",
      group_session_id: groupSessionId,
      role: "user",
      target: "all",
      timestamp: "2026-07-15T00:00:00.000Z",
      content: [
        { type: "text", text: "Keep the visible media requirement and continue implementation." },
        { type: "image", source: { type: "base64", media_type: "image/png", data: binary } },
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: binary } },
      ],
    },
    {
      id: "phase320-tool-result",
      group_session_id: groupSessionId,
      role: "user",
      target: "group-main",
      timestamp: "2026-07-15T00:01:00.000Z",
      content: [{
        type: "tool_result",
        tool_use_id: "phase320-tool",
        content: [
          { type: "text", text: "Tool result visible text must remain." },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: binary } },
        ],
      }],
    },
    {
      id: "phase320-tool-use",
      group_session_id: groupSessionId,
      role: "assistant",
      agent: "group-main",
      timestamp: "2026-07-15T00:02:00.000Z",
      content: [{ type: "tool_use", id: "phase320-tool", name: "Read", input: { data: binary, path: "src/phase320.ts" } }],
    },
    {
      id: "phase320-skill-listing",
      group_session_id: groupSessionId,
      type: "attachment",
      timestamp: "2026-07-15T00:03:00.000Z",
      attachment: { type: "skill_listing", content: `PHASE320_STALE_SKILL_LISTING ${binary}` },
    },
  ];
  for (let index = 0; index < 28; index += 1) {
    messages.push({
      id: `phase320-text-${index}`,
      group_session_id: groupSessionId,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "all" : undefined,
      agent: index % 2 === 0 ? undefined : "group-main",
      timestamp: new Date(Date.parse("2026-07-15T00:04:00.000Z") + index * 60_000).toISOString(),
      content: `PHASE320_VISIBLE_TEXT_${index} continue the exact task with decisions and files src/phase320-${index}.ts ${"context ".repeat(80)}`,
    });
  }
  return { messages, binary };
}

async function createCaptureServer() {
  const captured = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      captured.push({ url: request.url, body });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              primaryRequest: "Continue phase320 implementation.",
              userMessages: [],
              keyConcepts: [],
              filesAndCode: [],
              errorsAndFixes: [],
              decisions: [],
              completedWork: [],
              pendingTasks: [],
              currentWork: "Continue phase320 implementation.",
              nextStep: "Verify summary input projection.",
              participantState: [],
              taskStates: [],
            }),
          },
        }],
      }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, captured, port: server.address().port };
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase320-summary-input-${nonce}`;
  const groupSessionId = `gcs_phase320_${nonce}`;
  const siblingSessionId = `gcs_phase320_sibling_${nonce}`;
  const { messages, binary } = fixtureMessages(groupSessionId);
  const siblingFixture = fixtureMessages(siblingSessionId);
  const originalJson = JSON.stringify(messages);
  const fallback = compact.buildDeterministicConversationSummary(messages, {}, {});
  const direct = compact.buildGroupCompactionSummaryInputProjection(messages, {
    previousSummary: {},
    fallbackSummary: fallback,
    rebuildFallbackFromProjectedMessages: true,
    memory: {},
  });
  const directText = JSON.stringify({ messages: direct.messages, fallback: direct.fallbackSummary });
  const directVerification = compact.verifyGroupCompactionSummaryInputProjectionReceipt(direct.receipt, { sourceMessageCount: messages.length });
  const tampered = { ...direct.receipt, estimated_tokens_saved: direct.receipt.estimated_tokens_saved + 1 };
  const request = compact.buildGroupCompactionModelRequest(messages, {}, fallback, {
    modelContextWindow: 200000,
    memoryCompactionMaxInputTokens: 120000,
  });

  storage.saveGroupMessages(groupId, messages, groupSessionId);
  storage.saveGroupMessages(groupId, siblingFixture.messages, siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase320 summary input projection", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase320 sibling isolation", decisions: [] }, siblingSessionId);

  const capture = await createCaptureServer();
  let result;
  try {
    result = await memory.runGroupMemoryAutoCompactionNow(groupId, {
      sessionId: groupSessionId,
      force: true,
      reason: "phase320_real_model_request",
      config: {
        enabled: true,
        format: "openai-compatible",
        apiUrl: `http://127.0.0.1:${capture.port}/v1`,
        apiKey: "phase320-local-test-key",
        model: "phase320-local-model",
        timeoutMs: 30000,
        memoryCompactionUseModel: true,
        modelContextWindow: 200000,
        modelAutoCompactTokenLimit: 167000,
        memoryCompactionMaxInputTokens: 120000,
      },
    });
  } finally {
    await new Promise(resolve => capture.server.close(resolve));
  }
  const capturedBody = capture.captured.map(row => row.body).join("\n");
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const persistedReceipt = persisted.compaction?.modelRequestAudit?.summaryInputProjection || null;
  const rawAfter = storage.getGroupMessages(groupId, groupSessionId);
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.compactionSummaryInputProjection || {};
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const binaryPrefix = binary.slice(0, 300);

  const checks = {
    directImagesAndDocumentsStripped: direct.receipt.image_blocks_stripped === 2
      && direct.receipt.document_blocks_stripped === 1
      && directText.includes(compact.GROUP_COMPACTION_SUMMARY_IMAGE_MARKER)
      && directText.includes(compact.GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER),
    nestedToolMediaStripped: directText.includes("Tool result visible text must remain.")
      && !directText.includes(binaryPrefix),
    reinjectedSkillAttachmentExcluded: direct.receipt.reinjected_attachments_stripped === 1
      && !directText.includes("PHASE320_STALE_SKILL_LISTING"),
    binaryToolInputStripped: direct.receipt.binary_segments_stripped >= 1
      && directText.includes(compact.GROUP_COMPACTION_SUMMARY_BINARY_MARKER),
    visibleTextPreserved: directText.includes("Keep the visible media requirement")
      && directText.includes("PHASE320_VISIBLE_TEXT_0"),
    receiptValidBodyFreeAndUseful: directVerification.valid === true
      && direct.receipt.raw_transcript_preserved === true
      && direct.receipt.estimated_tokens_saved > 1000
      && !JSON.stringify(direct.receipt).includes("PHASE320_BINARY_SENTINEL"),
    tamperedReceiptRejected: compact.verifyGroupCompactionSummaryInputProjectionReceipt(tampered).valid === false,
    requestBuilderUsesProjection: request.user.includes(compact.GROUP_COMPACTION_SUMMARY_IMAGE_MARKER)
      && request.user.includes(compact.GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER)
      && !request.user.includes(binaryPrefix)
      && compact.verifyGroupCompactionSummaryInputProjectionReceipt(request.audit.summaryInputProjection, { sourceMessageCount: messages.length }).valid === true,
    realModelRequestWasSent: capture.captured.length === 1
      && capture.captured[0].url.endsWith("/v1/chat/completions"),
    realModelBodyUsesSanitizedInput: capturedBody.includes(compact.GROUP_COMPACTION_SUMMARY_IMAGE_MARKER)
      && capturedBody.includes(compact.GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER)
      && capturedBody.includes("Keep the visible media requirement")
      && !capturedBody.includes(binaryPrefix)
      && !capturedBody.includes("PHASE320_STALE_SKILL_LISTING"),
    productionCompactionCompleted: result?.success === true && result?.compacted === true,
    persistedAuditValid: persistedReceipt
      && compact.verifyGroupCompactionSummaryInputProjectionReceipt(persistedReceipt).valid === true,
    rawTranscriptUntouched: JSON.stringify(rawAfter) === originalJson,
    siblingSessionUnaffected: !siblingMemory.compaction?.modelRequestAudit?.summaryInputProjection,
    memoryCenterShowsProjection: centerProjection.status === "applied"
      && centerProjection.receiptValid === true
      && centerProjection.groupSessionId === groupSessionId,
    memoryCenterPanelPresent: uiSource.includes("Compaction Summary Input Projection")
      && uiSource.includes("compactionSummaryInputProjectionCards"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, siblingSessionId, originalJson, persistedReceipt }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const receipt = persisted.compaction?.modelRequestAudit?.summaryInputProjection || null;
  const detail = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const centerProjection = detail.postCompactUsage?.compactionSummaryInputProjection || {};
  const sibling = memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId);
  const rawAfterRestart = storage.getGroupMessages(fixture.groupId, fixture.groupSessionId);
  const checks = {
    receiptSurvivesRestart: receipt
      && compact.verifyGroupCompactionSummaryInputProjectionReceipt(receipt).valid === true,
    countsSurviveRestart: receipt?.image_blocks_stripped === fixture.persistedReceipt?.image_blocks_stripped
      && receipt?.document_blocks_stripped === fixture.persistedReceipt?.document_blocks_stripped
      && receipt?.binary_segments_stripped === fixture.persistedReceipt?.binary_segments_stripped
      && receipt?.reinjected_attachments_stripped === fixture.persistedReceipt?.reinjected_attachments_stripped
      && receipt?.receipt_checksum === fixture.persistedReceipt?.receipt_checksum,
    memoryCenterSurvivesRestart: centerProjection.status === "applied" && centerProjection.receiptValid === true,
    rawStillUntouchedAfterRestart: JSON.stringify(rawAfterRestart) === fixture.originalJson,
    siblingStillIndependent: !sibling.compaction?.modelRequestAudit?.summaryInputProjection,
  };
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 180000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const line = String(result.stdout || "").split(/\r?\n/).find(row => row.startsWith(resultPrefix));
  assert.ok(line, `missing ${resultPrefix}: ${result.stdout}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

const mode = process.argv[2] || "parent";
if (mode === "child-create") {
  await childCreate(process.argv[3]);
} else if (mode === "child-restart") {
  childRestart(process.argv[3]);
} else {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase320-summary-input-"));
  const fixtureFile = path.join(tempHome, "phase320-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase320-compaction-summary-input-projection-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
