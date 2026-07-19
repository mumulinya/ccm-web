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
import { buildModelVisiblePayloadSnapshot } from "../../system/session-compaction-core";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "./group-compaction-strategy";
import { buildExactGroupSessionModelContextPacket } from "./group-session-model-context";
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
  buildCoordinatorMaintenanceNotificationInstructions,
  buildCoordinatorReplayRepairDispatchContext,
  compactText,
} from "./group-orchestrator-prompts";
import {
  hashCoordinator,
  isBroadDevelopmentRequest,
  runCodedGroupOrchestrator,
  withGroupRagContext,
} from "./group-orchestrator-coded";
import {
  attachLlmTokenUsage,
  buildLlmCoordinatorMessages,
  mergeLlmTokenUsage,
  runLlmGroupOrchestrator,
} from "./group-orchestrator-llm";





export const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-work-items");




export const GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-dispatch-plans");




export const GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_BINDINGS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-dispatch-bindings");




export const GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR = path.join(CCM_DIR, "group-memory-replay-repair-timeline-bindings");




export const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR = path.join(CCM_DIR, "group-memory-worker-context-compact-hooks");




export const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR = path.join(CCM_DIR, "group-memory-worker-context-compact-outcomes");




export const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR = path.join(CCM_DIR, "group-memory-worker-context-compact-strategies");




export const GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR = path.join(CCM_DIR, "group-memory-worker-context-ptl-emergencies");





export function getLlmConfigIssue(config: any) {
  if (!config.enabled) return "主 Agent 大模型 API 未启用";
  if (!String(config.apiUrl || "").trim()) return "主 Agent API URL 未配置";
  if (!String(config.apiKey || "").trim()) return "主 Agent API Key 未配置";
  if (!String(config.model || "").trim()) return "主 Agent 模型未配置";
  if (!["openai-compatible", "anthropic-compatible", "auto"].includes(config.format)) return `暂不支持的主 Agent API 格式: ${config.format}`;
  return "";
}





export function createCoordinatorMember(agent = "coded-orchestrator") {
  return {
    project: COORDINATOR_PROJECT,
    role: "coordinator",
    agent,
  };
}





export function isCoordinatorMember(member: any, group: any = null) {
  const coordinatorProject = getCoordinatorProject(group);
  return member?.role === "coordinator" || member?.project === coordinatorProject || member?.project === COORDINATOR_PROJECT;
}





export function getCoordinatorProject(group: any) {
  return String(group?.orchestrator?.coordinatorProject || COORDINATOR_PROJECT).trim() || COORDINATOR_PROJECT;
}





export function getCoordinatorMember(group: any) {
  const coordinatorProject = getCoordinatorProject(group);
  const member = (group?.members || []).find((m: any) => m.project === coordinatorProject || m.role === "coordinator");
  return member || createCoordinatorMember();
}





export function normalizeGroupOrchestrator(group: any) {
  if (!group || typeof group !== "object") return group;

  group.orchestrator = {
    ...DEFAULT_GROUP_ORCHESTRATOR,
    ...(group.orchestrator || {}),
  };
  if (group.orchestrator.mode === "coordinator_first" || group.orchestrator.mode === "coded_coordinator") {
    group.orchestrator.mode = DEFAULT_GROUP_ORCHESTRATOR.mode;
  }

  const coordinatorProject = getCoordinatorProject(group);
  const seen = new Set<string>();
  const members = Array.isArray(group.members) ? group.members : [];
  const normalizedMembers: any[] = [];
  let coordinator = members.find((m: any) => m?.project === coordinatorProject || m?.role === "coordinator");

  if (!coordinator) {
    coordinator = createCoordinatorMember();
  }

  coordinator = {
    ...coordinator,
    project: coordinator.project || coordinatorProject,
    role: "coordinator",
    agent: "coded-orchestrator",
  };

  normalizedMembers.push(coordinator);
  seen.add(coordinator.project);

  for (const member of members) {
    if (!member?.project || seen.has(member.project)) continue;
    if (member.project === coordinator.project) continue;
    normalizedMembers.push(member);
    seen.add(member.project);
  }

  group.members = normalizedMembers;
  return group;
}





export function isOrchestratorEnabled(group: any) {
  return normalizeGroupOrchestrator(group).orchestrator?.enabled !== false;
}





export function getRoutableMembers(group: any) {
  return normalizeGroupOrchestrator(group).members.filter((m: any) => !isCoordinatorMember(m, group));
}





export function getMemberNames(group: any, excludeProject = "") {
  return normalizeGroupOrchestrator(group).members
    .map((m: any) => m.project)
    .filter((project: string) => project && project !== excludeProject)
    .join(", ");
}





