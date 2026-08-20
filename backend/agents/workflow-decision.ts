import {
  callAnthropicCompatibleJson,
  callOpenAiCompatibleJson,
  shouldUseAnthropic,
} from "../modules/collaboration/group-orchestrator-llm-client";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import { CCM_INTERNAL_SKILL_CATALOG } from "../skills/internal-skill-catalog";
import { runSemanticDecision } from "../system/semantic-decision-runtime";
import { composeInternalPrompt } from "./internal-prompt-contract";

export interface WorkflowDecision {
  schema: "ccm-model-workflow-decision-v2";
  reason: string;
  confidence: number;
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
Select the next action from the user's complete meaning and the current context. Never classify by keyword, regex, message length, attachment presence, or local status labels.

Rules:
1. Asking how, whether, or why is not authorization to execute.
2. Explicitly adding, changing, deleting, fixing, updating, or implementing code or project configuration requires actionRequired=true and requiresCodeChanges=true. Running, querying, building, explaining, or diagnosing alone is not a development task.
3. Set needsEpicDecomposition=true when the request needs an internal task graph for a PRD, multiple projects, or independently verifiable objectives. The server decides whether a user-confirmed plan is required based on actual scope, risk, permissions, and evidence. Simple explicit changes may dispatch directly.
4. Attachments and URLs are context; they do not automatically require decomposition. First determine what the user wants done with them.
5. Use continuationKind=supplement when the message adds to the current goal, revise_goal when it changes the goal, scope, approach, or acceptance, and new_task otherwise.
6. If facts or boundaries are insufficient, ask the minimum clarificationQuestions that can change scope, permission, or acceptance. Never guess.
7. For a task status request set readAction=inspect_status, actionRequired=false, and requiresCodeChanges=false. Do not use local status keywords as a shortcut.

Examples:
- "What architecture does this project use?" => actionRequired=false, requiresCodeChanges=false
- "Why does login state disappear after refresh?" => actionRequired=false, requiresCodeChanges=false
- "Fix the login refresh issue and run the existing tests." => actionRequired=true, requiresCodeChanges=true
- "Add user authentication; analyze the approach first, then implement it." => actionRequired=true, requiresCodeChanges=true
- "Build order fulfillment from this PRD and track frontend, backend, and tests separately." => actionRequired=true, requiresCodeChanges=true, needsEpicDecomposition=true
- "What is a PRD?" => actionRequired=false, requiresCodeChanges=false
- "How is the current task progressing?" => readAction=inspect_status
`.trim();

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
  const legacyFields = ["mode", "workflowMode", "workflow_mode", "needsPlanning", "needs_planning"]
    .filter(key => Object.prototype.hasOwnProperty.call(value || {}, key));
  if (legacyFields.length) {
    const error: any = new Error(`大模型返回了已移除的工作流字段：${legacyFields.join(", ")}`);
    error.code = "CCM_WORKFLOW_DECISION_LEGACY_FIELD";
    error.legacyFields = legacyFields;
    throw error;
  }
  const needsEpicDecomposition = value?.needsEpicDecomposition === true || value?.needs_epic_decomposition === true;
  const actionRequired = value?.actionRequired === true || value?.action_required === true;
  const requiresCodeChanges = value?.requiresCodeChanges === true || value?.requires_code_changes === true;
  const rawContinuation = String(value?.continuationKind || value?.continuation_kind || "new_task").trim();
  const continuationKind = ["supplement", "revise_goal"].includes(rawContinuation)
    ? rawContinuation as "supplement" | "revise_goal"
    : "new_task";
  const directReply = String(value?.directReply || value?.direct_reply || "").trim().slice(0, 4_000);
  const readAction = String(value?.readAction || value?.read_action || "none") === "inspect_status" ? "inspect_status" : "none";
  const rawStructuredClarifications = structuredClarifications(value?.structuredClarificationQuestions || value?.structured_clarification_questions);
  const rawClarificationQuestions = list(value?.clarificationQuestions || value?.clarification_questions, 6);
  const selectedSkills = list(value?.selectedSkills || value?.selected_skills, 6).filter(name => INTERNAL_SKILL_NAMES.has(name));
  const directReplyReady = actionRequired === false
    && requiresCodeChanges === false
    && readAction === "none"
    && rawStructuredClarifications.length === 0
    && rawClarificationQuestions.length === 0
    && selectedSkills.length === 0
    && value?.directReplyReady === true
    && !!directReply;
  const semanticDecisionReceipt = value?.semanticDecisionReceipt || value?.semantic_decision_receipt || null;
  return {
    schema: "ccm-model-workflow-decision-v2",
    reason: String(value?.reason || "大模型已根据完整语义选择工作流").trim().slice(0, 1200),
    confidence: Math.max(0, Math.min(1, Number(value?.confidence ?? 0.8))),
    needsEpicDecomposition,
    actionRequired,
    continuationKind,
    readAction,
    targetRefs: list(value?.targetRefs || value?.target_refs),
    impactScope: list(value?.impactScope || value?.impact_scope),
    planSteps: list(value?.planSteps || value?.plan_steps, 16),
    clarificationQuestions: rawClarificationQuestions,
    structuredClarificationQuestions: rawStructuredClarifications,
    selectedSkills,
    intentKind: INTENT_KINDS.has(String(value?.intentKind || value?.intent_kind || ""))
      ? String(value?.intentKind || value?.intent_kind) as WorkflowDecision["intentKind"]
      : actionRequired ? "execution" : readAction === "inspect_status" ? "status" : "conversation",
    requiresCodeChanges,
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
  return value?.actionRequired === true
    && (value?.requiresCodeChanges === true || value?.requires_code_changes === true);
}

export function explicitWorkflowDecision(
  reason: string,
  overrides: Partial<WorkflowDecision> = {},
): WorkflowDecision {
  return {
    ...normalizeWorkflowDecision({ reason, confidence: 1, actionRequired: false, requiresCodeChanges: false, ...overrides }, "explicit_user_choice"),
    ...overrides,
    schema: "ccm-model-workflow-decision-v2",
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
  const workflowPrompt = composeInternalPrompt("workflow-decision", input.scope, [WORKFLOW_DECISION_GUIDANCE, `You must also select semantic capabilities:
- selectedSkills must contain only genuinely relevant entries from the provided Skill catalog, at most six; never match mechanically.
- intentKind describes the user's actual intent. Use status only for querying existing progress and management only for managing existing resources.
- requiresCodeChanges is true only when completing the goal requires source changes; running, querying, building, and explaining do not imply code changes.
- requiresAgentQa and requiresIndependentReview are true only when the stated risk, scope, or acceptance requires them.
- verificationModes may contain commands, http, browser, visual, integration, or release.
- memoryPolicy is ignore only when the user explicitly requests no historical memory; otherwise use.
- sourcePolicy is ignore_unread only when the user explicitly permits continuing without known unread material; otherwise require_read.
- authorizationDirective is grant or revoke only when the current message explicitly changes authorization; otherwise preserve.
- riskLevel reflects the actual requested operation. requiresUserConfirmation is for business ambiguity, permission, or high-risk safety confirmation, not complexity alone.
- When uncertain, use structuredClarificationQuestions. Ask at most three questions with at most four options each; do not ask what repository evidence can answer.
- directReplyReady is allowed only when the current message is self-contained and needs no history, memory, knowledge, Skill, MCP, project state, or tool. It must be false for ambiguous references, fact checks, status requests, project analysis, or actions.

Available Skill catalog:
${CCM_INTERNAL_SKILL_CATALOG.map(item => `- ${item.name}: ${item.description}`).join("\n")}

Return exactly one valid JSON object and no Markdown. Use this shape:
{"reason":"decision basis","confidence":0.95,"needsEpicDecomposition":false,"actionRequired":false,"continuationKind":"new_task|supplement|revise_goal","readAction":"none|inspect_status","targetRefs":[],"impactScope":[],"planSteps":[],"clarificationQuestions":[],"structuredClarificationQuestions":[{"id":"business_rule","label":"question","reason":"why it changes the plan","type":"single|multiple|text","required":true,"options":[{"id":"option_1","label":"option","description":"impact","recommended":true,"safeDefault":true}]}],"selectedSkills":[],"intentKind":"conversation|question|status|analysis|execution|management|continuation","requiresCodeChanges":false,"requiresAgentQa":false,"requiresIndependentReview":false,"verificationModes":[],"memoryPolicy":"use|ignore","sourcePolicy":"require_read|ignore_unread","authorizationDirective":"preserve|grant|revoke","riskLevel":"low|write|high","requiresUserConfirmation":false,"directReplyReady":false,"directReply":""}`], { includeSecurity: true, includeOutputLanguage: true });
  const messages = [
    {
      role: "system",
      content: workflowPrompt.content,
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
  let legacyRejected = false;
  try {
    normalizeWorkflowDecision({ mode: "answer", reason: "旧结构", actionRequired: false, requiresCodeChanges: false });
  } catch (error: any) {
    legacyRejected = error?.code === "CCM_WORKFLOW_DECISION_LEGACY_FIELD";
  }
  const cases = [
    normalizeWorkflowDecision({ reason: "问答", confidence: 0.9, actionRequired: false, requiresCodeChanges: false }),
    normalizeWorkflowDecision({ reason: "只读分析", continuationKind: "supplement", actionRequired: false, requiresCodeChanges: false }),
    normalizeWorkflowDecision({ reason: "开发执行", actionRequired: true, selectedSkills: ["ccm-interface-data-contract", "unknown"], requiresCodeChanges: true, verificationModes: ["commands", "invalid"] }),
    normalizeWorkflowDecision({ reason: "多目标需求", actionRequired: true, requiresCodeChanges: true, needsEpicDecomposition: true, clarificationQuestions: ["边界？"] }),
  ];
  const direct = normalizeWorkflowDecision({
    reason: "自包含问候",
    actionRequired: false,
    requiresCodeChanges: false,
    directReplyReady: true,
    directReply: "你好！有什么可以帮你？",
  });
  const unsafeDirect = normalizeWorkflowDecision({
    reason: "需要读取项目",
    actionRequired: false,
    requiresCodeChanges: false,
    selectedSkills: ["ccm-project-source-research"],
    directReplyReady: true,
    directReply: "不应直接回答",
  });
  return {
    success: cases.length === 4
      && cases[0].actionRequired === false
      && cases[2].actionRequired === true
      && cases[2].selectedSkills.join(",") === "ccm-interface-data-contract"
      && cases[2].requiresCodeChanges === true
      && cases[2].verificationModes.join(",") === "commands"
      && cases[3].needsEpicDecomposition === true
      && direct.directReplyReady === true
      && direct.directReply === "你好！有什么可以帮你？"
      && unsafeDirect.directReplyReady === false
      && unsafeDirect.directReply === ""
      && legacyRejected,
    cases,
    direct,
    unsafeDirect,
    legacyRejected,
  };
}
