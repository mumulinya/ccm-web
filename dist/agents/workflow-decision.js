"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_DECISION_GUIDANCE = void 0;
exports.normalizeWorkflowDecision = normalizeWorkflowDecision;
exports.isDevelopmentTaskWorkflowDecision = isDevelopmentTaskWorkflowDecision;
exports.explicitWorkflowDecision = explicitWorkflowDecision;
exports.decideWorkflowWithModel = decideWorkflowWithModel;
exports.runWorkflowDecisionContractSelfTest = runWorkflowDecisionContractSelfTest;
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
const internal_skill_catalog_1 = require("../skills/internal-skill-catalog");
const semantic_decision_runtime_1 = require("../system/semantic-decision-runtime");
const internal_prompt_contract_1 = require("./internal-prompt-contract");
exports.WORKFLOW_DECISION_GUIDANCE = `
Select the next action from the user's complete meaning and the current context. Never classify by keyword, regex, message length, attachment presence, or local status labels.

Rules:
1. Asking how, whether, or why is not authorization to execute.
2. Explicitly adding, changing, deleting, fixing, updating, or implementing code or project configuration requires actionRequired=true and requiresCodeChanges=true. Running, querying, building, explaining, or diagnosing alone is not a development task.
3. Set needsEpicDecomposition=true when the request needs an internal task graph for a PRD, multiple projects, or independently verifiable objectives. The server decides whether a user-confirmed plan is required based on actual scope, risk, permissions, and evidence. Simple explicit changes may dispatch directly.
4. Attachments and URLs are context; they do not automatically require decomposition. First determine what the user wants done with them.
5. Use continuationKind=supplement when the message adds to the current goal, revise_goal when it changes the goal, scope, approach, or acceptance, and new_task otherwise.
6. If facts or boundaries are insufficient, ask the minimum clarificationQuestions that can change scope, permission, or acceptance. Never guess.
7. For a task status request set readAction=inspect_status, actionRequired=false, and requiresCodeChanges=false. Do not use local status keywords as a shortcut.
8. For a question whose answer depends on the current project source, set readAction=inspect_source. Use sourceReadDepth=focused for a named file, symbol, or narrow behavior, and broad only when the cause or affected modules cannot be bounded yet. These fields describe the evidence need, not the current Agent's file permissions.
9. Ordinary conversation and general knowledge use readAction=none and sourceReadDepth=none. If the user explicitly asks for a general explanation without inspecting the current project, answer generally and state that the current source was not verified.
10. Set mainAgentIntent to exactly one user-facing workflow: direct_reply, status_inspection, management_action, source_inquiry, development_request, or task_supervision. CCM resource management is not a development request and must not create a development task.
11. managementRisk is read_only for inspection/list operations, mutable for authorized non-destructive changes, and destructive for deletion, stopping, removal, overwrite, or similarly high-impact operations. The server remains authoritative and may raise but never lower the risk.

Examples:
- "What architecture does this project use?" => actionRequired=false, requiresCodeChanges=false, readAction=inspect_source, sourceReadDepth=broad
- "Why does login state disappear after refresh?" => actionRequired=false, requiresCodeChanges=false, readAction=inspect_source, sourceReadDepth=focused
- "Fix the login refresh issue and run the existing tests." => actionRequired=true, requiresCodeChanges=true
- "Add user authentication; analyze the approach first, then implement it." => actionRequired=true, requiresCodeChanges=true
- "Build order fulfillment from this PRD and track frontend, backend, and tests separately." => actionRequired=true, requiresCodeChanges=true, needsEpicDecomposition=true
- "What is a PRD?" => actionRequired=false, requiresCodeChanges=false
- "How is the current task progressing?" => readAction=inspect_status
`.trim();
function list(value, max = 12) {
    return Array.isArray(value)
        ? value.map(item => String(item || "").trim()).filter(Boolean).slice(0, max)
        : [];
}
function structuredClarifications(value) {
    return Array.isArray(value)
        ? value.filter(item => item && typeof item === "object").slice(0, 3)
        : [];
}
const INTERNAL_SKILL_NAMES = new Set(internal_skill_catalog_1.CCM_INTERNAL_SKILL_CATALOG.map(item => item.name));
const INTENT_KINDS = new Set(["conversation", "question", "status", "analysis", "execution", "management", "continuation"]);
const MAIN_AGENT_INTENTS = new Set(["direct_reply", "status_inspection", "management_action", "source_inquiry", "development_request", "task_supervision"]);
const MANAGEMENT_RISKS = new Set(["read_only", "mutable", "destructive"]);
const VERIFICATION_MODES = new Set(["commands", "http", "browser", "visual", "integration", "release"]);
function defaultMainAgentIntent(input) {
    if (input.intentKind === "management")
        return "management_action";
    if (input.intentKind === "continuation")
        return "task_supervision";
    if (input.actionRequired && input.requiresCodeChanges)
        return "development_request";
    if (input.readAction === "inspect_source")
        return "source_inquiry";
    if (input.readAction === "inspect_status" || input.intentKind === "status")
        return "status_inspection";
    return "direct_reply";
}
function normalizeWorkflowDecision(value, source = "model") {
    const legacyFields = ["mode", "workflowMode", "workflow_mode", "needsPlanning", "needs_planning"]
        .filter(key => Object.prototype.hasOwnProperty.call(value || {}, key));
    if (legacyFields.length) {
        const error = new Error(`大模型返回了已移除的工作流字段：${legacyFields.join(", ")}`);
        error.code = "CCM_WORKFLOW_DECISION_LEGACY_FIELD";
        error.legacyFields = legacyFields;
        throw error;
    }
    const needsEpicDecomposition = value?.needsEpicDecomposition === true || value?.needs_epic_decomposition === true;
    const actionRequired = value?.actionRequired === true || value?.action_required === true;
    const requiresCodeChanges = value?.requiresCodeChanges === true || value?.requires_code_changes === true;
    const rawContinuation = String(value?.continuationKind || value?.continuation_kind || "new_task").trim();
    const continuationKind = ["supplement", "revise_goal"].includes(rawContinuation)
        ? rawContinuation
        : "new_task";
    const directReply = String(value?.directReply || value?.direct_reply || "").trim().slice(0, 4_000);
    const rawReadAction = String(value?.readAction || value?.read_action || "none");
    const readAction = ["inspect_status", "inspect_source"].includes(rawReadAction)
        ? rawReadAction
        : "none";
    const rawSourceReadDepth = String(value?.sourceReadDepth || value?.source_read_depth || "none");
    const sourceReadDepth = readAction === "inspect_source"
        ? (["focused", "broad"].includes(rawSourceReadDepth) ? rawSourceReadDepth : "focused")
        : "none";
    const rawStructuredClarifications = structuredClarifications(value?.structuredClarificationQuestions || value?.structured_clarification_questions);
    const rawClarificationQuestions = list(value?.clarificationQuestions || value?.clarification_questions, 6);
    const selectedSkills = list(value?.selectedSkills || value?.selected_skills, 6).filter(name => INTERNAL_SKILL_NAMES.has(name));
    const rawIntentKind = String(value?.intentKind || value?.intent_kind || "");
    const intentKind = INTENT_KINDS.has(rawIntentKind)
        ? rawIntentKind
        : actionRequired ? "execution" : readAction === "inspect_status" ? "status" : readAction === "inspect_source" ? "analysis" : "conversation";
    const rawMainAgentIntent = String(value?.mainAgentIntent || value?.main_agent_intent || "");
    const mainAgentIntent = MAIN_AGENT_INTENTS.has(rawMainAgentIntent)
        ? rawMainAgentIntent
        : defaultMainAgentIntent({ actionRequired, requiresCodeChanges, readAction, intentKind });
    const rawManagementRisk = String(value?.managementRisk || value?.management_risk || "");
    const policyRisk = String(value?.riskLevel || value?.risk_level || "") === "high"
        ? "destructive"
        : String(value?.riskLevel || value?.risk_level || "") === "write" ? "mutable" : "read_only";
    const riskRank = { read_only: 0, mutable: 1, destructive: 2 };
    const requestedManagementRisk = MANAGEMENT_RISKS.has(rawManagementRisk) ? rawManagementRisk : "read_only";
    const managementRisk = ["management_action", "task_supervision"].includes(mainAgentIntent)
        ? (riskRank[policyRisk] > riskRank[requestedManagementRisk] ? policyRisk : requestedManagementRisk)
        : "read_only";
    const directReplyReady = actionRequired === false
        && requiresCodeChanges === false
        && readAction === "none"
        && mainAgentIntent === "direct_reply"
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
        sourceReadDepth,
        targetRefs: list(value?.targetRefs || value?.target_refs),
        impactScope: list(value?.impactScope || value?.impact_scope),
        planSteps: list(value?.planSteps || value?.plan_steps, 16),
        clarificationQuestions: rawClarificationQuestions,
        structuredClarificationQuestions: rawStructuredClarifications,
        selectedSkills,
        mainAgentIntent,
        managementRisk,
        intentKind,
        requiresCodeChanges,
        requiresAgentQa: value?.requiresAgentQa === true || value?.requires_agent_qa === true,
        requiresIndependentReview: value?.requiresIndependentReview === true || value?.requires_independent_review === true,
        verificationModes: list(value?.verificationModes || value?.verification_modes, 6)
            .filter(mode => VERIFICATION_MODES.has(mode)),
        memoryPolicy: String(value?.memoryPolicy || value?.memory_policy || "use") === "ignore" ? "ignore" : "use",
        sourcePolicy: String(value?.sourcePolicy || value?.source_policy || "require_read") === "ignore_unread"
            ? "ignore_unread"
            : "require_read",
        authorizationDirective: ["grant", "revoke"].includes(String(value?.authorizationDirective || value?.authorization_directive || ""))
            ? String(value?.authorizationDirective || value?.authorization_directive)
            : "preserve",
        riskLevel: ["write", "high"].includes(String(value?.riskLevel || value?.risk_level || ""))
            ? String(value?.riskLevel || value?.risk_level)
            : "low",
        requiresUserConfirmation: value?.requiresUserConfirmation === true || value?.requires_user_confirmation === true,
        directReplyReady,
        directReply: directReplyReady ? directReply : "",
        source,
        ...(semanticDecisionReceipt ? { semanticDecisionReceipt } : {}),
    };
}
function isDevelopmentTaskWorkflowDecision(value) {
    return value?.actionRequired === true
        && (value?.requiresCodeChanges === true || value?.requires_code_changes === true)
        && !["management_action", "task_supervision"].includes(String(value?.mainAgentIntent || value?.main_agent_intent || ""));
}
function explicitWorkflowDecision(reason, overrides = {}) {
    return {
        ...normalizeWorkflowDecision({ reason, confidence: 1, actionRequired: false, requiresCodeChanges: false, ...overrides }, "explicit_user_choice"),
        ...overrides,
        schema: "ccm-model-workflow-decision-v2",
        reason,
        source: "explicit_user_choice",
    };
}
async function decideWorkflowWithModel(input) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!config.enabled || !String(config.apiUrl || "").trim() || !String(config.apiKey || "").trim() || !String(config.model || "").trim()) {
        throw new Error("统一大模型尚未配置，无法形成可靠工作流决策");
    }
    const workflowPrompt = (0, internal_prompt_contract_1.composeInternalPrompt)("workflow-decision", input.scope, [exports.WORKFLOW_DECISION_GUIDANCE, `You must also select semantic capabilities:
- selectedSkills must contain only genuinely relevant entries from the provided Skill catalog, at most six; never match mechanically.
- mainAgentIntent is the authoritative workflow class. Management actions operate CCM resources through controlled APIs and must never be labeled development_request merely because they mutate CCM state.
- managementRisk is read_only, mutable, or destructive. Stopping, deleting, removing, overwriting, or similarly high-impact operations are destructive and require the existing server confirmation gate.
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
${internal_skill_catalog_1.CCM_INTERNAL_SKILL_CATALOG.map(item => `- ${item.name}: ${item.description}`).join("\n")}

Return exactly one valid JSON object and no Markdown. Use this shape:
{"reason":"decision basis","confidence":0.95,"needsEpicDecomposition":false,"actionRequired":false,"continuationKind":"new_task|supplement|revise_goal","readAction":"none|inspect_status|inspect_source","sourceReadDepth":"none|focused|broad","targetRefs":[],"impactScope":[],"planSteps":[],"clarificationQuestions":[],"structuredClarificationQuestions":[{"id":"business_rule","label":"question","reason":"why it changes the plan","type":"single|multiple|text","required":true,"options":[{"id":"option_1","label":"option","description":"impact","recommended":true,"safeDefault":true}]}],"selectedSkills":[],"mainAgentIntent":"direct_reply|status_inspection|management_action|source_inquiry|development_request|task_supervision","managementRisk":"read_only|mutable|destructive","intentKind":"conversation|question|status|analysis|execution|management|continuation","requiresCodeChanges":false,"requiresAgentQa":false,"requiresIndependentReview":false,"verificationModes":[],"memoryPolicy":"use|ignore","sourcePolicy":"require_read|ignore_unread","authorizationDirective":"preserve|grant|revoke","riskLevel":"low|write|high","requiresUserConfirmation":false,"directReplyReady":false,"directReply":""}`], { includeSecurity: true, includeOutputLanguage: true });
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
    const result = await (0, semantic_decision_runtime_1.runSemanticDecision)({
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
function runWorkflowDecisionContractSelfTest() {
    let legacyRejected = false;
    try {
        normalizeWorkflowDecision({ mode: "answer", reason: "旧结构", actionRequired: false, requiresCodeChanges: false });
    }
    catch (error) {
        legacyRejected = error?.code === "CCM_WORKFLOW_DECISION_LEGACY_FIELD";
    }
    const cases = [
        normalizeWorkflowDecision({ reason: "问答", confidence: 0.9, actionRequired: false, requiresCodeChanges: false }),
        normalizeWorkflowDecision({ reason: "只读分析", continuationKind: "supplement", actionRequired: false, requiresCodeChanges: false }),
        normalizeWorkflowDecision({ reason: "开发执行", actionRequired: true, selectedSkills: ["ccm-interface-data-contract", "unknown"], requiresCodeChanges: true, verificationModes: ["commands", "invalid"] }),
        normalizeWorkflowDecision({ reason: "多目标需求", actionRequired: true, requiresCodeChanges: true, needsEpicDecomposition: true, clarificationQuestions: ["边界？"] }),
    ];
    const management = normalizeWorkflowDecision({
        reason: "停止项目",
        actionRequired: true,
        requiresCodeChanges: false,
        intentKind: "management",
        mainAgentIntent: "management_action",
        managementRisk: "destructive",
        riskLevel: "high",
    });
    const sourceInquiry = normalizeWorkflowDecision({
        reason: "核对源码",
        actionRequired: false,
        requiresCodeChanges: false,
        readAction: "inspect_source",
        sourceReadDepth: "focused",
    });
    const serverRaisedRisk = normalizeWorkflowDecision({
        reason: "删除资源",
        actionRequired: true,
        requiresCodeChanges: false,
        intentKind: "management",
        mainAgentIntent: "management_action",
        managementRisk: "mutable",
        riskLevel: "high",
    });
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
            && cases[0].mainAgentIntent === "direct_reply"
            && cases[2].mainAgentIntent === "development_request"
            && management.mainAgentIntent === "management_action"
            && management.managementRisk === "destructive"
            && serverRaisedRisk.managementRisk === "destructive"
            && sourceInquiry.mainAgentIntent === "source_inquiry"
            && direct.directReplyReady === true
            && direct.directReply === "你好！有什么可以帮你？"
            && unsafeDirect.directReplyReady === false
            && unsafeDirect.directReply === ""
            && legacyRejected,
        cases,
        management,
        sourceInquiry,
        serverRaisedRisk,
        direct,
        unsafeDirect,
        legacyRejected,
    };
}
//# sourceMappingURL=workflow-decision.js.map