export function selectGroupTargets(group: any, targetProject: string | undefined | null) {
  const normalized = normalizeGroupOrchestrator(group);
  const target = String(targetProject || "").trim();
  const isBroadcast = !target || target === "all";
  const coordinator = getCoordinatorMember(normalized);

  if (isBroadcast) {
    const orchestrated = isOrchestratorEnabled(normalized);
    return {
      isBroadcast: true,
      orchestrated,
      targetLabel: orchestrated ? coordinator.project : "all",
      members: orchestrated ? [coordinator] : getRoutableMembers(normalized),
    };
  }

  const member = normalized.members.find((m: any) => m.project === target);
  return {
    isBroadcast: false,
    orchestrated: member ? isCoordinatorMember(member, normalized) : false,
    targetLabel: target,
    members: member ? [member] : [],
  };
}





export function resolveMemberRuntime(projectName: string, group: any, configs: any[]) {
  const normalized = normalizeGroupOrchestrator(group);
  if (projectName === getCoordinatorMember(normalized).project) {
    return null;
  }

  const member = normalized.members.find((m: any) => m.project === projectName);
  const config = configs.find((c: any) => c.name === projectName);
  if (!config) return null;

  const info = getConfigInfo(config.path)[0] || {};
  return {
    project: projectName,
    workDir: info.workDir || process.cwd(),
    agentType: info.agent || member?.agent || "claudecode",
    configured: true,
  };
}





export function buildRecentGroupContext(messages: any[], fullCount = 5) {
  const msgs = messages || [];
  return msgs.map((m: any, idx: number) => {
    const who = m.role === "user" ? `[用户 -> ${m.target}]` : `[${m.agent || "Agent"}]`;
    const content = String(m.content || "");
    // 最近 fullCount 条保留全文，更早的只保留前 200 字摘要
    if (idx >= msgs.length - fullCount) {
      return `${who} ${content}`;
    }
    const summary = content.length > 200 ? content.slice(0, 200) + "..." : content;
    return `${who} ${summary}`;
  }).join("\n");
}





export function containsAny(text: string, words: string[]) {
  return words.some(word => text.includes(word.toLowerCase()));
}





export function memberKind(member: any) {
  const name = String(member?.project || "").toLowerCase();
  if (/app|web|front|frontend|mobile|client|ui|view|页面|前端|客户端/.test(name)) return "frontend";
  if (/cloud|api|server|backend|service|admin|db|后端|服务端|云/.test(name)) return "backend";
  return "general";
}





export const FRONTEND_HINTS = ["前端", "页面", "界面", "ui", "组件", "样式", "交互", "app", "客户端", "移动端", "小程序", "按钮", "表单", "展示", "原型", "流程"];




export const BACKEND_HINTS = ["后端", "接口", "api", "服务", "数据库", "鉴权", "权限", "字段", "表", "缓存", "队列", "部署", "cloud", "server", "endpoint", "schema", "入参", "出参"];




export const BROAD_HINTS = ["全栈", "前后端", "联调", "跨端", "需求", "开发", "实现", "修复", "排查", "bug", "报错", "测试", "验收", "项目", "接口文档", "业务文档", "需求文档", "prd", "文档"];




export const QUESTION_HINTS = ["?", "？", "怎么", "如何", "为什么", "能不能", "是否", "吗"];




export const REVIEW_HINTS = ["review", "审查", "评审", "检查代码", "看一下代码", "风险"];




export const TEST_HINTS = ["测试", "验收", "验证", "用例", "回归", "自测"];




export const BUG_HINTS = ["bug", "报错", "错误", "异常", "失败", "崩溃", "无法", "不生效", "修复"];




export const IMPLEMENT_HINTS = ["实现", "开发", "新增", "接入", "适配", "改成", "优化", "重构", "做一下", "加一个", "完成这个任务", "按文档"];




export const PLANNING_HINTS = ["方案", "设计", "架构", "规划", "拆分", "怎么做", "思路", "接口文档", "业务文档", "需求文档", "prd"];




export const GREETING_PATTERNS = [
  /^(你好|您好|hi|hello|hey|在吗|在不在|哈喽|嗨)[。！!,.，\s]*$/i,
  /^(早上好|下午好|晚上好|辛苦了)[。！!,.，\s]*$/i,
];





export const SIMPLE_MESSAGE_PATTERNS = [
  /^[0-9.,，。!！?？\s]+$/,                // 纯数字/标点
  /^(好的|ok|OK|Ok|收到|了解|知道了|嗯|嗯嗯|对|是的|明白|谢谢|感谢|辛苦|没事|没问题|可以|行)[。！!,.，\s]*$/i,
  /^.{0,2}$/,                               // 1-2 个字符
];





export function isGreetingMessage(message: string) {
  const text = String(message || "").trim();
  return GREETING_PATTERNS.some(pattern => pattern.test(text));
}





export function isSimpleMessage(message: string) {
  const text = String(message || "").trim();
  if (!text) return true;
  if (isGreetingMessage(text)) return true;
  return SIMPLE_MESSAGE_PATTERNS.some(pattern => pattern.test(text));
}





