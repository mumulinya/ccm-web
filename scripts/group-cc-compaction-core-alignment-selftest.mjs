import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-cc-compact-alignment-"));
process.env.HOME = tempHome;
process.env.USERPROFILE = tempHome;

const require = createRequire(import.meta.url);
const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
const cache = require(dist("modules", "collaboration", "group-prompt-cache-break-detection.js"));
const compact = require(dist("modules", "collaboration", "group-compaction-engine.js"));
const receipts = require(dist("modules", "collaboration", "group-compaction-receipts.js"));
const projections = require(dist("modules", "collaboration", "group-compaction-projections.js"));

const groupId = "cc-compact-alignment";
const sessionId = "gcs_cc_compact_alignment";
const siblingSessionId = "gcs_cc_compact_alignment_sibling";
const model = "cc-alignment-model";

try {
  const recorded = cache.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: sessionId,
    source: "group_main_planning",
    provider: "openai",
    model,
    estimatedContextTokens: 7_000,
    usage: {
      directInputTokens: 6_000,
      cacheCreationInputTokens: 2_000,
      cacheReadInputTokens: 1_000,
      outputTokens: 500,
    },
  });
  assert.equal(recorded.recorded, true);
  const baseline = cache.readGroupMainContextUsageBaseline(groupId, sessionId, { provider: "openai", model });
  assert.equal(baseline.valid, true);
  assert.equal(baseline.event.provider_observed_context_tokens, 9_500);
  const calibrated = compact.calculateGroupProviderCalibratedContextTokens(20_000, baseline);
  assert.deepEqual(calibrated, {
    estimatedActiveTokens: 20_000,
    providerObservedCorrection: 2_500,
    activeTokens: 22_500,
  });
  assert.equal(cache.readGroupMainContextUsageBaseline(groupId, siblingSessionId).valid, false);

  const rounds = [
    { id: "u1", role: "user", content: "first" },
    { id: "a1", role: "assistant", content: "first reply" },
    { id: "u2", role: "user", content: "second" },
    { id: "a2", role: "assistant", content: "second reply" },
    { id: "u3", role: "user", content: "third" },
    { id: "a3", role: "assistant", content: "third reply" },
  ];
  const truncated = compact.truncateGroupCompactionHeadByApiRound(rounds);
  assert.equal(truncated.droppedRoundCount, 1);
  assert.equal(truncated.messages[0].id, "u2");
  assert.equal(receipts.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS, 20_000);

  const oversizedFallback = projections.createEmptyConversationSummary();
  oversizedFallback.userMessages = Array.from({ length: 200 }, (_, index) => `requirement-${index}-${"x".repeat(400)}`);
  const budgetedRequest = compact.buildGroupCompactionModelRequest(rounds, {}, oversizedFallback, {
    modelContextWindow: 42_000,
    modelMaxOutputTokens: 20_000,
    memoryCompactionMaxInputTokens: 8_000,
    customInstructions: "重点保留数据库迁移风险",
  });
  assert.equal(budgetedRequest.maxOutputTokens, 20_000);
  assert.equal(budgetedRequest.audit.customInstructionsApplied, true);
  assert.match(budgetedRequest.user, /重点保留数据库迁移风险/);
  assert.equal(budgetedRequest.audit.withinBudget, true);

  let requests = 0;
  const server = http.createServer((req, res) => {
    requests += 1;
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      if (requests === 1) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: "context_length_exceeded", message: "prompt too long" } }));
        return;
      }
      const summary = projections.createEmptyConversationSummary();
      summary.primaryRequest = "keep the latest complete API rounds";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: "mock-compact-response",
        model,
        usage: { prompt_tokens: 120, completion_tokens: 20 },
        choices: [{ finish_reason: "stop", message: { content: JSON.stringify(summary) } }],
      }));
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    const result = await compact.summarizeWithModel(rounds, {}, projections.createEmptyConversationSummary(), {
      enabled: true,
      apiUrl: `http://127.0.0.1:${address.port}`,
      apiKey: "mock-only",
      model,
      format: "openai-compatible",
      groupId,
      groupSessionId: sessionId,
    });
    assert.equal(requests, 2);
    assert.equal(result.requestAudit.ptlRetryAttempts, 1);
    assert.equal(result.summary.primaryRequest, "keep the latest complete API rounds");
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  cache.notifyGroupPromptCacheCompaction({
    groupId,
    groupSessionId: sessionId,
    boundaryId: "boundary-1",
    resetReceiptChecksum: "reset-checksum",
    generation: 1,
  });
  const stale = cache.readGroupMainContextUsageBaseline(groupId, sessionId, { provider: "openai", model });
  assert.equal(stale.valid, false);
  assert.ok(stale.issues.includes("usage_baseline_missing") || stale.issues.includes("usage_post_compaction_reset_pending"));

  console.log(JSON.stringify({
    passed: 18,
    providerObservedTokens: baseline.event.provider_observed_context_tokens,
    correction: calibrated.providerObservedCorrection,
    ptlRetries: 1,
    maxSummaryTokens: receipts.GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS,
    customInstructions: true,
    paidProviderCalls: 0,
  }));
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
