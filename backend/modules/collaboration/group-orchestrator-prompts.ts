import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { getConfigInfo, recordMetric } from "../../core/db";
import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";
import {
  buildWorkerContextPacket,
  compactWorkerContextMemoryForRetry,
  refreshWorkerContextPacketUsage,
  renderWorkerContextPacket,
} from "../../agents/runtime-kernel";
import {
  callAnthropicCompatibleChat,
  callAnthropicCompatibleJson,
  callOpenAiCompatibleChat,
  callOpenAiCompatibleJson,
  extractJsonObject,
  shouldUseAnthropic,
  type LlmTokenUsage,
} from "./group-orchestrator-llm-client";
import {
  getCollectedOutputAgent,
  parseTaskNotificationsFromText,
} from "./agent-notifications";
import {
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext,
  buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext,
  inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth,
  buildGroupTypedMemoryPressureRecallUsageProjectSummary,
  buildGroupTypedMemoryPressureRecallUsageSummary,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory,
  distillPressureProvenancePreDispatchComplianceToTypedMemory,
  distillProviderDispatchOverrideFollowupToTypedMemory,
  distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory,
  distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory,
  distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory,
  distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory,
  distillProviderSwitchExecutionToTypedMemory,
  distillProviderReproofReceiptConsumptionToTypedMemory,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  readGlobalProviderDispatchReliabilitySnapshot,
  getGroupTypedMemoryDir,
  getGroupTypedMemoryPressureRecallUsageLedgerFile,
  recordGroupTypedMemoryPressureRecallUsageLedger,
} from "./group-memory-index";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import { buildRoleSkillPrompt } from "../../skills/role-skills";
import {
  WORKFLOW_DECISION_GUIDANCE,
  normalizeWorkflowDecision,
  type WorkflowDecision,
} from "../../agents/workflow-decision";
import {
  claimGroupReactiveCompactRetry,
  completeGroupReactiveCompactRetry,
} from "./group-reactive-compact-retry-ownership";
import { recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";
import {
  COORDINATOR_PROJECT,
  DEFAULT_GROUP_ORCHESTRATOR,
  CCM_DIR,
  loadOrchestratorConfig,
  buildGroupMainAgentBoundary,
} from "./group-orchestrator-config";

import {
  getMemberNames,
  getRoutableMembers,
  normalizeGroupOrchestrator,
} from "./group-orchestrator-routing";
import {
  candidateNativeBindingForCoordinator,
  normalizeWorkerContextCompactGroupSessionIdForCoordinator,
  readReplayRepairDispatchCandidatesForCoordinator,
  syncReplayRepairDispatchPlansForCoordinator,
} from "./group-orchestrator-coded";





export function buildGroupCollaborationRules(memberList = "") {
  const members = memberList || "无";
  return `\n\n群聊协作规则：
- 当前群聊成员：${members}
- 这是本地 CCM 群聊协作，不是外部 IM；不要调用飞书、微信、外部机器人或 MCP 通知工具来联系其他 Agent。
- 像团队群聊一样发言：先给出你的判断、依据和下一步，再在确实需要协作时 @ 对方。
- 只有群聊主 Agent 可以用独立一行 "@项目名 具体任务" 正式派发；@ 后必须写清背景、目标、范围和交付物。
- 成员 Agent 不得直接 @、命令或私下派发给另一个成员；跨项目需要必须通过内部群聊协调 MCP 提交给主 Agent，由主 Agent 判断只读询问、正式工作项或用户确认。
- 被 @ 的 Agent 只处理主 Agent 明确派给自己的工作项；如果任务不属于自己，要向主 Agent 报告阻塞，不能自行转派。
- 不要声称其他 Agent 已完成尚未回复的工作；需要等待时明确说“已派发，等待某某回复”。`;
}





export function buildCoordinatorCollaborationInstructions(memberList = "") {
  return `\n\n你是群聊的主 Agent（协调者），这是一个独立编排层。你的目标是让多个项目 Agent 像团队群聊一样协作，而不是让所有底层模型同时抢答。${buildGroupCollaborationRules(memberList)}

主 Agent 工作方式：
1. 先判断用户是在咨询、讨论方案、排查问题，还是要求落地修改。
2. 简单问题直接回答；跨项目、需要代码确认或需要多端配合时，再拆给对应 Agent。
3. 派发任务时，每个 @ 行只给一个 Agent 一个清晰任务，说明背景、目标文件/模块、预期输出。
4. 成员回复后，主 Agent 要负责汇总结论、指出冲突、给出下一步；不要重复粘贴所有上下文。
5. 如果本轮只是派发任务，明确说明“已派发，等待回复”，不要提前说完成。
6. 如果信息不足，先问用户一个必要问题；不要随意编造项目状态或实现细节。

推荐回复结构：
- 判断：一句话说明你理解的需求
- 协作安排：需要时列出独立 @ 行
- 当前结论/等待项：告诉用户接下来等谁或你已能直接给出的结论`;
}





export function buildMemberCollaborationInstructions(projectName: string, memberList = "") {
  return `\n\n你是群聊中的 ${projectName} Agent，代表这个项目参与协作。${buildGroupCollaborationRules(memberList)}

成员 Agent 工作方式：
1. 只对自己项目职责范围内的内容做确定回答或修改；不确定时说明需要谁补充。
2. 回复要像群聊发言：先给结论，再列关键依据、修改点或风险。
3. 如果需要其他项目配合，使用内部群聊协调 MCP 描述需求、证据、所需能力和验收标准；不要直接 @ 或指派另一个成员。
4. 如果你完成了代码或配置修改，说明改了什么、影响范围和验证方式。
5. 如果只是提供建议，不要伪装成已执行修改。
6. 不要重复整段群聊历史，只引用必要上下文。
7. 回复末尾必须追加一个“CCM_AGENT_RECEIPT”结构化回执，供主 Agent 验收；即使阻塞或只是分析，也要填写。

CCM_AGENT_RECEIPT 格式：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明本项目实际完成/确认了什么",
  "actions": ["实际执行的动作；如果只是分析，写分析了哪些代码/配置"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "blockers": ["阻塞点或缺失信息；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;
}





export function buildCoordinatorPrompt(input: {
  group: any;
  context: string;
  message: string;
  toolsContext?: string;
  sharedFilesContext?: string;
  ragContext?: string;
  extraInstructions?: string;
  maintenanceAt?: string;
  contextId?: string;
  sessionId?: string;
  groupSessionId?: string;
  group_session_id?: string;
}) {
  const group = normalizeGroupOrchestrator(input.group);
  const memberList = getRoutableMembers(group).map((m: any) => `${m.project}(${m.agent || "agent"})`).join(", ");
  const instructions = buildCoordinatorCollaborationInstructions(memberList);
  const replayRepairContext = buildCoordinatorReplayRepairDispatchContext(group);
  const maintenanceNotificationPart = buildCoordinatorMaintenanceNotificationInstructions(group, {
    at: input.maintenanceAt,
    contextId: input.contextId,
    sessionId: input.sessionId,
    groupSessionId: input.groupSessionId || input.group_session_id,
    recordDelivery: !!input.contextId && !!input.sessionId,
  }).text;

  const ragPart = input.ragContext ? `\n\n本地知识库参考（仅供主 Agent 理解和提炼任务简报，不代表用户授权执行）：\n${input.ragContext}` : "";

  return `${instructions}${input.toolsContext || ""}${input.sharedFilesContext || ""}${ragPart}
${[input.extraInstructions || "", replayRepairContext, maintenanceNotificationPart].filter(Boolean).join("\n\n")}

以下是群聊最近的消息记录：
${input.context}

用户刚才把这条消息交给主 Agent 协调，请判断是否直接回答，还是拆给某些成员 Agent：
${input.message}`;
}





export function buildCoordinatorMaintenanceNotificationInstructions(groupInput: any, options: any = {}) {
  const group = normalizeGroupOrchestrator(groupInput);
  const groupId = String(group?.id || "").trim();
  if (!groupId) return { text: "", context: null, health: null };
  const groupSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(options.groupSessionId || options.group_session_id || "");
  const scopeId = groupSessionId ? `${groupId}--${groupSessionId}` : groupId;
  const context = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(scopeId, "group-main-agent", {
    at: options.at || options.now,
    maxNotifications: options.maxNotifications || 4,
    recordDelivery: options.recordDelivery === true,
    contextId: options.contextId || options.context_id,
    consumerSessionId: options.sessionId || options.session_id,
    channel: options.channel || "group-main-agent-context",
  });
  const health = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(scopeId, {
    at: options.at || options.now,
  });
  const notificationText = context.pending_count
    ? `冷归档维护提醒（只读建议，不是任务或授权；不得据此创建子 Agent 任务、签发 GC 回执或删除数据）：\n${JSON.stringify({
      group_id: context.group_id,
      source_group_id: context.source_group_id,
      group_session_id: context.group_session_id,
      typed_scope_id: context.typed_scope_id,
      pending_count: context.pending_count,
      notifications: context.notifications,
      delivery_health: {
        delivered_pending_count: health.delivered_pending_count,
        repeated_unseen_count: health.repeated_unseen_count,
      },
      policy: context.policy,
    })}`
    : "";
  const cleanupCommitRepairContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext(
    scopeId,
    "group-main-agent",
    { limit: options.cleanupCommitRepairLimit || options.cleanup_commit_repair_limit || 4 },
  );
  const repairText = cleanupCommitRepairContext.brief_count > 0
    ? `Cleanup commit repair briefs（仅限本群修复规划；不会自动创建真实任务；claim/dispatch 需要显式动作，resolve/cancel 还需要独立、单次 resolution receipt）：\n${JSON.stringify(cleanupCommitRepairContext)}`
    : "";
  return {
    text: [notificationText, repairText].filter(Boolean).join("\n\n"),
    context,
    health,
    cleanup_commit_repair_context: cleanupCommitRepairContext,
    source_group_id: groupId,
    group_session_id: groupSessionId,
    typed_scope_id: scopeId,
  };
}





export function buildMemberPrompt(input: {
  group: any;
  projectName: string;
  context: string;
  message: string;
  toolsContext?: string;
  sharedFilesContext?: string;
}) {
  const memberList = getMemberNames(input.group, input.projectName);
  const instructions = buildMemberCollaborationInstructions(input.projectName, memberList);

  return `${instructions}${input.toolsContext || ""}${input.sharedFilesContext || ""}
以下是群聊最近的消息记录：
${input.context}

请回复用户刚才发给你的消息：${input.message}`;
}





export function compactText(value: string, maxLength = 360) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}





export const COORDINATOR_USER_INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt-status|task-id|WorkerContextPacket|trace_id|session_id|native_session|scratchpad|raw\s+receipt|raw\s+payload|runtime kernel|workflow_timeline/i;





export function sanitizeCoordinatorUserText(value: any, fallback: any = null, maxLength = 700) {
  const fallbackText = compactText(String(fallback === null || fallback === undefined ? "主 Agent 已整理子 Agent 的结果，技术细节已放在技术详情里。" : fallback), maxLength);
  const raw = String(value || "").trim();
  if (!raw) return fallbackText;
  const normalizedRaw = raw
    .replace(/Worker completed without\s+CCM_AGENT_RECEIPT/gi, "子 Agent 已返回结果，但缺少可验收的结构化结果说明");
  const beforeReceipt = normalizedRaw.split(/CCM_AGENT_RECEIPT/i)[0].trim();
  const source = beforeReceipt && beforeReceipt.length >= 8 ? beforeReceipt : normalizedRaw;
  const text = compactText(source, maxLength)
    .replace(/<\/?(?:task-notification|task-id|status|receipt-status|summary|result|usage|duration_ms|total_tokens|tool_uses)>/gi, " ")
    .replace(/CCM_AGENT_RECEIPT/gi, "结构化结果说明")
    .replace(/CCM_AGENT_REQUESTS/gi, "内部协作请求")
    .replace(/task-notification/gi, "子 Agent 完成通知")
    .replace(/receipt-status/gi, "结果说明状态")
    .replace(/task-id/gi, "子 Agent")
    .replace(/\bWorker\b/g, "子 Agent")
    .replace(/WorkerContextPacket/gi, "任务上下文包")
    .replace(/\b(?:trace_id|session_id|native_session|scratchpad|runtime kernel|workflow_timeline)\s*[:=]\s*[\w.-]+/gi, " ")
    .replace(/trace_id|session_id|native_session|scratchpad|runtime kernel|workflow_timeline/gi, "技术详情")
    .replace(/raw\s+receipt|raw\s+payload/gi, "底层执行数据")
    .replace(/\s+/g, " ")
    .replace(/\s+([。！？；，、,.!?;:])/g, "$1")
    .replace(/([。！？])\s*([。！？])+/g, "$1")
    .trim();
  if (!text) return fallbackText;
  return COORDINATOR_USER_INTERNAL_TEXT_PATTERN.test(text) ? fallbackText : compactText(text, maxLength);
}





export function sanitizeCoordinatorUserList(items: any, fallback = "", maxLength = 260, limit = 20) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any) => sanitizeCoordinatorUserText(item, fallback, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}





export function buildCoordinatorFollowUpSummary(item: any, task: string, reason: string, project: string) {
  const provided = String(item?.summary || item?.preview || item?.title || "").trim();
  const basis = provided || reason || task || `继续追问 ${project}`;
  return sanitizeCoordinatorUserText(basis, "补齐结果说明和验证证据", 56);
}





export function collectCoordinatorFollowUpSpecificHints(value: any): string[] {
  const hints: string[] = [];
  const add = (item: any) => {
    if (Array.isArray(item)) {
      item.forEach(add);
      return;
    }
    if (!item) return;
    if (typeof item === "object") {
      add(item.detail || item.reason || item.summary || item.message || item.evidence || item.gaps || item.verification || item.project || "");
      return;
    }
    const text = sanitizeCoordinatorUserText(item, "", 260);
    if (!text) return;
    if (
      /(?:[A-Za-z]:\\|(?:[\w.-]+[\\/])+[\w.-]+|\b[\w.-]+\.(?:ts|tsx|js|jsx|vue|py|go|rs|java|json|md|css|scss|html)(?::\d+)?\b)/i.test(text)
      || /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/[\w./:-]+|\/api\/[\w./:-]+/i.test(text)
      || /\b(?:npm|pnpm|yarn|pytest|go test|cargo test|tsc|typecheck|lint|build)\b/i.test(text)
      || /(?:失败|报错|错误|异常|断言|未通过|failed|failure|error|exception|assertion|timeout)/i.test(text)
      || /(?:字段|接口|权限|日志|状态流转|验收标准)/i.test(text)
    ) {
      hints.push(text);
    }
  };
  add(value);
  return Array.from(new Set(hints)).slice(0, 8);
}





export function buildCoordinatorFollowUpQuality(item: any, task: string, reason: string, project: string, context: any = {}) {
  const text = [task, reason, item?.summary, item?.title].filter(Boolean).join("\n");
  const lazyDelegation = /(?:基于|根据|按照).{0,12}(?:你的|前面|上述|研究|发现|结论).{0,20}(?:发现|研究|结论|继续|处理|修复|实现)|based\s+on\s+(?:your|the)\s+(?:findings|research)|as\s+discussed|fix\s+it|继续处理一下|看一下|处理一下/i.test(text);
  const hints = collectCoordinatorFollowUpSpecificHints([
    task,
    reason,
    item?.evidence,
    item?.gaps,
    item?.verification,
    context?.gaps,
    context?.conflicts,
    Array.isArray(context?.checks) ? context.checks.flatMap((check: any) => [check.detail, check.evidence]) : [],
    Array.isArray(context?.workerReviews) ? context.workerReviews.flatMap((row: any) => [row.completed_scope, row.gaps, row.verification]) : [],
  ]);
  const doneCriteria = /(?:完成后|验收|验证|运行|提交|返回|说明|done|verify|test|report|receipt|结果说明)/i.test(text);
  const missing = [
    lazyDelegation ? "不要使用“基于你的发现/继续处理”这类空泛交接" : "",
    hints.length ? "" : "缺少文件、接口、错误、验证命令或业务字段等具体证据",
    doneCriteria ? "" : "缺少完成标准或验证要求",
  ].filter(Boolean);
  return {
    schema: "ccm-coordinator-follow-up-spec-quality-v1",
    pass: missing.length === 0,
    status: missing.length ? "needs_specific_spec" : "specific_spec_ready",
    status_label: missing.length ? "需补具体指令" : "指令具体",
    reason: missing.length
      ? `继续任务还不够具体：${missing.join("；")}`
      : "继续任务包含具体证据和完成标准。",
    missing,
    hints,
    lazy_delegation: lazyDelegation,
    done_criteria_present: doneCriteria,
  };
}





export function normalizeCoordinatorFollowUpTask(item: any, task: string, reason: string, project: string, context: any = {}) {
  const quality = buildCoordinatorFollowUpQuality(item, task, reason, project, context);
  const safeTask = sanitizeCoordinatorUserText(task, `补齐 ${project} 的结果说明、真实变更和验证证据。`, 1200);
  if (quality.pass) return { message: safeTask, quality };
  const reasonText = sanitizeCoordinatorUserText(reason || item?.summary || "", `补齐 ${project} 的结果说明、真实变更和验证证据。`, 360);
  const lines = [
    "请按主 Agent 复盘出的具体缺口继续处理。",
    quality.hints.length
      ? `已知缺口/证据：${quality.hints.slice(0, 5).join("；")}`
      : "先定位具体文件、接口、错误或验证缺口，不要只按历史印象处理。",
    `本轮目标：${reasonText}`,
    "完成标准：说明实际动作、涉及文件/无需改文件依据、已执行验证或无法验证原因；完成后提交结构化结果说明。",
  ];
  return {
    message: lines.join("\n"),
    quality: {
      ...quality,
      auto_enriched: true,
      enriched_hint_count: quality.hints.length,
    },
  };
}





export function coordinatorNotificationStatusLabel(status: any, receiptStatus: any = "") {
  const normalizedStatus = String(status || "").trim();
  const normalizedReceipt = String(receiptStatus || "").trim();
  if (normalizedStatus === "failed" || normalizedReceipt === "failed") return "执行未通过";
  if (normalizedStatus === "blocked" || ["blocked", "needs_info"].includes(normalizedReceipt)) return "遇到阻塞";
  if (normalizedStatus === "partial" || normalizedReceipt === "partial") return "部分完成";
  if (normalizedStatus === "missing_receipt" || normalizedReceipt === "missing") return "结果说明待补";
  if (normalizedStatus === "completed" || normalizedReceipt === "done") return "已提交结果";
  if (normalizedStatus === "killed" || normalizedStatus === "stopped") return "已停止";
  return "已返回结果";
}





export function coordinatorNotificationGaps(status: any, receiptStatus: any = "") {
  const normalizedStatus = String(status || "").trim();
  const normalizedReceipt = String(receiptStatus || "").trim();
  const gaps: string[] = [];
  if (normalizedStatus === "missing_receipt" || normalizedReceipt === "missing") gaps.push("补齐可验收的结果说明");
  if (normalizedStatus === "failed" || normalizedReceipt === "failed") gaps.push("按失败原因继续处理");
  if (normalizedStatus === "blocked" || ["blocked", "needs_info"].includes(normalizedReceipt)) gaps.push("补充信息或调整后继续");
  if (normalizedStatus === "partial" || normalizedReceipt === "partial") gaps.push("补完剩余范围");
  if (normalizedStatus === "killed" || normalizedStatus === "stopped") gaps.push("确认是否需要重新派发");
  return gaps;
}





export function buildCodedCoordinatorNotificationRows(outputs: string[]) {
  return (outputs || []).flatMap((output, index) => {
    const text = String(output || "").trim();
    if (!text) return [];
    const notifications = parseTaskNotificationsFromText(text);
    if (notifications.length) {
      return notifications.map((item: any, notificationIndex: number) => {
        const agent = sanitizeCoordinatorUserText(item.task_id || `子 Agent ${index + 1}`, `子 Agent ${index + 1}`, 80);
        const status = String(item.status || "").trim();
        const receiptStatus = String(item.receipt_status || "").trim();
        const summary = sanitizeCoordinatorUserText(item.summary || item.result, `${agent} 已返回结果，主 Agent 正在整理验收。`, 260);
        const result = sanitizeCoordinatorUserText(item.result, summary, 320);
        return {
          id: `${agent || "agent"}-${index + 1}-${notificationIndex + 1}`,
          agent,
          status,
          receipt_status: receiptStatus,
          status_label: coordinatorNotificationStatusLabel(status, receiptStatus),
          summary,
          result,
          gaps: coordinatorNotificationGaps(status, receiptStatus),
        };
      });
    }
    const agent = sanitizeCoordinatorUserText(getCollectedOutputAgent(text) || `子 Agent ${index + 1}`, `子 Agent ${index + 1}`, 80);
    const summary = sanitizeCoordinatorUserText(text, `${agent} 已返回结果，主 Agent 正在整理验收。`, 320);
    return [{
      id: `${agent || "agent"}-${index + 1}`,
      agent,
      status: "reported",
      receipt_status: "",
      status_label: "已返回结果",
      summary,
      result: summary,
      gaps: [],
    }];
  }).filter((item: any) => item.agent || item.summary || item.result).slice(0, 12);
}





export function buildCoordinatorReplayRepairDispatchContext(group: any) {
  const groupId = String(group?.id || group?.group_id || "").trim();
  if (!groupId) return "";
  const summary = readReplayRepairDispatchCandidatesForCoordinator(groupId, 8);
  if (!summary?.schema || Number(summary.candidateCount || 0) <= 0) return "";
  const dispatchPlanLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, summary, { limit: 8 });
  const readyBriefs = Array.isArray(dispatchPlanLedger.briefs)
    ? dispatchPlanLedger.briefs.filter((brief: any) => String(brief.status || "") === "ready")
    : [];
  const lines = [
    "群聊记忆 Replay 修复派发候选（系统只读注入，不自动创建真实任务）：",
    `- groupId=${groupId}；candidate=${summary.candidateCount || 0}；ready=${summary.readyCount || 0}；dispatchMarked=${summary.dispatchMarkedCount || 0}；dispatchBriefs=${readyBriefs.length}；shouldCreateRealTask=false；ledger=${summary.file || "未记录"}；briefLedger=${dispatchPlanLedger.file || "未记录"}`,
    "- 使用规则：这些候选表示 compact boundary replay 发现的记忆上下文缺口。你可以把它们作为本轮规划依据，但只有在当前消息/任务来源允许执行时，才把候选整理成 targets[].task；不要因为候选存在就自行创建任务。",
  ];
  for (const candidate of Array.isArray(summary.candidates) ? summary.candidates.slice(0, 8) : []) {
    const nativeBinding = candidateNativeBindingForCoordinator(candidate).join("；");
    lines.push([
      `- candidate_id=${candidate.candidate_id || ""}`,
      `work_item=${candidate.work_item_id || ""}`,
      `priority=${candidate.priority || "medium"}`,
      `status=${candidate.status || "pending"}`,
      `target=${candidate.dispatch_target || candidate.targetProject || candidate.repair_target || "memory-context"}`,
      nativeBinding ? `native=${nativeBinding}` : "",
      `action=${candidate.recommendedAction || "review"}`,
      `instruction=${compactText(candidate.instruction || candidate.expected || candidate.subject || "", 260)}`,
      candidate.prompt_patch ? `promptPatch=${compactText(candidate.prompt_patch, 260)}` : "",
    ].filter(Boolean).join("；"));
  }
  if (readyBriefs.length) {
    lines.push("群聊记忆 Replay 修复派发简报（可复制为 targets[].task 的自包含 worker prompt）：");
    for (const brief of readyBriefs.slice(0, 5)) {
      const nativeBinding = candidateNativeBindingForCoordinator(brief).join("；");
      lines.push([
        `- brief=${brief.brief_id || ""}`,
        `work_item=${brief.work_item_id || ""}`,
        `target=${brief.dispatch_target || brief.target_project || "memory-context"}`,
        nativeBinding ? `native=${nativeBinding}` : "",
        `shouldCreateRealTask=false`,
        `workerTask=${compactText(brief.worker_task || "", 520)}`,
      ].filter(Boolean).join("；"));
    }
  }
  return lines.join("\n");
}