export function isExplicitExecutionRequest(message: string) {
  const text = String(message || "").trim();
  if (!text) return false;
  const explanationOnly = /^(?:请)?(?:介绍|说明|解释|分析|总结|概括|告诉我|这(?:个)?是|这是|什么是|为什么|为何|如何|怎么|是否|能否|能不能).{0,80}$/i.test(text)
    || /(?:是什么项目|项目是做什么的|介绍一下项目|分析一下(?:项目|代码|架构)|有什么功能|采用什么技术|为什么会)/i.test(text);
  const explicitAction = /(?:^|请|帮我|给我|需要|我要|现在|立即|开始|继续|然后|并且|把).{0,18}(?:修改|实现|开发|新增|添加|加上|加一个|创建|运行|执行|派发|修复|删除|清理|更新|重构|接入|安装|部署|提交|写入|生成|迁移|恢复|暂停|取消|启动|停止)/i.test(text)
    || /^(?:修改|实现|开发|新增|添加|创建|运行|执行|派发|修复|删除|清理|更新|重构|接入|安装|部署|提交|写入|生成|迁移|恢复|暂停|取消|启动|停止)/i.test(text)
    || /(?:按|照).{0,20}(?:文档|方案|要求).{0,8}(?:做|落地|实现|执行)/i.test(text);
  return explicitAction && !explanationOnly;
}





export function analyzeRequirement(group: any, message: string, context = "") {
  const normalized = normalizeGroupOrchestrator(group);
  const raw = String(message || "").trim();
  const contextText = String(context || "").trim();
  const text = [raw, contextText].filter(Boolean).join("\n").toLowerCase();
  const members = getRoutableMembers(normalized);
  const explicitProjects = members
    .map((m: any) => String(m.project || ""))
    .filter(project => project && (raw.includes(`@${project}`) || text.includes(project.toLowerCase())));

  const domains: string[] = [];
  if (containsAny(text, FRONTEND_HINTS)) domains.push("frontend");
  if (containsAny(text, BACKEND_HINTS)) domains.push("backend");
  if (/联调|前后端|全栈|跨端|接口.*页面|页面.*接口/.test(raw)) {
    if (!domains.includes("frontend")) domains.push("frontend");
    if (!domains.includes("backend")) domains.push("backend");
  }
  if (domains.length === 0 && explicitProjects.length > 0) {
    for (const project of explicitProjects) {
      const member = members.find((m: any) => m.project === project);
      const kind = memberKind(member);
      if (kind !== "general" && !domains.includes(kind)) domains.push(kind);
    }
  }

  let intent = "discussion";
  if (isGreetingMessage(raw)) intent = "greeting";
  else if (containsAny(text, BUG_HINTS)) intent = "bugfix";
  else if (containsAny(text, REVIEW_HINTS)) intent = "review";
  else if (containsAny(text, TEST_HINTS)) intent = "verification";
  else if (containsAny(text, IMPLEMENT_HINTS)) intent = "implementation";
  else if (containsAny(text, PLANNING_HINTS)) intent = "planning";
  else if (containsAny(text, QUESTION_HINTS)) intent = "question";

  const deliverables: string[] = [];
  if (intent === "implementation") deliverables.push("实现方案或代码修改");
  if (intent === "bugfix") deliverables.push("问题定位、修复点和验证方式");
  if (intent === "review") deliverables.push("风险点、修改建议和结论");
  if (intent === "verification") deliverables.push("验证步骤、结果和遗留风险");
  if (intent === "planning") deliverables.push("任务拆分、依赖关系和执行顺序");
  if (deliverables.length === 0) deliverables.push("结论、依据和下一步");

  const constraints: string[] = [];
  if (/不要|不能|避免|必须|需要|要求|只/.test(raw)) constraints.push("包含用户显式约束，子 Agent 需要逐条遵守");
  if (/紧急|马上|尽快|阻塞|线上/.test(raw)) constraints.push("优先级较高");

  const missingInfo: string[] = [];
  if (!raw) missingInfo.push("缺少需求内容");
  if (intent === "bugfix" && !/报错|日志|复现|截图|现象|错误/.test(raw)) missingInfo.push("缺少具体现象或复现信息");
  if (intent === "implementation" && domains.length === 0 && explicitProjects.length === 0) missingInfo.push("未明确涉及哪个项目或端");
  if (domains.length > 1 && !/联调|接口|字段|协议|契约|对接/.test(raw)) missingInfo.push("跨端任务可能需要确认接口/字段契约");

  const needsCoordination = intent !== "greeting" && (
    explicitProjects.length > 0 ||
    domains.length > 1 ||
    intent === "implementation" ||
    intent === "bugfix" ||
    intent === "review" ||
    containsAny(text, BROAD_HINTS)
  );

  const summaryParts = [
    intent === "question" ? "用户在咨询问题" : `用户想要${deliverables[0]}`,
    domains.length ? `涉及${domains.join(" + ")}` : "暂未明确项目范围",
    explicitProjects.length ? `点名${explicitProjects.join(", ")}` : ""
  ].filter(Boolean);

  return {
    raw,
    summary: summaryParts.join("；"),
    intent,
    domains,
    deliverables,
    constraints,
    explicitProjects,
    missingInfo,
    needsCoordination,
    contextSignal: context ? compactText(context, 240) : "",
    confidence: explicitProjects.length || domains.length ? 0.82 : needsCoordination ? 0.64 : 0.48,
  };
}





