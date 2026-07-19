import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-global-model-compact-"));
process.env.HOME = root;
process.env.USERPROFILE = root;
process.env.CCM_GLOBAL_AGENT_MEMORY_DIR = path.join(root, "global-agent-memory");

const memoryModule = await import("../ccm-package/dist/agents/global/memory.js");
const {
  compactGlobalAgentSessionWithModel,
  buildGlobalAgentSessionContinuation,
  ingestGlobalAgentConversation,
  loadGlobalAgentMemory,
  loadGlobalAgentTranscript,
} = memoryModule;

const makeMessages = (prefix, count) => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}_${index}`,
  role: index % 2 ? "assistant" : "user",
  content: index === 2
    ? "以后修改生产配置必须先获得明确授权"
    : index === 4
      ? "当前任务仍需完成全局会话压缩验收"
      : `${prefix} 第 ${index} 条会话消息，记录任务状态、决定和下一步。${"全局会话上下文".repeat(180)}`,
  timestamp: new Date(Date.now() + index * 1000).toISOString(),
}));

try {
  const targetId = "session_model_target";
  const siblingId = "session_model_sibling";
  const failureId = "session_model_failure";
  const targetMessages = makeMessages("target", 70);
  const siblingMessages = makeMessages("sibling", 36);
  const failureMessages = makeMessages("failure", 70);
  ingestGlobalAgentConversation({ sessionId: targetId, source: "selftest", messages: targetMessages, compact: false });
  ingestGlobalAgentConversation({ sessionId: siblingId, source: "selftest", messages: siblingMessages, compact: false });

  let promptPayload = null;
  const compacted = await compactGlobalAgentSessionWithModel(targetId, {
    force: true,
    reason: "selftest_model",
    customInstructions: "重点保留授权边界",
    modelCall: async request => {
      promptPayload = JSON.parse(request.user);
      return {
        summary: promptPayload.PRESERVATION_REFERENCE,
        provider: "mock",
        model: "mock-summary-model",
        responseId: "mock-response-1",
        usage: { input_tokens: 1200, output_tokens: 300 },
      };
    },
  });

  assert.equal(compacted.compacted, true);
  assert.equal(compacted.archive.sessionId, targetId);
  assert.equal(compacted.archive.summarySource, "model");
  assert.equal(compacted.session.summarySource, "model");
  assert.equal(compacted.session.model.model, "mock-summary-model");
  assert.match(promptPayload.customInstructions, /授权边界/);
  assert.ok(compacted.session.boundary.preservedMessageCount > 0);
  assert.notEqual(compacted.session.boundary.preservedMessageCount, 24);
  assert.ok(compacted.session.boundary.preservedTokenCount >= 10_000);
  assert.ok(compacted.session.boundary.preservedTokenCount <= 40_000);
  assert.ok(compacted.session.boundary.preservedTextMessageCount >= 5);
  assert.equal(compacted.session.boundary.recent_window.strategy, "cc_session_memory_token_window");
  assert.equal(compacted.session.model.autoCompactTokenLimit, 167_000);
  assert.equal(compacted.session.model.modelContextCapacity.contextWindow, 200_000);
  assert.equal(loadGlobalAgentTranscript(targetId).messages.length, targetMessages.length);
  assert.equal(loadGlobalAgentTranscript(siblingId).messages.length, siblingMessages.length);
  assert.equal(loadGlobalAgentMemory().archives.some(archive => archive.sessionId === siblingId), false);

  ingestGlobalAgentConversation({ sessionId: failureId, source: "selftest", messages: failureMessages, compact: false });
  await assert.rejects(
    compactGlobalAgentSessionWithModel(failureId, {
      force: true,
      reason: "selftest_invalid_model",
      modelCall: async () => ({ summary: { primaryRequest: "不完整摘要", sourceMessageIds: [] } }),
    }),
    /模型摘要校验失败/,
  );
  const afterFailure = loadGlobalAgentMemory();
  assert.equal(afterFailure.archives.some(archive => archive.sessionId === failureId), false);
  assert.equal(afterFailure.sessions.find(session => session.sessionId === failureId)?.summary, undefined);
  assert.equal(loadGlobalAgentTranscript(failureId).messages.length, failureMessages.length);
  assert.equal(afterFailure.compaction.health, "degraded");

  const legacyLowPressureId = "session_legacy_low_pressure";
  const legacyLowPressureMessages = makeMessages("legacy-low", 8);
  ingestGlobalAgentConversation({ sessionId: legacyLowPressureId, source: "selftest", messages: legacyLowPressureMessages, compact: false });
  const memoryFile = path.join(process.env.CCM_GLOBAL_AGENT_MEMORY_DIR, "memory.json");
  const legacyMemory = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
  const legacySession = legacyMemory.sessions.find(session => session.sessionId === legacyLowPressureId);
  legacySession.summary = {
    primaryRequest: "旧版规则摘要仅供审计",
    sourceMessageIds: legacyLowPressureMessages.slice(0, 2).map(message => message.id),
  };
  legacySession.lastCompactedIndex = 1;
  legacySession.compaction = {
    ...(legacySession.compaction || {}),
    schema: "ccm-session-compaction-state-v2",
    scope: "global",
    sessionId: legacyLowPressureId,
    lastCompactedIndex: -1,
    consecutiveFailures: 3,
    lastError: "模型摘要校验失败：source_boundary_mismatch",
  };
  fs.writeFileSync(memoryFile, JSON.stringify(legacyMemory, null, 2));
  let legacyLowPressureModelCalls = 0;
  const legacyLowPressureResult = await compactGlobalAgentSessionWithModel(legacyLowPressureId, {
    reason: "auto_model",
    currentRequest: { role: "user", content: "继续普通对话" },
    modelCall: async () => {
      legacyLowPressureModelCalls += 1;
      throw new Error("低压力会话不应调用压缩模型");
    },
  });
  assert.equal(legacyLowPressureResult.reason, "below_threshold");
  assert.equal(legacyLowPressureResult.legacySummaryIgnored, true);
  assert.equal(legacyLowPressureModelCalls, 0);
  assert.equal(loadGlobalAgentMemory().sessions.find(session => session.sessionId === legacyLowPressureId)?.compaction?.consecutiveFailures, 0);
  const legacyContinuation = buildGlobalAgentSessionContinuation(legacyLowPressureId);
  assert.equal(legacyContinuation.summary, null, "旧本地摘要不得注入模型连续性上下文");
  assert.equal(legacyContinuation.messages.length, legacyLowPressureMessages.length, "旧摘要不可信时必须回退到原始 transcript");

  const chainId = "session_model_chain";
  ingestGlobalAgentConversation({ sessionId: chainId, source: "selftest", messages: makeMessages("chain-s1", 70), compact: false });
  const chainPrompts = [];
  const runChainCompact = async label => compactGlobalAgentSessionWithModel(chainId, {
    force: true,
    reason: label,
    modelCall: async request => {
      const payload = JSON.parse(request.user);
      chainPrompts.push({ label, sessionMemory: request.sessionMemory === true, payload });
      return { summary: payload.PRESERVATION_REFERENCE, provider: "mock", model: "mock-session-memory" };
    },
  });
  const s1 = await runChainCompact("chain-s1");
  assert.equal(s1.session.summarySource, "model");
  assert.notEqual(chainPrompts.at(-1).sessionMemory, true);

  const appendChainMessages = (prefix, offset) => makeMessages(prefix, 34).map((message, index) => ({
    ...message,
    timestamp: new Date(Date.now() + offset + index * 1000).toISOString(),
  }));
  ingestGlobalAgentConversation({ sessionId: chainId, source: "selftest", messages: appendChainMessages("chain-s2", 200_000), compact: false });
  const s2 = await runChainCompact("chain-s2");
  assert.deepEqual(chainPrompts.at(-1).payload.previousSummary, s1.session.summary);
  assert.equal(s2.archive.previousSummaryChecksum, s1.archive.summaryChecksum);
  assert.notEqual(chainPrompts.at(-1).sessionMemory, true);

  ingestGlobalAgentConversation({ sessionId: chainId, source: "selftest", messages: appendChainMessages("chain-s3", 400_000), compact: false });
  const s3 = await runChainCompact("chain-s3");
  assert.deepEqual(chainPrompts.at(-1).payload.previousSummary, s2.session.summary);
  assert.equal(s3.archive.previousSummaryChecksum, s2.archive.summaryChecksum);
  assert.notEqual(chainPrompts.at(-1).sessionMemory, true);
  assert.equal(loadGlobalAgentMemory().archives.filter(archive => archive.sessionId === chainId).length, 3);

  const source = fs.readFileSync(new URL("../backend/agents/global/memory.ts", import.meta.url), "utf8");
  const apiSource = fs.readFileSync(new URL("../backend/modules/global/global-agent-api.ts", import.meta.url), "utf8");
  const slashSource = fs.readFileSync(new URL("../backend/modules/tools/slash-commands.ts", import.meta.url), "utf8");
  const frontendSource = fs.readFileSync(new URL("../frontend/src/components/global/GlobalAgent.vue", import.meta.url), "utf8");
  assert.match(source, /scheduleGlobalAgentModelCompaction\(sessionId\)/);
  assert.match(source, /summarySource:\s*"model"/);
  assert.doesNotMatch(source, /input\.compact === false \? null : compactGlobalAgentSession\(sessionId\)/);
  assert.match(apiSource, /\/api\/global-agent\/memory\/compact/);
  assert.match(apiSource, /loadGlobalAgentHistoryStore\(\)\.sessions/);
  assert.match(slashSource, /name:\s*"compact"[\s\S]*?scopes:\s*\["global",\s*"group"\]/);
  assert.match(frontendSource, /compactSession:\s*async/);
  assert.match(frontendSource, /const sessionId = currentSessionId\.value[\s\S]*session_id:\s*sessionId/);

  console.log(JSON.stringify({
    pass: true,
    checks: 40,
    target_session: targetId,
    sibling_isolated: true,
    invalid_model_fail_closed: true,
    legacy_low_pressure_not_compacted: true,
    legacy_summary_not_injected: true,
    legacy_boundary_circuit_repaired: true,
    session_memory_chain: "S1 -> S2 -> S3",
    real_provider_calls: 0,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
