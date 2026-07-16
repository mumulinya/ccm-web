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

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    boundary: require(dist("modules", "collaboration", "group-memory-boundary-journal.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
  };
}

function sourceMessages(prefix) {
  return Array.from({ length: 40 }, (_, index) => ({
    id: `${prefix}-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "phase329-worker" : undefined,
    content: `${prefix} ${index} PHASE329_REQUEST_BODY_SENTINEL ${"usage context ".repeat(100)}`,
  }));
}

const summary = {
  primaryRequest: "continue phase329",
  userMessages: ["preserve provider usage evidence"],
  keyConcepts: ["compaction usage"],
  filesAndCode: [],
  errorsAndFixes: [],
  decisions: [],
  completedWork: [],
  pendingTasks: [],
  currentWork: "verify usage",
  nextStep: "run tests",
  participantState: [],
  taskStates: [],
};

async function startProvider() {
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      requests.push({ url: request.url, body });
      response.setHeader("content-type", "application/json");
      if (request.url.includes("/failed/")) {
        response.statusCode = 500;
        response.end(JSON.stringify({ error: { message: "phase329 simulated failure" } }));
        return;
      }
      if (request.url.includes("/anthropic/")) {
        response.end(JSON.stringify({
          id: "msg-phase329-anthropic",
          model: "phase329-anthropic",
          stop_reason: "end_turn",
          usage: { input_tokens: 100, cache_creation_input_tokens: 20, cache_read_input_tokens: 300, output_tokens: 40 },
          content: [{ type: "text", text: JSON.stringify(summary) }],
        }));
        return;
      }
      const includeUsage = !request.url.includes("/unreported/");
      response.end(JSON.stringify({
        id: includeUsage ? "chatcmpl-phase329-openai" : "chatcmpl-phase329-unreported",
        model: includeUsage ? "phase329-openai" : "phase329-unreported",
        ...(includeUsage ? { usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 } } : {}),
        choices: [{ finish_reason: "stop", message: { content: JSON.stringify(summary) } }],
      }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    server,
    requests,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function runCompact(compact, baseUrl, kind) {
  const groupId = `phase329-${kind}-group`;
  const groupSessionId = `gcs_phase329_${kind}`;
  const messages = sourceMessages(kind);
  const anthropic = kind === "anthropic";
  const result = await compact.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages,
    memory: { goal: `phase329 ${kind}` },
    transcriptPath: `${kind}.json`,
    force: true,
    config: {
      enabled: true,
      apiUrl: `${baseUrl}/${kind}/v1`,
      apiKey: "phase329-test-key",
      model: `phase329-${kind}`,
      format: anthropic ? "anthropic-compatible" : "openai-compatible",
      memoryCompactionUseModel: true,
      minKeepMessages: 3,
      minKeepTokens: 200,
      maxKeepTokens: 1_000,
    },
  });
  return { groupId, groupSessionId, messages, result };
}

function renderUsage(memoryModule, row, usage) {
  return memoryModule.renderGroupMemoryContextBundle({
    group_id: row.groupId,
    group_session_id: row.groupSessionId,
    target_project: "phase329-worker",
    task_query: "verify phase329 usage",
    session_binding: { binding_id: "phase329-binding" },
    memory_policy: { ignored: false },
    compaction: {
      boundary: { ...row.result.memory.compactBoundary, compactionUsage: usage },
      compactionUsage: usage,
    },
    group_state: { goal: "phase329", currentPhase: "usage", typedMemory: {} },
  });
}

function restartChecks(data) {
  const { compact, memory } = modules();
  const usage = data.result.memory.compaction.compactionUsage;
  const verification = compact.verifyGroupCompactionModelUsageReceipt(usage, {
    groupId: data.groupId,
    groupSessionId: data.groupSessionId,
    provider: "openai",
    model: "phase329-openai",
  });
  const rendered = renderUsage(memory, data, usage);
  const checks = {
    receiptSurvivesRestart: verification.valid === true,
    usageChecksumSurvivesRestart: usage.usage_checksum === data.result.memory.compactBoundary.compactionUsage.usage_checksum,
    childContextSurvivesRestart: rendered.includes("Compaction model usage：status=reported") && rendered.includes("total=150"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks));
  return checks;
}

if (process.argv[2] === "--verify") {
  const data = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  const checks = restartChecks(data);
  process.stdout.write(`PHASE329_CHILD_RESULT=${JSON.stringify({ count: Object.keys(checks).length })}\n`);
} else {
  const provider = await startProvider();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase329-"));
  try {
    const { compact, boundary, memory } = modules();
    const openai = await runCompact(compact, provider.baseUrl, "openai");
    const anthropic = await runCompact(compact, provider.baseUrl, "anthropic");
    const unreported = await runCompact(compact, provider.baseUrl, "unreported");
    const failed = await runCompact(compact, provider.baseUrl, "failed");
    const openaiUsage = openai.result.memory.compaction.compactionUsage;
    const anthropicUsage = anthropic.result.memory.compaction.compactionUsage;
    const unreportedUsage = unreported.result.memory.compaction.compactionUsage;
    const failedUsage = failed.result.memory.compaction.compactionUsage;

    const cachedOpenAi = compact.buildGroupCompactionModelUsageReceipt({
      groupId: openai.groupId,
      groupSessionId: openai.groupSessionId,
      provider: "openai",
      model: "phase329-cached-openai",
      usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150, prompt_tokens_details: { cached_tokens: 80 } },
      requestAudit: { estimatedInputTokens: 100 },
    });
    const checks = {
      openAiUsageReported: openaiUsage.status === "reported" && openaiUsage.reported === true,
      openAiCountsNormalized: openaiUsage.input_tokens === 120 && openaiUsage.output_tokens === 30 && openaiUsage.accounted_total_tokens === 150,
      openAiReceiptValid: compact.verifyGroupCompactionModelUsageReceipt(openaiUsage, {
        groupId: openai.groupId, groupSessionId: openai.groupSessionId, provider: "openai", model: "phase329-openai",
      }).valid,
      anthropicCacheCountsPreserved: anthropicUsage.input_tokens === 100
        && anthropicUsage.cache_creation_input_tokens === 20
        && anthropicUsage.cache_read_input_tokens === 300
        && anthropicUsage.output_tokens === 40
        && anthropicUsage.accounted_total_tokens === 460,
      anthropicReceiptValid: compact.verifyGroupCompactionModelUsageReceipt(anthropicUsage, {
        groupId: anthropic.groupId, groupSessionId: anthropic.groupSessionId, provider: "anthropic", model: "phase329-anthropic",
      }).valid,
      cachedOpenAiDoesNotDoubleCount: cachedOpenAi.cache_read_input_tokens === 80
        && cachedOpenAi.cache_read_included_in_input === true
        && cachedOpenAi.accounted_total_tokens === 150,
      unreportedIsNotFakeZeroSuccess: unreportedUsage.status === "unreported"
        && unreportedUsage.reported === false
        && unreportedUsage.accounted_total_tokens === 0
        && unreportedUsage.estimated_input_tokens > 0,
      failedCallHasFailureReceipt: failedUsage.status === "failed"
        && failedUsage.reported === false
        && failed.result.memory.compaction.summarySource === "structured",
      usageReceiptIsBodyFree: openaiUsage.body_free === true
        && !JSON.stringify(openaiUsage).includes("PHASE329_REQUEST_BODY_SENTINEL")
        && !JSON.stringify(openaiUsage).includes("phase329-test-key"),
      requestAuditAndActualUsageRemainSeparate: openai.result.memory.compaction.modelRequestAudit.estimatedInputTokens > 0
        && openaiUsage.estimated_input_tokens === openai.result.memory.compaction.modelRequestAudit.estimatedInputTokens,
      compactionCallAndPostCompactPayloadRemainSeparate: openaiUsage.accounted_total_tokens === 150
        && openai.result.memory.compaction.truePostCompactPayloadBudget.true_post_compact_token_count > 0
        && openai.result.memory.compaction.truePostCompactPayloadBudget.payload_checksum,
      usageStoredEverywhere: openai.result.memory.compactBoundary.compactionUsage.usage_checksum === openaiUsage.usage_checksum
        && openai.result.memory.compactBoundary.compactMetadata.compactionUsage.usage_checksum === openaiUsage.usage_checksum
        && openai.result.memory.compactBoundary.post_compact_restore.compactionUsage.usage_checksum === openaiUsage.usage_checksum
        && openai.result.memory.messageCompression.compactionUsage.usage_checksum === openaiUsage.usage_checksum,
      siblingSessionRejected: compact.verifyGroupCompactionModelUsageReceipt(openaiUsage, {
        groupId: openai.groupId, groupSessionId: "gcs_phase329_sibling",
      }).valid === false,
      rawTranscriptUntouched: openai.messages.every(message => message.content.includes("PHASE329_REQUEST_BODY_SENTINEL")),
      allProviderPathsCalled: ["/openai/", "/anthropic/", "/unreported/", "/failed/"].every(marker => provider.requests.some(row => row.url.includes(marker))),
    };

    boundary.commitGroupMemoryCompactBoundary({
      groupId: openai.groupId,
      sessionId: openai.groupSessionId,
      messages: openai.messages,
      memory: openai.result.memory,
      transcriptPath: "phase329-openai.json",
      rootDir: tempRoot,
    });
    const projection = boundary.buildGroupMemoryResumeProjection({
      groupId: openai.groupId,
      sessionId: openai.groupSessionId,
      messages: openai.messages,
      memory: openai.result.memory,
      rootDir: tempRoot,
    });
    checks.boundaryJournalAcceptsUsage = projection.verified === true
      && projection.boundary.compactionUsageChecksum === openaiUsage.usage_checksum;

    const tamperedMemory = JSON.parse(JSON.stringify(openai.result.memory));
    tamperedMemory.compactBoundary.compactionUsage.input_tokens = 999;
    tamperedMemory.compactBoundary.compactMetadata.compactionUsage.input_tokens = 999;
    tamperedMemory.compactBoundary.post_compact_restore.compactionUsage.input_tokens = 999;
    const tamperedProjection = boundary.buildGroupMemoryResumeProjection({
      groupId: openai.groupId,
      sessionId: openai.groupSessionId,
      messages: openai.messages,
      memory: tamperedMemory,
      rootDir: tempRoot,
    });
    checks.usageTamperFailsClosed = tamperedProjection.status === "fail_closed_rebuild_required"
      && String(tamperedProjection.reason).includes("compaction_usage");

    const rendered = renderUsage(memory, openai, openaiUsage);
    checks.childContextShowsVerifiedUsage = rendered.includes("Compaction model usage：status=reported")
      && rendered.includes("input=120") && rendered.includes("total=150");
    const tamperedUsage = { ...openaiUsage, input_tokens: 999 };
    const tamperedRendered = renderUsage(memory, openai, tamperedUsage);
    checks.childContextRejectsTamperedUsage = tamperedRendered.includes("Compaction model usage：status=fail_closed")
      && tamperedRendered.includes("compaction_model_usage_checksum_invalid");

    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    const restart = restartChecks(openai);
    const fixtureFile = path.join(tempRoot, "restart-fixture.json");
    fs.writeFileSync(fixtureFile, JSON.stringify(openai), "utf8");
    const child = spawnSync(process.execPath, [file, "--verify", fixtureFile], { cwd: root, encoding: "utf8" });
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
    const match = child.stdout.match(/PHASE329_CHILD_RESULT=(\{.*\})/);
    assert.ok(match, child.stdout);
    assert.equal(JSON.parse(match[1]).count, Object.keys(restart).length);
    const count = Object.keys(checks).length + Object.keys(restart).length + 1;
    console.log(`Phase 329 compaction model usage restart self-test: ${count}/${count}`);
  } finally {
    await provider.close();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
