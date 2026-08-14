import {
  callAnthropicCompatibleJson,
  callOpenAiCompatibleJson,
  shouldUseAnthropic,
} from "../modules/collaboration/group-orchestrator-llm-client";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import { CCM_INTERNAL_SKILL_CATALOG } from "../skills/internal-skill-catalog";
import { runSemanticDecision } from "../system/semantic-decision-runtime";

export type WorkflowDecisionMode =
  | "answer"
  | "project_analysis"
  | "execute_direct"
  | "plan_task"
  | "decompose_epic";

export interface WorkflowDecision {
  schema: "ccm-model-workflow-decision-v1";
  mode: WorkflowDecisionMode;
  reason: string;
  confidence: number;
  needsPlanning: boolean;
  needsEpicDecomposition: boolean;
  actionRequired: boolean;
  continuationKind: "new_task" | "supplement" | "revise_goal";
  readAction: "none" | "inspect_status";
  targetRefs: string[];
  impactScope: string[];
  planSteps: string[];
  clarificationQuestions: string[];
  structuredClarificationQuestions: any[];
  selectedSkills: string[];
  intentKind: "conversation" | "question" | "status" | "analysis" | "execution" | "management" | "continuation";
  requiresCodeChanges: boolean;
  requiresAgentQa: boolean;
  requiresIndependentReview: boolean;
  verificationModes: Array<"commands" | "http" | "browser" | "visual" | "integration" | "release">;
  memoryPolicy: "use" | "ignore";
  sourcePolicy: "require_read" | "ignore_unread";
  authorizationDirective: "preserve" | "grant" | "revoke";
  riskLevel: "low" | "write" | "high";
  requiresUserConfirmation: boolean;
  directReplyReady: boolean;
  directReply: string;
  source: "model" | "explicit_user_choice";
  semanticDecisionReceipt?: any;
}

export const WORKFLOW_DECISION_GUIDANCE = `
你必须根据用户完整语义和当前上下文选择工作流，不能按关键词、正则或句子长度机械匹配。

可选工作流：
- answer：普通聊天、知识问答、原理说明、可行性咨询，不需要读取项目或执行动作。
- project_analysis：需要读取项目/任务现状后回答，但用户没有要求修改、运行或派发。
- execute_direct：目标明确、范围小、单项目或少量步骤，可直接执行并验证。
- plan_task：实现任务较复杂、需求不清、多文件、多方案或需要用户偏好，先生成执行前计划。
- decompose_epic：PRD/需求文档、跨项目或多个可独立验收子目标，需要生成持久 Epic/DAG 任务图。

判断原则：
1. 用户询问“怎么做/能否做/为什么”不等于授权执行。
2. 用户明确要求新增、修改、删除代码或项目配置时，requiresCodeChanges=true；仅运行、查询、构建、解释或诊断不等于开发任务。
3. 简单明确的修复不要过度拆 Epic；复杂、多目标、跨项目需求优先 plan_task 或 decompose_epic。
4. 附件或 URL 只是上下文，不自动意味着必须拆解；先理解用户对资料的真实要求。
5. 若本轮是在补充现有目标，continuationKind=supplement；若改变目标、范围、方案或验收，continuationKind=revise_goal；否则 new_task。
6. 事实或边界不足时列出最少且关键的 clarificationQuestions，不得猜测。
7. 用户询问现有任务进度/状态时选择 project_analysis，并设置 readAction=inspect_status；不要靠本地状态关键词抢跑。

示例：
- “这个项目用了什么架构？” => project_analysis
- “登录刷新为什么丢状态？” => project_analysis
- “修复登录刷新丢状态并跑现有测试” => execute_direct
- “增加用户认证，具体方案你先分析后给计划” => plan_task
- “按这份 PRD 开发订单履约，前后端和测试都要拆开跟踪” => decompose_epic
- “介绍一下 PRD 是什么” => answer
- “现在这个任务进展怎么样？” => project_analysis + inspect_status
`.trim();

const MODES = new Set<WorkflowDecisionMode>([
  "answer",
  "project_analysis",
  "execute_direct",
  "plan_task",
  "decompose_epic",
]);

