import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-main-only-global-cc-"));
process.env.HOME = root;
process.env.USERPROFILE = root;
process.env.CCM_GLOBAL_AGENT_MEMORY_DIR = path.join(root, "global-agent-memory");

const repo = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
const read = relative => fs.readFileSync(path.join(repo, relative), "utf8");

try {
  const liveRoutes = read("backend/modules/collaboration/group-live-routes-part-02-part-02.ts");
  const routing = read("backend/modules/collaboration/group-orchestrator-routing.ts");
  const groupStream = read("frontend/src/components/collaboration/useGroupChatStream.js");
  const globalRuntime = read("backend/modules/global/global-agent-agentic-runtime.ts");
  const globalLoop = read("backend/agents/global/global-agent-loop-engine-part-02.ts");

  assert.doesNotMatch(liveRoutes, /\/api\/groups\/broadcast/);
  assert.doesNotMatch(liveRoutes, /target_project_actual|preparedDirectPayload|preparedBroadcastPayload|并行处理中/);
  assert.match(liveRoutes, /processCrossAgents\(/, "主 Agent 的内部项目子 Agent 派发必须保留");
  assert.match(routing, /rejectedDirectTarget/);
  assert.match(routing, /members:\s*mainAgentTarget\s*\?\s*\[coordinator\]\s*:\s*\[\]/);
  assert.doesNotMatch(groupStream, /target_project|targetAgent/);

  assert.match(globalLoop, /runtime\.prepareModelMessages/);
  assert.match(globalRuntime, /provider_payload_preflight/);
  assert.match(globalRuntime, /postCompactPayloadBuilder/);
  assert.match(globalRuntime, /buildGlobalAgentModelMessages\(run, runtime, \{ sessionContinuationOverride: continuation \}\)/);
  assert.match(globalRuntime, /providerCallAllowed !== true/);
  assert.match(globalRuntime, /provider_prompt_too_long/);

  const memoryModule = await import("../ccm-package/dist/agents/global/memory.js");
  const core = await import("../ccm-package/dist/system/session-compaction-core.js");
  const {
    compactGlobalAgentSessionWithModel,
    ingestGlobalAgentConversation,
    loadGlobalAgentMemory,
    loadGlobalAgentTranscript,
  } = memoryModule;
  const { buildModelVisiblePayloadSnapshot } = core;

  const makeMessages = (prefix, count) => Array.from({ length: count }, (_, index) => ({
    id: `${prefix}_${index}`,
    role: index % 2 ? "assistant" : "user",
    content: index === 2
      ? "生产写入必须保留用户授权边界"
      : `${prefix} ${index}：保存需求、决策、验证和未完成事项。${"完整会话原文".repeat(220)}`,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
  }));

  const successSession = "global_exact_payload_success";
  const successMessages = makeMessages("success", 72);
  ingestGlobalAgentConversation({ sessionId: successSession, source: "selftest", messages: successMessages, compact: false });
  let postBuilderCalled = 0;
  const triggerPayload = buildModelVisiblePayloadSnapshot({
    scope: "global",
    sessionId: successSession,
    system: [{ role: "system", content: "真实全局系统提示" }],
    recentMessages: successMessages,
  });
  const compacted = await compactGlobalAgentSessionWithModel(successSession, {
    force: true,
    reason: "exact_provider_payload_selftest",
    modelVisiblePayload: triggerPayload,
    modelCall: async request => ({ summary: JSON.parse(request.user).PRESERVATION_REFERENCE, provider: "mock", model: "mock-global" }),
    postCompactPayloadBuilder: async ({ summary, preservedMessages }) => {
      postBuilderCalled += 1;
      const messages = [
        { role: "system", content: "真实全局系统提示" },
        { role: "user", content: `正式摘要：${JSON.stringify(summary)}` },
        ...preservedMessages.map(message => ({ role: message.role, content: message.content })),
      ];
      return { messages, modelVisiblePayload: buildModelVisiblePayloadSnapshot({ scope: "global", sessionId: successSession, system: messages.slice(0, 1), recentMessages: messages.slice(1) }) };
    },
  });
  assert.equal(compacted.compacted, true);
  assert.equal(postBuilderCalled, 1);
  assert.ok(Array.isArray(compacted.preparedModelMessages));
  assert.match(JSON.stringify(compacted.preparedModelMessages), /正式摘要/);
  assert.equal(loadGlobalAgentTranscript(successSession).messages.length, successMessages.length, "原始 transcript 不得删除");

  const rejectedSession = "global_exact_payload_rejected";
  const rejectedMessages = makeMessages("rejected", 72);
  ingestGlobalAgentConversation({ sessionId: rejectedSession, source: "selftest", messages: rejectedMessages, compact: false });
  await assert.rejects(
    compactGlobalAgentSessionWithModel(rejectedSession, {
      force: true,
      reason: "post_gate_reject_selftest",
      modelCall: async request => ({ summary: JSON.parse(request.user).PRESERVATION_REFERENCE, provider: "mock", model: "mock-global" }),
      postCompactPayloadBuilder: async () => buildModelVisiblePayloadSnapshot({
        scope: "global",
        sessionId: rejectedSession,
        system: "x".repeat(700_000),
      }),
    }),
    /压缩后仍超过阈值/,
  );
  assert.equal(loadGlobalAgentMemory().archives.some(archive => archive.sessionId === rejectedSession), false, "后置门禁失败不得提交压缩边界");
  assert.equal(loadGlobalAgentTranscript(rejectedSession).messages.length, rejectedMessages.length);

  console.log(JSON.stringify({
    pass: true,
    checks: 22,
    group_user_entry: "main_agent_only",
    global_provider_context: "exact_payload_preflight_and_transactional_rebuild",
    real_provider_calls: 0,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