export function scoreMember(member: any, message: string, analysis: any = null) {
  const text = message.toLowerCase();
  const name = String(member?.project || "").toLowerCase();
  let score = 0;
  if (name && text.includes(name)) score += 8;
  if (analysis?.explicitProjects?.includes(member?.project)) score += 10;

  const kind = memberKind(member);
  if (analysis?.domains?.includes(kind)) score += 7;
  if (kind === "frontend" && containsAny(text, FRONTEND_HINTS)) score += 5;
  if (kind === "backend" && containsAny(text, BACKEND_HINTS)) score += 5;
  if (analysis?.needsCoordination || containsAny(text, BROAD_HINTS)) score += 1;
  return score;
}





export function explicitMentionTargets(group: any, message: string) {
  const members = getRoutableMembers(group);
  const results: any[] = [];
  const seen = new Set<string>();
  const lines = String(message || "").split(/\r?\n/);

  for (const member of members) {
    const project = String(member.project || "");
    if (!project) continue;
    const mention = `@${project}`;
    const line = lines.find(item => item.includes(mention)) || "";
    if (!line) continue;
    const task = line.replace(mention, "").replace(/^[\s：:，,、\-—]+/, "").trim() || message;
    if (seen.has(project)) continue;
    seen.add(project);
    results.push({ member, task });
  }

  return results;
}