function list(value: any, max = 12) {
  return Array.isArray(value)
    ? value.map(item => String(item || "").trim()).filter(Boolean).slice(0, max)
    : [];
}

function structuredClarifications(value: any) {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === "object").slice(0, 3)
    : [];
}

const INTERNAL_SKILL_NAMES = new Set<string>(CCM_INTERNAL_SKILL_CATALOG.map(item => item.name));
const INTENT_KINDS = new Set(["conversation", "question", "status", "analysis", "execution", "management", "continuation"]);
const VERIFICATION_MODES = new Set(["commands", "http", "browser", "visual", "integration", "release"]);

export function normalizeWorkflowDecision(value: any, source: WorkflowDecision["source"] = "model"): WorkflowDecision {
  const rawMode = String(value?.mode || value?.workflowMode || "").trim() as WorkflowDecisionMode;
  if (!MODES.has(rawMode)) {
    const error: any = new Error(`大模型返回了无效工作流：${rawMode || "空"}`);
    error.code = "CCM_WORKFLOW_DECISION_INVALID";
    error.workflowMode = rawMode;
    throw error;
  }
  const needsEpicDecomposition = rawMode === "decompose_epic" || value?.needsEpicDecomposition === true;
  const needsPlanning = needsEpicDecomposition || rawMode === "plan_task" || value?.needsPlanning === true;
  const rawContinuation = String(value?.continuationKind || value?.continuation_kind || "new_task").trim();
  const continuationKind = ["supplement", "revise_goal"].includes(rawContinuation)
    ? rawContinuation as "supplement" | "revise_goal"
    : "new_task";
  const directReply = String(value?.directReply || value?.direct_reply || "").trim().slice(0, 4_000);
  const directReplyReady = rawMode === "answer"
    && value?.directReplyReady === true
    && !!directReply;
  const semanticDecisionReceipt = value?.semanticDecisionReceipt || value?.semantic_decision_receipt || null;
  return {
    schema: "ccm-model-workflow-decision-v1",
    mode: rawMode,
    reason: String(value?.reason || "大模型已根据完整语义选择工作流").trim().slice(0, 1200),
    confidence: Math.max(0, Math.min(1, Number(value?.confidence ?? 0.8))),
    needsPlanning,
    needsEpicDecomposition,
    actionRequired: ["execute_direct", "plan_task", "decompose_epic"].includes(rawMode)
      ? value?.actionRequired !== false
      : false,
    continuationKind,
    readAction: String(value?.readAction || value?.read_action || "none") === "inspect_status" ? "inspect_status" : "none",
    targetRefs: list(value?.targetRefs || value?.target_refs),
    impactScope: list(value?.impactScope || value?.impact_scope),
    planSteps: list(value?.planSteps || value?.plan_steps, 16),
    clarificationQuestions: list(value?.clarificationQuestions || value?.clarification_questions, 6),
    structuredClarificationQuestions: structuredClarifications(value?.structuredClarificationQuestions || value?.structured_clarification_questions),
    selectedSkills: list(value?.selectedSkills || value?.selected_skills, 6).filter(name => INTERNAL_SKILL_NAMES.has(name)),
    intentKind: INTENT_KINDS.has(String(value?.intentKind || value?.intent_kind || ""))
      ? String(value?.intentKind || value?.intent_kind) as WorkflowDecision["intentKind"]
      : rawMode === "answer" ? "conversation" : rawMode === "project_analysis" ? "analysis" : "execution",
    requiresCodeChanges: value?.requiresCodeChanges === true || value?.requires_code_changes === true,
    requiresAgentQa: value?.requiresAgentQa === true || value?.requires_agent_qa === true,
    requiresIndependentReview: value?.requiresIndependentReview === true || value?.requires_independent_review === true,
    verificationModes: list(value?.verificationModes || value?.verification_modes, 6)
      .filter(mode => VERIFICATION_MODES.has(mode)) as WorkflowDecision["verificationModes"],
    memoryPolicy: String(value?.memoryPolicy || value?.memory_policy || "use") === "ignore" ? "ignore" : "use",
    sourcePolicy: String(value?.sourcePolicy || value?.source_policy || "require_read") === "ignore_unread"
      ? "ignore_unread"
      : "require_read",
    authorizationDirective: ["grant", "revoke"].includes(String(value?.authorizationDirective || value?.authorization_directive || ""))
      ? String(value?.authorizationDirective || value?.authorization_directive) as "grant" | "revoke"
      : "preserve",
    riskLevel: ["write", "high"].includes(String(value?.riskLevel || value?.risk_level || ""))
      ? String(value?.riskLevel || value?.risk_level) as "write" | "high"
      : "low",
    requiresUserConfirmation: value?.requiresUserConfirmation === true || value?.requires_user_confirmation === true,
    directReplyReady,
    directReply: directReplyReady ? directReply : "",
    source,
    ...(semanticDecisionReceipt ? { semanticDecisionReceipt } : {}),
  };
}

