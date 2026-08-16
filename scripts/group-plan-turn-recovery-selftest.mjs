import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const require = createRequire(import.meta.url);
const dist = (...parts) => require(path.join(root, "ccm-package", "dist", ...parts));

const helpers = await import("../frontend/src/components/collaboration/groupChatHelpers.js");
const messaging = await import("../frontend/src/components/collaboration/useGroupChatMessaging.js");
const executionProjection = await import("../frontend/src/utils/agentExecutionEvents.js");
assert.equal(helpers.isGroupModelRecoveryContinuePhrase("继续"), true);
assert.equal(helpers.isGroupModelRecoveryContinuePhrase("retry"), true);
assert.equal(helpers.isGroupModelRecoveryContinuePhrase("继续加一个功能"), false);
const failure = helpers.findUnrecoveredGroupModelFailure([
  { id: "u1", role: "user", content: "加功能" },
  { id: "a1", role: "assistant", runtime: "llm-error", execution_anchor_message_id: "u1", recovery: { state: "interrupted" }, content: "失败" },
]);
assert.equal(failure?.id, "a1");
assert.equal(helpers.groupModelRecoveryAnchorId(failure), "u1");
assert.equal(helpers.shouldShowOrchestrationPlan({
  recovery: { state: "retrying" },
  assignments: [{ project: "web" }],
}), false);
assert.match(helpers.getVisibleGroupMessageContent({
  role: "assistant",
  runtime: "llm-error",
  providerFailure: { userSummary: "只读检查已完成，但没能生成计划。", userGuidance: "发送继续或点立即重试，会接着刚才的检查继续。" },
  content: "大模型暂时不可用，本次请求未完成。",
}), /只读检查已完成/);
assert.match(helpers.getVisibleGroupMessageContent({
  role: "assistant",
  runtime: "llm-error",
  providerFailure: { userSummary: "大模型暂时不可用，本次请求未完成。", userGuidance: "请检查模型配置或网络后重试。" },
  content: "大模型暂时不可用，本次请求未完成。",
}, "本次请求未完成，请重试。", { toolCount: 9 }), /只读检查已完成/);
assert.match(helpers.getVisibleGroupMessageContent({
  role: "assistant",
  runtime: "llm-error",
  providerFailure: { userSummary: "大模型暂时不可用，本次请求未完成。" },
}), /大模型暂时不可用/);
assert.match(helpers.getVisibleGroupMessageContent({
  role: "assistant",
  runtime: "llm-error",
  providerFailure: {
    code: "CCM_MODEL_RETRY_EXHAUSTED",
    userSummary: "大模型暂时不可用，本次请求未完成。",
    userGuidance: "请检查模型配置或网络后重试。",
    safeSummary: "OpenAI-compatible JSON model call失败：已完成 2 次尝试，总耗时 4630ms；最后错误：模型返回空响应",
  },
  content: "大模型暂时不可用，本次请求未完成。",
}), /没有给出可用回复/);
assert.equal(helpers.isGroupModelFailureMessage({ runtime: "llm-error" }), true);

const anchor = "u-plan";
const oldFailure = {
  id: "a-old",
  role: "assistant",
  runtime: "llm-error",
  execution_anchor_message_id: anchor,
  executionAttempt: 1,
  timestamp: "2026-08-15T08:30:11.000Z",
};
const newFailure = {
  id: "a-new",
  role: "assistant",
  runtime: "llm-error",
  execution_anchor_message_id: anchor,
  executionAttempt: 2,
  timestamp: "2026-08-15T08:51:35.000Z",
};
const optimistic = {
  id: "group-reply:u-continue",
  role: "assistant",
  streaming: true,
  __groupTransient: true,
  execution_anchor_message_id: anchor,
};
assert.equal(messaging.canMergeGroupMessage(oldFailure, newFailure), false, "不同 attempt 不能只按 anchor 合并");
assert.equal(messaging.canMergeGroupMessage(optimistic, newFailure), true, "权威回复可以收口本地临时信封");
assert.equal(messaging.shouldIgnoreStaleGroupMessage(oldFailure, newFailure), true, "迟到旧 attempt 必须被丢弃");
assert.equal(messaging.shouldIgnoreStaleGroupMessage(newFailure, oldFailure), false, "新 attempt 不能被旧 attempt 反向覆盖");

