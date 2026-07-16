"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_DECISION_GUIDANCE = void 0;
exports.normalizeWorkflowDecision = normalizeWorkflowDecision;
exports.explicitWorkflowDecision = explicitWorkflowDecision;
exports.decideWorkflowWithModel = decideWorkflowWithModel;
exports.runWorkflowDecisionContractSelfTest = runWorkflowDecisionContractSelfTest;
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
exports.WORKFLOW_DECISION_GUIDANCE = `
你必须根据用户完整语义和当前上下文选择工作流，不能按关键词、正则或句子长度机械匹配。

可选工作流：
- answer：普通聊天、知识问答、原理说明、可行性咨询，不需要读取项目或执行动作。
- project_analysis：需要读取项目/任务现状后回答，但用户没有要求修改、运行或派发。
- execute_direct：目标明确、范围小、单项目或少量步骤，可直接执行并验证。
- plan_task：实现任务较复杂、需求不清、多文件、多方案或需要用户偏好，先生成执行前计划。
- decompose_epic：PRD/需求文档、跨项目或多个可独立验收子目标，需要生成持久 Epic/DAG 任务图。

判断原则：
1. 用户询问“怎么做/能否做/为什么”不等于授权执行。
2. 用户明确要求实际实现、修改、修复、运行、创建或派发时，actionRequired 才为 true。
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
const MODES = new Set([
    "answer",
    "project_analysis",
    "execute_direct",
    "plan_task",
    "decompose_epic",
]);
function list(value, max = 12) {
    return Array.isArray(value)
        ? value.map(item => String(item || "").trim()).filter(Boolean).slice(0, max)
        : [];
}
function normalizeWorkflowDecision(value, source = "model") {
    const rawMode = String(value?.mode || value?.workflowMode || "").trim();
    if (!MODES.has(rawMode))
        throw new Error(`大模型返回了无效工作流：${rawMode || "空"}`);
    const needsEpicDecomposition = rawMode === "decompose_epic" || value?.needsEpicDecomposition === true;
    const needsPlanning = needsEpicDecomposition || rawMode === "plan_task" || value?.needsPlanning === true;
    const rawContinuation = String(value?.continuationKind || value?.continuation_kind || "new_task").trim();
    const continuationKind = ["supplement", "revise_goal"].includes(rawContinuation)
        ? rawContinuation
        : "new_task";
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
        source,
    };
}
function explicitWorkflowDecision(mode, reason, overrides = {}) {
    return {
        ...normalizeWorkflowDecision({ mode, reason, confidence: 1 }, "explicit_user_choice"),
        ...overrides,
        schema: "ccm-model-workflow-decision-v1",
        mode,
        reason,
        source: "explicit_user_choice",
    };
}
async function decideWorkflowWithModel(input) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!config.enabled || !String(config.apiUrl || "").trim() || !String(config.apiKey || "").trim() || !String(config.model || "").trim()) {
        throw new Error("统一大模型尚未配置，无法形成可靠工作流决策");
    }
    const messages = [
        {
            role: "system",
            content: `${exports.WORKFLOW_DECISION_GUIDANCE}

只输出合法 JSON：
{"mode":"answer|project_analysis|execute_direct|plan_task|decompose_epic","reason":"判断依据","confidence":0.95,"needsPlanning":false,"needsEpicDecomposition":false,"actionRequired":false,"continuationKind":"new_task|supplement|revise_goal","readAction":"none|inspect_status","targetRefs":[],"impactScope":[],"planSteps":[],"clarificationQuestions":[]}`,
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
    const parsed = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, {
            messages,
            maxTokens: 900,
            defaultTimeoutMs: 45_000,
            httpErrorPrefix: "工作流决策模型调用失败",
        })
        : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, {
            messages,
            defaultTimeoutMs: 45_000,
            httpErrorPrefix: "工作流决策模型调用失败",
        });
    return normalizeWorkflowDecision(parsed, "model");
}
function runWorkflowDecisionContractSelfTest() {
    const cases = [
        normalizeWorkflowDecision({ mode: "answer", reason: "问答", confidence: 0.9 }),
        normalizeWorkflowDecision({ mode: "project_analysis", reason: "只读分析", continuationKind: "supplement" }),
        normalizeWorkflowDecision({ mode: "execute_direct", reason: "简单执行" }),
        normalizeWorkflowDecision({ mode: "plan_task", reason: "复杂实现" }),
        normalizeWorkflowDecision({ mode: "decompose_epic", reason: "多目标需求", clarificationQuestions: ["边界？"] }),
    ];
    return {
        success: cases.length === 5
            && cases[0].actionRequired === false
            && cases[2].actionRequired === true
            && cases[3].needsPlanning === true
            && cases[4].needsEpicDecomposition === true,
        cases,
    };
}
//# sourceMappingURL=workflow-decision.js.map