export function isDevelopmentTaskWorkflowDecision(value: any): boolean {
  const mode = String(value?.mode || value?.workflowMode || "").trim();
  return value?.actionRequired === true
    && (value?.requiresCodeChanges === true || value?.requires_code_changes === true)
    && ["execute_direct", "plan_task", "decompose_epic"].includes(mode);
}

export function explicitWorkflowDecision(
  mode: WorkflowDecisionMode,
  reason: string,
  overrides: Partial<WorkflowDecision> = {},
): WorkflowDecision {
  return {
    ...normalizeWorkflowDecision({ mode, reason, confidence: 1 }, "explicit_user_choice"),
    ...overrides,
    schema: "ccm-model-workflow-decision-v1",
    mode,
    reason,
    source: "explicit_user_choice",
  };
}

export async function decideWorkflowWithModel(input: {
  message: string;
  scope: "global" | "group" | "project";
  context?: any;
  sourceCount?: number;
}): Promise<WorkflowDecision> {
  const config = loadOrchestratorConfig();
  if (!config.enabled || !String(config.apiUrl || "").trim() || !String(config.apiKey || "").trim() || !String(config.model || "").trim()) {
    throw new Error("统一大模型尚未配置，无法形成可靠工作流决策");
  }
  const messages = [
    {
      role: "system",
      content: `${WORKFLOW_DECISION_GUIDANCE}

你还必须完成语义能力选择：
- selectedSkills 只能从给定 Skill 目录选择真正需要的项，最多 6 个；不要按关键词机械匹配。
- intentKind 表示用户真实交互意图；status 只用于查询现有进度，management 用于管理已有资源。
- requiresCodeChanges 只有在完成目标确实需要修改源码时才为 true；运行、查询、构建和解释不等于改代码。
- requiresAgentQa 只有在任务确实需要子 Agent 互相询问或澄清接口时才为 true。
- requiresIndependentReview 只有在风险、范围或验收要求需要独立复核者时才为 true。
- verificationModes 根据目标选择 commands/http/browser/visual/integration/release；不需要验证时为空数组。
- memoryPolicy 只有用户明确要求本轮不使用历史记忆时才为 ignore，否则为 use。
- sourcePolicy 只有用户在已知资料未读取的情况下明确允许忽略这些资料并继续时才为 ignore_unread，否则必须为 require_read。
- authorizationDirective 表示本轮是否明确授予或撤销已有执行授权；没有明确改变时必须为 preserve。
- riskLevel 根据用户要求的实际操作选择 low/write/high；requiresUserConfirmation 只表示语义上需要确认，最终权限仍由服务端工具门禁决定。
- 模型无法可靠判断时通过 structuredClarificationQuestions 提问，不得用本地规则补选。只询问会改变业务流程、实施范围、权限或验收的问题；代码和配置中可查明的问题不得询问。最多3项，每项最多4个选项；兼容旧 clarificationQuestions 字符串数组。
- 当且仅当当前消息本身已经足够回答、不需要会话历史、记忆、知识库、Skill、MCP、项目状态或任何工具时，可以设置 directReplyReady=true，并在 directReply 中直接给出面向用户的完整自然语言回复。
- 问候、致谢等自包含普通交流通常可以直接回复；存在指代不明、需要历史上下文、需要查证事实、状态查询、项目分析或任何执行动作时，directReplyReady 必须为 false。
- directReplyReady 只是减少重复模型调用，不能绕过语义判断、权限、上下文或工具门禁。

可用 Skill 目录：
${CCM_INTERNAL_SKILL_CATALOG.map(item => `- ${item.name}: ${item.description}`).join("\n")}

只输出合法 JSON：
{"mode":"answer|project_analysis|execute_direct|plan_task|decompose_epic","reason":"判断依据","confidence":0.95,"needsPlanning":false,"needsEpicDecomposition":false,"actionRequired":false,"continuationKind":"new_task|supplement|revise_goal","readAction":"none|inspect_status","targetRefs":[],"impactScope":[],"planSteps":[],"clarificationQuestions":[],"structuredClarificationQuestions":[{"id":"business_rule","label":"需要确认的问题","reason":"为什么影响方案","type":"single|multiple|text","required":true,"options":[{"id":"option_1","label":"选项","description":"影响","recommended":true,"safeDefault":true}]}],"selectedSkills":[],"intentKind":"conversation|question|status|analysis|execution|management|continuation","requiresCodeChanges":false,"requiresAgentQa":false,"requiresIndependentReview":false,"verificationModes":[],"memoryPolicy":"use|ignore","sourcePolicy":"require_read|ignore_unread","authorizationDirective":"preserve|grant|revoke","riskLevel":"low|write|high","requiresUserConfirmation":false,"directReplyReady":false,"directReply":""}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        scope: input.scope,
        message: String(input.message || ""),
        source_count: Number(input.sourceCount || 0),
        context: input.context || {},
      }),
    },
  ];
  const context = input.context || {};
  const scopeId = input.scope === "group"
    ? String(context.group_id || context.groupId || "")
    : input.scope === "project"
      ? String(context.project || context.project_id || context.projectId || "")
      : "global-agent";
  const sessionId = String(context.session_id || context.sessionId || context.group_session_id || context.groupSessionId || context.project_session_id || context.projectSessionId || `${input.scope}:${scopeId || "default"}`);
  const result = await runSemanticDecision({
    kind: "workflow",
    identity: { scope: input.scope, scopeId: scopeId || `${input.scope}-agent`, sessionId },
    system: String(messages[0].content || ""),
    input: JSON.parse(String(messages[1].content || "{}")),
    maxTokens: 900,
    reasoningEffort: "low",
    validate: value => normalizeWorkflowDecision(value, "model"),
    confidence: value => value.confidence,
  });
  return { ...result.value, semanticDecisionReceipt: result.receipt };
}

export function runWorkflowDecisionContractSelfTest() {
  const cases = [
    normalizeWorkflowDecision({ mode: "answer", reason: "问答", confidence: 0.9 }),
    normalizeWorkflowDecision({ mode: "project_analysis", reason: "只读分析", continuationKind: "supplement" }),
    normalizeWorkflowDecision({ mode: "execute_direct", reason: "简单执行", selectedSkills: ["ccm-interface-data-contract", "unknown"], requiresCodeChanges: true, verificationModes: ["commands", "invalid"] }),
    normalizeWorkflowDecision({ mode: "plan_task", reason: "复杂实现" }),
    normalizeWorkflowDecision({ mode: "decompose_epic", reason: "多目标需求", clarificationQuestions: ["边界？"] }),
  ];
  const direct = normalizeWorkflowDecision({
    mode: "answer",
    reason: "自包含问候",
    directReplyReady: true,
    directReply: "你好！有什么可以帮你？",
  });
  const unsafeDirect = normalizeWorkflowDecision({
    mode: "project_analysis",
    reason: "需要读取项目",
    directReplyReady: true,
    directReply: "不应直接回答",
  });
  return {
    success: cases.length === 5
      && cases[0].actionRequired === false
      && cases[2].actionRequired === true
      && cases[2].selectedSkills.join(",") === "ccm-interface-data-contract"
      && cases[2].requiresCodeChanges === true
      && cases[2].verificationModes.join(",") === "commands"
      && cases[3].needsPlanning === true
      && cases[4].needsEpicDecomposition === true
      && direct.directReplyReady === true
      && direct.directReply === "你好！有什么可以帮你？"
      && unsafeDirect.directReplyReady === false
      && unsafeDirect.directReply === "",
    cases,
    direct,
    unsafeDirect,
  };
}