const sharedAnchor = "u-shared-anchor";
const recoveryMessages = [
  { id: sharedAnchor, role: "user", timestamp: "2026-08-15T09:00:00.000Z", content: "分析项目" },
  { id: "a-attempt-1", role: "assistant", timestamp: "2026-08-15T09:00:05.100Z", runtime: "llm-error", execution_anchor_message_id: sharedAnchor, recovery: { state: "interrupted", attempt: 1 }, content: "第一次未完成" },
  { id: "u-continue", role: "user", timestamp: "2026-08-15T09:00:10.000Z", execution_anchor_message_id: sharedAnchor, content: "继续" },
  { id: "a-attempt-2", role: "assistant", timestamp: "2026-08-15T09:00:15.100Z", runtime: "llm-error", execution_anchor_message_id: sharedAnchor, recovery: { state: "interrupted", attempt: 2 }, content: "第二次未完成" },
];
const recoveryEvents = [
  { eventId: "group-turn:" + sharedAnchor + ":attempt:1:turn-attempt-1:started", sequence: 1, eventType: "turn_started", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:01.000Z", display: { status: "running" } },
  { eventId: "tool-attempt-1-start", sequence: 2, eventType: "tool_started", toolCallId: "tool-attempt-1", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:02.000Z", display: { status: "running" } },
  { eventId: "tool-attempt-1-done", sequence: 3, eventType: "tool_completed", toolCallId: "tool-attempt-1", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:03.000Z", display: { status: "success" } },
  { eventId: "group-turn:" + sharedAnchor + ":attempt:1:turn-attempt-1:result", sequence: 4, eventType: "result", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:05.000Z", display: { status: "failed" } },
  { eventId: "group-turn:" + sharedAnchor + ":attempt:2:turn-attempt-2:started", sequence: 5, eventType: "turn_started", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:11.000Z", display: { status: "running" } },
  // This mirrors old ledgers: tool events have no recovery attempt fields and
  // executionStage.attempt may still describe project attempt 1.
  { eventId: "tool-attempt-2-start", sequence: 6, eventType: "tool_started", toolCallId: "tool-attempt-2", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:12.000Z", display: { status: "running" }, detail: { executionStage: { attempt: 1 } } },
  { eventId: "tool-attempt-2-done", sequence: 7, eventType: "tool_completed", toolCallId: "tool-attempt-2", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:13.000Z", display: { status: "success" }, detail: { executionStage: { attempt: 1 } } },
  { eventId: "group-turn:" + sharedAnchor + ":attempt:2:turn-attempt-2:result", sequence: 8, eventType: "result", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:15.000Z", display: { status: "failed" } },
  // A late old-attempt event must not leak into the newer recovery lifecycle.
  { eventId: "assistant-progress:" + sharedAnchor + ":attempt:1:turn-attempt-1:late", sequence: 9, eventType: "assistant_progress", anchorMessageId: sharedAnchor, createdAt: "2026-08-15T09:00:14.000Z", display: { status: "running", summary: "旧回合迟到事件" }, detail: { progress: { text: "旧回合迟到事件" } } },
];
const firstAttemptEvents = executionProjection.executionEventsForMessage(recoveryEvents, recoveryMessages, 1);
const secondAttemptEvents = executionProjection.executionEventsForMessage(recoveryEvents, recoveryMessages, 3);
assert.deepEqual([...new Set(firstAttemptEvents.filter(event => event.eventType?.startsWith("tool_")).map(event => event.toolCallId))], ["tool-attempt-1"], "第一次恢复只能看到自己的工具");
assert.deepEqual([...new Set(secondAttemptEvents.filter(event => event.eventType?.startsWith("tool_")).map(event => event.toolCallId))], ["tool-attempt-2"], "第二次恢复只能看到自己的工具");
assert.equal(secondAttemptEvents.some(event => event.eventId?.includes("turn-attempt-1")), false, "旧 attempt 迟到事件不能进入新回合");

const groupTemplate = fs.readFileSync(new URL("../frontend/src/components/collaboration/GroupChat.template.html", import.meta.url), "utf8");
assert.doesNotMatch(groupTemplate, /v-if="isGroupModelFailureMessage\(msg\)"[\s\S]*presentation="completed"/s, "未完成回合不得再挂完成态查询过程");
assert.ok(groupTemplate.indexOf("AgentExecutionMessage") < groupTemplate.indexOf('presentation="live"'), "实时工具仍跟在文字后面");
const composerSource = fs.readFileSync(new URL("../frontend/src/components/common/ChatComposer.vue", import.meta.url), "utf8");
assert.match(composerSource, /composer-prefix-slot/, "追问上下文必须放进输入框内部，不能单独撑开一块空白");
const executionMessageSource = fs.readFileSync(new URL("../frontend/src/components/agents/AgentExecutionMessage.vue", import.meta.url), "utf8");
assert.match(executionMessageSource, /v-if="showModelSettingsAction"/, "只有配置或鉴权错误才应显示模型配置入口");
const groupCss = fs.readFileSync(new URL("../frontend/src/components/collaboration/GroupChat.css", import.meta.url), "utf8");
assert.match(groupCss, /\.task-supplement-context \{[\s\S]*?flex:\s*0 0 auto/, "正在回答提示不得再用 column flex-basis 撑成空白盒子");

const recovery = dist("modules", "collaboration", "group-model-recovery.js");
const failureMod = dist("modules", "collaboration", "group-orchestrator-failure.js");
const compactMod = dist("modules", "collaboration", "group-main-tool-result-compact.js");
const recoverySelfTest = recovery.runGroupModelRecoverySelfTest();
assert.equal(recoverySelfTest.pass, true, JSON.stringify(recoverySelfTest, null, 2));
const failureSelfTest = failureMod.runGroupOrchestratorFailureSelfTest();
assert.equal(failureSelfTest.pass, true, JSON.stringify(failureSelfTest, null, 2));
const compactSelfTest = compactMod.runGroupMainToolResultCompactSelfTest();
assert.equal(compactSelfTest.pass, true, JSON.stringify(compactSelfTest, null, 2));

console.log("group-plan-turn-recovery-selftest ok");