export function routeMembers(group: any, message: string, analysis: any = null) {
  const normalized = normalizeGroupOrchestrator(group);
  const members = getRoutableMembers(normalized);
  const explicit = explicitMentionTargets(normalized, message);
  if (explicit.length > 0) return explicit;
  const requirement = analysis || analyzeRequirement(normalized, message);

  const scored = members
    .map((member: any) => ({ member, score: scoreMember(member, message, requirement) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const bestScore = scored[0].score;
    return scored.filter(item => item.score >= Math.max(2, bestScore - 2)).map(item => ({
      member: item.member,
      task: message,
    }));
  }

  const text = String(message || "").toLowerCase();
  if (requirement.needsCoordination || containsAny(text, BROAD_HINTS) || containsAny(text, QUESTION_HINTS)) {
    return members.map((member: any) => ({ member, task: message }));
  }

  return [];
}





export function formatRequirementUnderstanding(analysis: any) {
  const lines = [
    `意图：${analysis.intent}`,
    `理解：${analysis.summary}`,
    `范围：${analysis.domains.length ? analysis.domains.join(" + ") : "未明确"}`,
    `交付物：${analysis.deliverables.join("、")}`,
  ];
  if (analysis.constraints.length) lines.push(`约束：${analysis.constraints.join("、")}`);
  if (analysis.missingInfo.length) lines.push(`缺口：${analysis.missingInfo.join("、")}`);
  return lines;
}





export function buildDelegationLine(project: string, task: string, analysis: any) {
  const broadDevelopmentRequest = isBroadDevelopmentRequest(task, analysis);
  const brief = [
    `需求理解：${analysis.summary}`,
    `意图：${analysis.intent}`,
    `交付物：${analysis.deliverables.join("、")}`,
    analysis.constraints.length ? `约束：${analysis.constraints.join("、")}` : "",
    analysis.missingInfo.length ? `${broadDevelopmentRequest ? "先按项目职责判断并补齐范围" : "注意缺口"}：${analysis.missingInfo.join("、")}` : "",
    `原始需求：${compactText(task)}`
  ].filter(Boolean).join("；");
  return `@${project} 请从 ${project} 项目职责处理。${brief}。回复时请给出结论、依据、需要修改的点、风险和验证方式。`;
}





export function buildVisibleAssignmentLine(item: any) {
  const project = item?.member?.project || item?.project || "";
  const task = compactText(item?.task || "", 220);
  const reason = compactText(item?.reason || "", 120);
  const dependsOn = String(item?.dependsOn || "").trim();
  const suffix = [
    reason ? `原因：${reason}` : "",
    dependsOn ? `依赖：先等 ${dependsOn}` : "",
  ].filter(Boolean).join("；");
  return `@${project} ${task}${suffix ? `（${suffix}）` : ""}`;
}





export function inferCoordinatorStrategy(analysis: any = {}, targetCount = 0) {
  const intent = String(analysis?.intent || "");
  const hasDocuments = Array.isArray(analysis?.documentFindings) && analysis.documentFindings.length > 0;
  const complexIntent = ["implementation", "bugfix", "planning", "review"].includes(intent);
  const crossProject = targetCount > 1 || (Array.isArray(analysis?.domains) && analysis.domains.length > 1);
  if (hasDocuments || crossProject || complexIntent) {
    return "research_synthesis_implementation_verification";
  }
  return "direct_worker_execution";
}





export function buildCoordinatorPlan(group: any, analysis: any, targets: any[], executionOrder = "parallel", strategy = "") {
  const targetNames = (targets || []).map((item: any) => item?.member?.project || item?.project).filter(Boolean);
  const coordinationStrategy = strategy || inferCoordinatorStrategy(analysis, targetNames.length);
  const phases = [
    "理解需求：主 Agent 提炼业务目标、范围、约束、文档依据和缺口",
    coordinationStrategy === "research_synthesis_implementation_verification"
      ? "研究与综合：子 Agent 先在各自项目内确认事实，主 Agent 综合成明确实现/验证判断，禁止把理解责任转嫁给 Worker"
      : "",
    targetNames.length
      ? `分配任务：按 ${executionOrder} 派发给 ${targetNames.join("、")}，每个子 Agent 获得自包含工作单`
      : "分配任务：当前没有可执行子 Agent，先直接回答或向用户补充提问",
    "协同执行：子 Agent 在各自项目中完成研究、实现、验证，并返回 CCM_AGENT_RECEIPT",
    "复盘验收：主 Agent 汇总回执、文件变更和验证证据，发现缺口时继续返工",
  ].filter(Boolean);
  const missingInfo = Array.isArray(analysis?.missingInfo) ? analysis.missingInfo.filter(Boolean) : [];
  return {
    mode: "cc-style-coordinator",
    strategy: coordinationStrategy,
    executionOrder,
    phases,
    targets: targetNames,
    missingInfo,
  };
}





export function isStructuredCoordinatorFallbackAllowed(input: { source?: string; message?: string }) {
  const source = String(input?.source || "").toLowerCase();
  const message = String(input?.message || "");
  const trustedSource = /^(?:task|cron|daily[_-]?dev|daily-dev-dispatch-repair|mission|global-mission)/.test(source);
  const structuredPacket = /(?:主 Agent .*工作单|任务标题[:：])/.test(message)
    && /业务目标[:：]/.test(message)
    && /验收标准[:：]/.test(message);
  return trustedSource && structuredPacket;
}





export type GroupOrchestratorInput = {
  group: any;
  message: string;
  context?: string;
  source?: string;
  sharedFilesContext?: string;
  ragContext?: string;
  ragCitations?: string[];
  ragScoped?: boolean;
  extraInstructions?: string;
  providerSwitchRequests?: any;
  provider_switch_requests?: any;
  contextId?: string;
  context_id?: string;
  sessionId?: string;
  session_id?: string;
  traceId?: string;
  trace_id?: string;
  taskId?: string;
  task_id?: string;
  executionId?: string;
  execution_id?: string;
  groupSessionId?: string;
  group_session_id?: string;
  workerContextUsageOptions?: any;
  worker_context_usage_options?: any;
  autoWorkerContextCompactRetry?: boolean;
  auto_worker_context_compact_retry?: boolean;
  workerContextRetryOptions?: any;
  worker_context_retry_options?: any;
};





export function measureGroupMainAgentPayload(input: any) {
  const messages = buildLlmCoordinatorMessages(input);
  const snapshot = buildModelVisiblePayloadSnapshot({
    scope: "group",
    sessionId: `${String(input?.group?.id || "")}:${String(input?.groupSessionId || input?.group_session_id || "")}`,
    recentMessages: messages,
  });
  return { messages, snapshot, tokens: snapshot.totalTokens };
}

export async function prepareExactGroupMainAgentInput(input: any, group: any, groupSessionId: string, config: any, runtime: any = {}) {
  if (!groupSessionId.startsWith("gcs_")) return { input, compacted: false, measurement: measureGroupMainAgentPayload(input) };
  const buildProjection = typeof runtime.buildProjection === "function"
    ? runtime.buildProjection
    : buildExactGroupSessionModelContextPacket;
  const runCompaction = typeof runtime.runCompaction === "function"
    ? runtime.runCompaction
    : (groupId: string, options: any) => {
        const memoryContextApi = require("./group-memory-context") as typeof import("./group-memory-context");
        return memoryContextApi.runGroupMemoryAutoCompactionNow(groupId, options);
      };
  let projection = buildProjection(group.id, { groupSessionId });
  let preparedInput = { ...input, group, context: projection.rendered, groupSessionId };
  let measurement = measureGroupMainAgentPayload(preparedInput);
  const capacity = resolveGroupModelContextCapacity(config);
  const threshold = getGroupAutoCompactThreshold(config);
  const fixedPayload = measureGroupMainAgentPayload({ ...preparedInput, context: "" });
  const compactResult: any = await runCompaction(group.id, {
    sessionId: groupSessionId,
    reason: "group_main_final_payload_capacity",
    config: {
      ...config,
      memoryCompactionUseModel: true,
      memoryCompactionMode: "model-required",
      modelContextWindow: capacity.contextWindow,
      modelMaxOutputTokens: capacity.reservedOutputTokens,
      modelAutoCompactTokenLimit: threshold,
      modelVisibleSystemContext: fixedPayload.messages,
    },
  });
  if (compactResult?.success === true && compactResult?.compacted !== true && measurement.tokens < threshold) {
    return { input: preparedInput, compacted: false, projection, measurement, capacity, threshold, compactResult };
  }
  if (compactResult?.success !== true || compactResult?.compacted !== true) {
    throw new Error(`GROUP_MAIN_FORMAL_COMPACTION_FAILED:${compactResult?.error || compactResult?.reason || "formal_compaction_not_committed"}`);
  }

  projection = buildProjection(group.id, { groupSessionId });
  if (projection.canonicalSummary !== true) {
    throw new Error("GROUP_MAIN_FORMAL_COMPACTION_FAILED:canonical_summary_missing");
  }
  preparedInput = { ...preparedInput, context: projection.rendered };
  measurement = measureGroupMainAgentPayload(preparedInput);
  if (measurement.tokens >= threshold) {
    throw new Error(`GROUP_MAIN_POST_COMPACT_PAYLOAD_BLOCKED:${measurement.tokens}/${threshold}`);
  }
  return { input: preparedInput, compacted: true, projection, measurement, capacity, threshold, compactResult };
}

export async function runGroupOrchestratorCore(input: GroupOrchestratorInput) {
  const initialInput = withGroupRagContext(input);
  const group = normalizeGroupOrchestrator(initialInput.group);
  const groupSessionId = String(initialInput.groupSessionId || initialInput.group_session_id || "").trim();
  const config = loadOrchestratorConfig();
  const configIssue = getLlmConfigIssue(config);
  const raggedInput = groupSessionId.startsWith("gcs_")
    ? { ...initialInput, group, context: buildExactGroupSessionModelContextPacket(group.id, { groupSessionId }).rendered, groupSessionId }
    : initialInput;
  const replayRepairContext = buildCoordinatorReplayRepairDispatchContext(group);
  const contextId = String(raggedInput.contextId || raggedInput.context_id || `group-main-agent-context:${hashCoordinator([
    group?.id || "",
    groupSessionId,
    raggedInput.source || "",
    raggedInput.message || "",
    String(raggedInput.context || "").slice(-800),
  ], 24)}`);
  const sessionId = String(raggedInput.sessionId || raggedInput.session_id || `group-main-agent:${group?.id || "unknown"}:${groupSessionId || "unscoped"}`);
  const maintenanceNotificationContext = buildCoordinatorMaintenanceNotificationInstructions(group, {
    contextId,
    sessionId,
    groupSessionId,
    recordDelivery: false,
    channel: "run-group-orchestrator",
  });
  let enrichedInput = {
    ...raggedInput,
    group,
    extraInstructions: [raggedInput.extraInstructions || "", replayRepairContext, maintenanceNotificationContext.text].filter(Boolean).join("\n\n"),
  };
  if (!configIssue) {
    enrichedInput = (await prepareExactGroupMainAgentInput(enrichedInput, group, groupSessionId, config)).input;
  }
  const coordinator = getCoordinatorMember(group);
  const informationalFallback = false;
  // 规则编排只允许继续已经结构化、已授权的内部工作单；自动对话入口模型失败时安全停止。
  const safeCodedFallback = isStructuredCoordinatorFallbackAllowed(enrichedInput);

  if (configIssue) {
    if (config.fallbackToRules && safeCodedFallback) {
      const fallback = runCodedGroupOrchestrator({
        ...enrichedInput,
        group,
        context: [enrichedInput.context || "", enrichedInput.extraInstructions || ""].filter(Boolean).join("\n\n"),
      });
      return {
        ...fallback,
        runtime: "coded-fallback",
        agentBoundary: buildGroupMainAgentBoundary("coded_fallback"),
        content: informationalFallback ? fallback.content : `${fallback.content}\n\n主 Agent API 回退：${configIssue}`,
      };
    }
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      runtime: "llm-not-configured",
      agentBoundary: buildGroupMainAgentBoundary("llm-not-configured"),
      content: [
        "主 Agent 暂时不能开始协调：大模型 API 未配置完整。",
        "",
        `原因：${configIssue}`,
        "",
        "请到 设置 -> 群聊主 Agent 模型配置 中填写 Base URL、API Key 和模型名。",
        "配置完成后，主 Agent 会先调用大模型理解需求，再分派给项目 Agent。"
      ].join("\n"),
    };
  }

  let reactiveCompactOwnership: any = null;
  try {
    buildCoordinatorMaintenanceNotificationInstructions(group, {
      contextId,
      sessionId,
      groupSessionId,
      recordDelivery: true,
      channel: "run-group-orchestrator-llm",
    });
    return await runLlmGroupOrchestrator({ ...enrichedInput, group });
  } catch (error: any) {
    const firstAttemptUsage = error?.usage || null;
    if (isContextLimitError(error) && enrichedInput.context) {
      let retryClaim: any = null;
      if (groupSessionId.startsWith("gcs_")) {
        try {
          retryClaim = claimGroupReactiveCompactRetry({
            groupId: group.id,
            groupSessionId,
            channel: "group_main_prompt_too_long",
            retryEpoch: contextId,
            requestFingerprint: `${raggedInput.source || ""}:${contextId}`,
            contextChecksum: hashCoordinator(enrichedInput.context || "", 64),
            inputChars: String(enrichedInput.context || "").length,
          });
        } catch (claimError: any) {
          retryClaim = { status: "claim_failed", acquired: false, issues: [String(claimError?.message || claimError).slice(0, 180)] };
        }
      } else {
        retryClaim = { status: "exact_group_session_required", acquired: false, issues: ["group_session_id must be gcs_*"] };
      }
      reactiveCompactOwnership = {
        schema: "ccm-group-main-reactive-compact-retry-ownership-summary-v1",
        group_id: group.id,
        group_session_id: groupSessionId,
        retry_epoch: contextId,
        status: retryClaim?.status || "not_claimed",
        acquired: retryClaim?.acquired === true,
        entry_id: retryClaim?.entry?.entry_id || "",
        claim_id: retryClaim?.entry?.claim_id || "",
        fencing_token: Number(retryClaim?.entry?.fencing_token || 0),
        claim_generation: Number(retryClaim?.entry?.claim_generation || 0),
        issues: retryClaim?.issues || [],
      };
      if (retryClaim?.acquired === true) try {
        buildCoordinatorMaintenanceNotificationInstructions(group, {
          contextId,
          sessionId,
          groupSessionId,
          recordDelivery: true,
          channel: "run-group-orchestrator-llm-context-retry",
        });
        const capacity = resolveGroupModelContextCapacity(config);
        const threshold = getGroupAutoCompactThreshold(config);
        const fixedPayload = measureGroupMainAgentPayload({ ...enrichedInput, context: "" });
        const memoryContextApi = require("./group-memory-context") as typeof import("./group-memory-context");
        const compactResult: any = await memoryContextApi.runGroupMemoryAutoCompactionNow(group.id, {
          sessionId: groupSessionId,
          reason: "group_main_provider_prompt_too_long",
          config: {
            ...config,
            memoryCompactionUseModel: true,
            memoryCompactionMode: "model-required",
            modelContextWindow: capacity.contextWindow,
            modelMaxOutputTokens: capacity.reservedOutputTokens,
            modelAutoCompactTokenLimit: Math.min(threshold, 18_000),
            modelVisibleSystemContext: fixedPayload.messages,
          },
        });
        if (compactResult?.success !== true || compactResult?.compacted !== true) {
          throw new Error(`GROUP_MAIN_REACTIVE_FORMAL_COMPACTION_FAILED:${compactResult?.error || compactResult?.reason || "formal_compaction_not_committed"}`);
        }
        const recoveredProjection = buildExactGroupSessionModelContextPacket(group.id, { groupSessionId });
        if (recoveredProjection.canonicalSummary !== true) {
          throw new Error("GROUP_MAIN_REACTIVE_FORMAL_COMPACTION_FAILED:canonical_summary_missing");
        }
        const recoveredInput = { ...enrichedInput, context: recoveredProjection.rendered };
        const recoveredMeasurement = measureGroupMainAgentPayload(recoveredInput);
        if (recoveredMeasurement.tokens >= threshold) {
          throw new Error(`GROUP_MAIN_REACTIVE_POST_COMPACT_PAYLOAD_BLOCKED:${recoveredMeasurement.tokens}/${threshold}`);
        }
        const recoveredContext = recoveredProjection.rendered;
        const recovered = await runLlmGroupOrchestrator({
          ...recoveredInput,
          group,
        });
        const completion = completeGroupReactiveCompactRetry({
          groupId: group.id,
          groupSessionId,
          channel: "group_main_prompt_too_long",
          retryEpoch: contextId,
          claimId: retryClaim.entry.claim_id,
          fencingToken: retryClaim.entry.fencing_token,
          outcome: "recovered",
          outputChars: recoveredContext.length,
          reason: "reactive_compact_retry_succeeded",
        });
        reactiveCompactOwnership = {
          ...reactiveCompactOwnership,
          status: completion.status,
          completion_accepted: completion.accepted === true,
        };
        return {
          ...recovered,
          usage: mergeLlmTokenUsage(firstAttemptUsage, recovered?.usage),
          contextRecovery: {
              type: "formal-model-compact",
            originalChars: String(enrichedInput.context || "").length,
            recoveredChars: recoveredContext.length,
            ownership: reactiveCompactOwnership,
          },
        };
      } catch (recoveryError: any) {
        try {
          const completion = completeGroupReactiveCompactRetry({
            groupId: group.id,
            groupSessionId,
            channel: "group_main_prompt_too_long",
            retryEpoch: contextId,
            claimId: retryClaim.entry.claim_id,
            fencingToken: retryClaim.entry.fencing_token,
            outcome: "failed",
            reason: "reactive_compact_retry_failed",
            errorClass: recoveryError?.name || "Error",
            error: recoveryError?.message || String(recoveryError),
          });
          reactiveCompactOwnership = {
            ...reactiveCompactOwnership,
            status: completion.status,
            completion_accepted: completion.accepted === true,
          };
        } catch (completionError: any) {
          reactiveCompactOwnership = {
            ...reactiveCompactOwnership,
            status: "completion_failed",
            completion_issue: String(completionError?.message || completionError).slice(0, 180),
          };
        }
        error = attachLlmTokenUsage(recoveryError, firstAttemptUsage);
      }
    }
    const providerErrorSummary = summarizeGroupOrchestratorProviderError(error);
    if (config.fallbackToRules && safeCodedFallback) {
      const fallback = runCodedGroupOrchestrator({
        ...enrichedInput,
        group,
        context: [enrichedInput.context || "", enrichedInput.extraInstructions || ""].filter(Boolean).join("\n\n"),
      });
      return {
        ...fallback,
        runtime: "coded-fallback",
        usage: error?.usage || null,
        contextRecovery: reactiveCompactOwnership ? { type: "reactive-compact-not-retried", ownership: reactiveCompactOwnership } : undefined,
        agentBoundary: buildGroupMainAgentBoundary("coded_fallback"),
        content: informationalFallback ? fallback.content : `${fallback.content}\n\n主 Agent API 回退：${providerErrorSummary}`,
      };
    }
    return {
      agent: coordinator.project,
      delegated: [],
      assignments: [],
      runtime: "llm-error",
      usage: error?.usage || null,
      contextRecovery: reactiveCompactOwnership ? { type: "reactive-compact-not-retried", ownership: reactiveCompactOwnership } : undefined,
      agentBoundary: buildGroupMainAgentBoundary("llm-error"),
      content: [
        "主 Agent 大模型调用失败，本轮不分派子 Agent。",
        "",
        `错误：${providerErrorSummary}`,
        "",
        "请检查主 Agent API 配置、网络、模型名或 Key 是否有效。"
      ].join("\n"),
    };
  }
}


export function summarizeGroupOrchestratorProviderError(error: any) {
  const raw = String(error?.message || error || "主 Agent Provider 调用失败").trim();
  const status = raw.match(/\bHTTP\s+\d{3}\b/i);
  if (status?.index !== undefined) {
    return raw.slice(0, status.index + status[0].length).replace(/\s+/g, " ").replace(/[:：\s]+$/, "").slice(0, 220);
  }
  const firstLine = raw.split(/\r?\n/, 1)[0]
    .replace(/<!doctype[\s\S]*$/i, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (firstLine || "主 Agent Provider 调用失败").slice(0, 220);
}





export async function runGroupOrchestrator(input: GroupOrchestratorInput) {
  const startedAt = Date.now();
  const group = normalizeGroupOrchestrator(input.group);
  const coordinator = getCoordinatorMember(group);
  try {
    const result = await runGroupOrchestratorCore(input);
    const selectedRoleSkills = buildRoleSkillPrompt("group-main-agent", input.message, { source: input.source || "", phase: "planning" }).names;
    const runtime = String((result as any)?.runtime || "");
    recordMetric(coordinator.project, {
      success: !["llm-error", "llm-not-configured"].includes(runtime),
      durationMs: Date.now() - startedAt,
      fileChangeCount: 0,
      scopeType: "group",
      groupId: group.id,
      role: "main_agent",
      source: String(input.source || "group-orchestrator"),
      runtime,
      traceId: input.traceId || input.trace_id || "",
      taskId: input.taskId || input.task_id || "",
      executionId: input.executionId || input.execution_id || "",
      usage: (result as any)?.usage || null,
      error: runtime === "llm-error" ? "群聊主 Agent 大模型调用失败" : runtime === "llm-not-configured" ? "群聊主 Agent 模型未配置" : "",
    });
    return { ...result, selectedRoleSkills };
  } catch (error: any) {
    recordMetric(coordinator.project, {
      success: false,
      durationMs: Date.now() - startedAt,
      fileChangeCount: 0,
      scopeType: "group",
      groupId: group.id,
      role: "main_agent",
      source: String(input.source || "group-orchestrator"),
      traceId: input.traceId || input.trace_id || "",
      taskId: input.taskId || input.task_id || "",
      executionId: input.executionId || input.execution_id || "",
      usage: error?.usage || null,
      error: error?.message || String(error),
    });
    throw error;
  }
}





export function isContextLimitError(error: any) {
  const text = String(error?.message || error || "");
  return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|token limit/i.test(text);
}





export function buildReactiveCompactionContext(context: string, maxChars = 48_000) {
  const text = String(context || "");
  if (text.length <= maxChars) return text;
  const marker = "\n\n…[Reactive Compact：中间上下文已紧急折叠；原始群聊记录仍可按 message id 回溯]…\n\n";
  const head = Math.floor((maxChars - marker.length) * 0.58);
  const tail = Math.max(1, maxChars - marker.length - head);
  return `${text.slice(0, head)}${marker}${text.slice(-tail)}`;
}
