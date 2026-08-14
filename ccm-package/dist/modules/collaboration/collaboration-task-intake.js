"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskPlanMode = getTaskPlanMode;
exports.buildDispatchLaunchSummary = buildDispatchLaunchSummary;
exports.buildRevisedPlanModeDraft = buildRevisedPlanModeDraft;
exports.buildAcceptedPlanModeDraft = buildAcceptedPlanModeDraft;
exports.classifyGroupProjectTaskIntent = classifyGroupProjectTaskIntent;
exports.normalizeGroupAgentGatewayTaskIntent = normalizeGroupAgentGatewayTaskIntent;
exports.classifyGroupProjectTaskIntentWithAgent = classifyGroupProjectTaskIntentWithAgent;
exports.shouldUseProjectAnalysisMode = shouldUseProjectAnalysisMode;
exports.shouldCreatePersistentGroupTask = shouldCreatePersistentGroupTask;
exports.classifyPlanModeRisk = classifyPlanModeRisk;
exports.buildPlanModeClarificationQuestions = buildPlanModeClarificationQuestions;
exports.buildGroupPlanModePreflight = buildGroupPlanModePreflight;
exports.buildProjectCodeReadOnlySnapshot = buildProjectCodeReadOnlySnapshot;
exports.buildChildAgentWorkerHandoff = buildChildAgentWorkerHandoff;
exports.buildQueuedGroupTaskMessage = buildQueuedGroupTaskMessage;
const db_1 = require("../../core/db");
const workflow_decision_1 = require("../../agents/workflow-decision");
const group_orchestrator_1 = require("./group-orchestrator");
const project_analysis_1 = require("./project-analysis");
const memory_1 = require("./memory");
const worker_handoff_1 = require("../../agents/worker-handoff");
const collaboration_1 = require("./collaboration");
const main_agent_plan_core_1 = require("./main-agent-plan-core");
function getTaskPlanMode(task) {
    return task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
}
function buildDispatchLaunchSummary(input) {
    const assignments = Array.isArray(input.assignments) ? input.assignments : [];
    const visibleRows = assignments
        .map((item, index) => {
        const agent = (0, memory_1.compactMemoryText)(item?.project || item?.agent || item?.target_project || item?.targetName || "", 90);
        if (!(0, collaboration_1.isVisibleChildAgentName)(agent))
            return null;
        const taskText = (0, collaboration_1.sanitizeDispatchLaunchText)(item?.task || item?.message || item?.summary || input.goal || input.task?.business_goal || input.task?.title, "已生成自包含工作单，技术协议已放入技术详情。", 240);
        const reason = (0, collaboration_1.sanitizeDispatchLaunchText)(item?.reason || input.dispatchPolicy?.reason || "我根据目标和影响范围分派。", "我根据目标和影响范围分派。", 180);
        const dependsOn = Array.isArray(item?.dependsOn || item?.depends_on)
            ? (item.dependsOn || item.depends_on)
            : (item?.dependsOn || item?.depends_on ? [item.dependsOn || item.depends_on] : []);
        const rowStatus = (0, collaboration_1.normalizeGroupDispatchLaunchRowStatus)(item?.status);
        return {
            id: item?.assignment_id || item?.id || `dispatch_launch_${index + 1}`,
            agent,
            role: (0, collaboration_1.userAgentRole)(agent),
            task: taskText,
            reason,
            depends_on: dependsOn.map((value) => (0, memory_1.compactMemoryText)(value, 80)).filter(Boolean).slice(0, 4),
            status: rowStatus.status,
            status_label: rowStatus.label,
        };
    })
        .filter(Boolean)
        .slice(0, 8);
    if (!visibleRows.length)
        return null;
    const goal = (0, collaboration_1.sanitizeDispatchLaunchText)(input.goal || input.task?.business_goal || input.task?.title || "这项需求", "这项需求", 180).replace(/[。！？!?；;，,]+$/u, "");
    const agents = visibleRows.map((row) => row.agent).join("、");
    return {
        schema: "ccm-main-agent-dispatch-launch-summary-v1",
        title: "已派发的工作",
        mode: input.mode || "",
        task_id: input.taskId || input.task?.id || "",
        headline: `我已把「${goal}」拆给 ${visibleRows.length} 个执行成员：${agents}。`,
        rows: visibleRows,
        acceptance: [
            "每个执行成员都需要提交结构化结果说明。",
            "我会统一核对文件、验证和阻塞情况。",
            "通过验收后再给你最终交付总结。",
        ],
        next_action: "等待执行成员返回结果说明；有缺口时我会定向补充或请你确认。",
        technical_hint: "执行成员的完整工作单、Trace 和底层执行记录默认收在技术详情里。",
        display_policy: {
            user_visible: true,
            hide_for_ordinary_conversation: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function buildRevisedPlanModeDraft(planMode = {}, feedback = "") {
    // 修订步骤与历史的核心逻辑在 main-agent-plan-core 中，与群聊追加消息共用同一套并入规则。
    const merged = (0, main_agent_plan_core_1.mergeFollowupIntoPlanMode)(planMode, {
        message: feedback || "请调整执行前计划。",
        kind: "intake_revise",
        source: "intake_revise",
        executing: false,
    });
    const now = merged.revised_at;
    const text = merged.last_revision_feedback;
    const answeredQuestions = (Array.isArray(planMode.clarification_questions) ? planMode.clarification_questions : [])
        .map((item) => ({
        ...item,
        status: "answered_by_revision",
        answer: text,
        answered_at: now,
    }));
    return {
        ...merged,
        clarification_questions: answeredQuestions,
        needs_clarification: false,
        acceptance: (0, collaboration_1.uniqueStrings)([
            ...(Array.isArray(planMode.acceptance) ? planMode.acceptance : []),
            `已纳入用户调整意见：${text}`,
        ]).slice(0, 8),
        permission_boundaries: (0, collaboration_1.uniqueStrings)([
            ...(Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries : []),
            "调整后的计划重新确认前不得派发执行成员或修改文件",
        ]).slice(0, 8),
    };
}
function buildAcceptedPlanModeDraft(planMode = {}, feedback = "", acceptedAt = new Date().toISOString()) {
    const text = (0, memory_1.compactMemoryText)(feedback || "", 720);
    const acceptance = Array.isArray(planMode.acceptance) ? planMode.acceptance : [];
    const acceptedFeedbackHistory = [
        ...(Array.isArray(planMode.accepted_feedback_history) ? planMode.accepted_feedback_history : []),
        ...(text ? [{ feedback: text, at: acceptedAt, status: "accepted" }] : []),
    ].slice(-10);
    return {
        ...planMode,
        title: planMode.title || "执行前计划",
        requires_confirmation: false,
        auto_continue: true,
        confirmation_status: "confirmed",
        accepted_at: acceptedAt,
        confirmed_at: acceptedAt,
        accepted_feedback: text,
        last_accept_feedback: text,
        accepted_feedback_history: acceptedFeedbackHistory,
        revision_status: planMode.revision_status === "revision_requested" ? "confirmed_after_revision" : (planMode.revision_status || "confirmed"),
        needs_clarification: false,
        acceptance: text
            ? (0, collaboration_1.uniqueStrings)([...acceptance, `执行时纳入用户补充要求：${text}`]).slice(0, 8)
            : acceptance.slice(0, 8),
        plan_execution_followup: {
            schema: "ccm-main-agent-plan-execution-followup-v1",
            status: "confirmed_tracking",
            title: "计划已确认，正在按计划执行",
            headline: text
                ? "我会带着你的补充要求推进执行，并在最终总结前逐项核对验收标准。"
                : "我会按这份计划推进执行，并在最终总结前逐项核对验收标准。",
            accepted_at: acceptedAt,
            accepted_feedback: text,
            next_action: "等待执行成员结果说明、文件改动和验证证据；如有偏离，我会先返工再总结。",
            display_policy: {
                user_text_first: true,
                technical_default_collapsed: true,
                hide_internal_protocols: true,
                show_for_ordinary_conversation: false,
            },
        },
        next_step: text
            ? "已确认执行，我会带着补充要求派发执行成员。"
            : "已确认执行，我会派发执行成员。",
    };
}
function classifyGroupProjectTaskIntent(message, uploadedFiles = []) {
    void message;
    void uploadedFiles;
    throw new Error("同步关键词群聊意图分类已停用；请调用 classifyGroupProjectTaskIntentWithAgent");
}
function normalizeGroupAgentGatewayTaskIntent(fallback, coordinatorResult, messageMode = "conversation") {
    const runtime = String(coordinatorResult?.runtime || "");
    const dispatchPolicy = coordinatorResult?.dispatchPolicy || {};
    const action = String(dispatchPolicy.action || "").trim();
    const assignments = Array.isArray(coordinatorResult?.assignments) ? coordinatorResult.assignments : [];
    const llmBacked = runtime === "llm-api";
    const workflowDecision = coordinatorResult?.workflowDecision
        || coordinatorResult?.analysis?.workflowDecision
        || null;
    if (!llmBacked) {
        return {
            ...fallback,
            executable: false,
            analysisEligible: false,
            kind: "model_unavailable",
            reason: `Agent intent gateway 未获得大模型决策（${runtime || "unknown"}），本轮停止自动路由`,
            workflowDecision: null,
            agent_gateway: { runtime, dispatchPolicy, llm_backed: false, fallback_kind: fallback.kind, safe_stop: true },
        };
    }
    if (!workflowDecision) {
        return {
            executable: false,
            analysisEligible: false,
            kind: "model_invalid",
            reason: "群聊主 Agent 未返回 workflowDecision，本轮停止自动路由",
            workflowDecision: null,
            agent_gateway: { runtime, dispatchPolicy, llm_backed: true, safe_stop: true, contract_invalid: true },
        };
    }
    const delegates = (0, workflow_decision_1.isDevelopmentTaskWorkflowDecision)(workflowDecision)
        && action === "delegate"
        && assignments.length > 0;
    const analysisEligible = !delegates && workflowDecision.mode === "project_analysis";
    return {
        executable: delegates,
        analysisEligible,
        kind: delegates ? "task" : analysisEligible ? "project_analysis" : workflowDecision.mode === "answer" ? "conversation" : "needs_clarification",
        reason: delegates
            ? `Agent intent gateway 允许创建任务卡：${dispatchPolicy.reason || "主 Agent 判定需要派发"}`
            : `Agent intent gateway 不创建任务卡：${dispatchPolicy.reason || "主 Agent 判定无需派发"}`,
        workflowDecision,
        confidence: workflowDecision.confidence,
        agent_gateway: { runtime, dispatchPolicy, llm_backed: true, assignments: assignments.map((item) => item.project).filter(Boolean) },
    };
}
async function classifyGroupProjectTaskIntentWithAgent(input) {
    const fallback = {
        executable: false,
        analysisEligible: false,
        kind: "model_required",
        reason: "等待统一大模型语义决策",
    };
    const mode = String(input.messageMode || "conversation").trim().toLowerCase();
    try {
        const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
            group: input.group,
            message: input.message,
            source: "group-chat-main-first-turn",
            groupSessionId: input.groupSessionId || input.group_session_id || "",
            turnId: input.turnId || input.turn_id || "",
            anchorMessageId: input.anchorMessageId || input.anchor_message_id || "",
            context: input.context || "",
            sharedFilesContext: input.sharedFilesContext || "",
            extraInstructions: input.forceProjectTask
                ? "用户通过明确的任务入口要求执行；请在同一首轮形成 workflowDecision、计划与分派草稿。"
                : `当前消息模式：${mode}。请在本次主 Agent首轮直接决定回复、工具、澄清、计划或分派。`,
        });
        const normalized = normalizeGroupAgentGatewayTaskIntent(fallback, coordinatorResult, mode);
        return {
            ...normalized,
            coordinatorResult,
            mainAgentFirstTurnResult: coordinatorResult,
            agent_gateway: {
                ...(normalized.agent_gateway || {}),
                main_first_turn: true,
                turn_receipt: coordinatorResult?.mainAgentTurnReceipt || null,
            },
        };
    }
    catch (error) {
        return {
            executable: false,
            analysisEligible: false,
            kind: "model_unavailable",
            reason: `Agent intent gateway 调用失败，本轮停止自动路由：${error?.message || error}`,
            workflowDecision: null,
            agent_gateway: { runtime: "error", llm_backed: false, safe_stop: true, error: error?.message || String(error), fallback_kind: fallback.kind },
        };
    }
}
function shouldUseProjectAnalysisMode(input) {
    if (!input.isOrchestrated)
        return false;
    return input.taskIntent?.workflowDecision?.mode === "project_analysis"
        || input.taskIntent?.analysisEligible === true;
}
function shouldCreatePersistentGroupTask(input) {
    return !!input.isOrchestrated
        && (!!input.forceProjectTask || input.taskIntent?.executable === true);
}
function classifyPlanModeRisk(message, group, taskIntent = {}, attachmentCount = 0) {
    void message;
    void group;
    void attachmentCount;
    const workflowDecision = taskIntent?.workflowDecision || null;
    const signals = {
        destructive: workflowDecision?.riskLevel === "high",
        migration: false,
        crossProject: Array.isArray(workflowDecision?.targetRefs) && workflowDecision.targetRefs.length > 1,
        vague: Array.isArray(workflowDecision?.clarificationQuestions) && workflowDecision.clarificationQuestions.length > 0,
        attachment: false,
    };
    const reasons = [
        signals.destructive ? "包含删除、清理、覆盖或不可逆操作" : "",
        signals.migration ? "涉及迁移、重构、数据库、权限、支付、部署或配置边界" : "",
        signals.crossProject ? "可能涉及多个项目或前后端契约" : "",
        signals.vague ? "需求较短或范围模糊，需要先确认影响范围" : "",
        signals.attachment ? "包含附件，需要先只读解析需求文档" : "",
    ].filter(Boolean);
    const requiresConfirmation = workflowDecision?.requiresUserConfirmation === true;
    const level = workflowDecision?.riskLevel || "low";
    return {
        level,
        requiresConfirmation,
        reasons,
        signals,
        summary: reasons.length ? reasons.join("；") : "低风险明确开发需求，可自动进入执行队列",
        lower: "",
    };
}
function buildPlanModeClarificationQuestions(message, risk = {}, selectedProjects = []) {
    void message;
    const signals = risk?.signals || {};
    const questions = [];
    const add = (id, question, reason, examples = []) => {
        if (questions.some(item => item.id === id))
            return;
        questions.push({ id, question, reason, examples: examples.slice(0, 3), status: "open" });
    };
    if (signals.vague) {
        add("scope_priority", "你希望主 Agent 优先处理哪个页面、接口或模块？", "需求比较短或范围不够具体，先确认重点可以减少返工。", ["只改登录页", "优先后端接口", "先修最影响用户的路径"]);
    }
    if (signals.crossProject || selectedProjects.length > 1) {
        add("project_boundary", "这些项目都需要一起修改吗？如果有主次顺序，请告诉我。", "多项目协作需要先确认边界和依赖顺序。", selectedProjects.length ? selectedProjects : ["先后端契约，再前端接入"]);
    }
    if (signals.migration) {
        add("compatibility_boundary", "是否需要兼容旧数据、旧接口或现有配置？", "迁移、权限、支付、订单、部署等改动需要明确兼容策略。", ["必须兼容旧接口", "可以只做新逻辑", "上线前保留回滚路径"]);
    }
    if (signals.destructive) {
        add("destructive_permission", "是否允许删除、清理、覆盖或执行不可逆操作？", "破坏性操作必须由用户明确授权。", ["不允许删除，只标记废弃", "允许删除测试数据", "需要先备份"]);
    }
    return questions.slice(0, 5);
}
async function buildGroupPlanModePreflight(input) {
    const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)(input.group);
    const configs = input.configs || (0, db_1.getConfigs)();
    const message = String(input.message || "");
    const risk = classifyPlanModeRisk(message, group, input.taskIntent, input.attachmentCount || 0);
    let workflowDecision = input.taskIntent?.workflowDecision || null;
    if (!workflowDecision)
        throw new Error("缺少群聊主 Agent 的 workflowDecision，不能生成执行前计划");
    const members = (0, group_orchestrator_1.getRoutableMembers)(group);
    const coordinatorProject = input.coordinatorProject || (0, group_orchestrator_1.getCoordinatorMember)(group).project;
    const projectNames = members.map((member) => member.project).filter(Boolean);
    const modelTargets = [
        ...(workflowDecision.targetRefs || []),
        ...(input.taskIntent?.agent_gateway?.assignments || []),
    ];
    const relevantProjects = projectNames.filter((name) => modelTargets.includes(name)).slice(0, 6);
    const selectedProjects = relevantProjects.length ? relevantProjects : projectNames.slice(0, Math.min(3, projectNames.length));
    const areas = [...(workflowDecision.impactScope || [])];
    if (!areas.length)
        areas.push("由主 Agent 只读探索后收敛影响范围");
    let readOnlyContext = "";
    const firstTurnSource = input.taskIntent?.mainAgentFirstTurnResult?.projectSourceEvidence
        || input.taskIntent?.coordinatorResult?.projectSourceEvidence
        || null;
    const planningSource = firstTurnSource?.schema === "ccm-group-main-source-planning-v1"
        ? firstTurnSource
        : await (0, project_analysis_1.buildModelDrivenGroupPlanningSourceContext)(group, message, configs, {
            targetProjects: selectedProjects,
            maxRounds: 3,
        });
    readOnlyContext = planningSource.rendered;
    const sourceModelPlan = planningSource.modelPlanning;
    workflowDecision = {
        ...workflowDecision,
        reason: sourceModelPlan.reason || workflowDecision.reason,
        planSteps: sourceModelPlan.planSteps.length ? sourceModelPlan.planSteps : workflowDecision.planSteps,
        impactScope: sourceModelPlan.impactScope.length ? sourceModelPlan.impactScope : workflowDecision.impactScope,
        clarificationQuestions: Array.from(new Set([
            ...workflowDecision.clarificationQuestions,
            ...sourceModelPlan.clarificationQuestions,
            ...(!planningSource.ready ? planningSource.issues : []),
        ])).slice(0, 6),
    };
    const acceptance = [
        "必须有主 Agent 计划、派发证据和子 Agent 结构化结果说明",
        "涉及代码时必须有系统实际捕获的文件变更",
        "必须有已执行验证记录，不能只写建议验证",
        "最终报告必须列出完成内容、变更文件、验证结果、风险和待确认事项",
    ];
    const permissionBoundaries = [
        "执行前只读探索不得修改文件、不得运行破坏性命令",
        "删除、清理、迁移、部署、跨项目契约变更必须等待用户确认",
        "子 Agent 只能在对应项目工作区和工作单范围内修改",
        "任务完成前必须保留 native session / scratchpad 续跑上下文",
    ];
    const modelClarifications = (workflowDecision.clarificationQuestions || []).map((question, index) => ({
        id: `model_question_${index + 1}`,
        question,
        reason: "主 Agent 判断该信息会影响执行边界或验收",
        examples: [],
        status: "open",
        source: "model",
    }));
    const safetyClarifications = buildPlanModeClarificationQuestions(message, risk, selectedProjects)
        .filter(item => ["destructive_permission", "compatibility_boundary"].includes(item.id))
        .map(item => ({ ...item, source: "server_safety_floor" }));
    const clarificationQuestions = [...modelClarifications, ...safetyClarifications].slice(0, 6);
    const requiresConfirmation = workflowDecision.needsPlanning
        || workflowDecision.mode === "decompose_epic"
        || risk.requiresConfirmation
        || planningSource.ready !== true
        || clarificationQuestions.length > 0;
    const modelPlanSteps = (workflowDecision.planSteps || []).map((label, index) => ({
        id: `model_plan_${index + 1}`,
        label,
        detail: "由群聊主 Agent 根据完整语义生成",
        status: "pending",
        source: "model",
    }));
    const steps = [
        {
            id: "understand_goal",
            label: (0, main_agent_plan_core_1.planStepText)("understand_goal").content,
            detail: selectedProjects.length ? `已锁定相关项目：${selectedProjects.join("、")}` : "从群聊消息和项目上下文中整理目标。",
            status: "completed",
        },
        {
            id: "read_only_explore",
            label: (0, main_agent_plan_core_1.planStepText)("read_only_explore").content,
            detail: (0, memory_1.compactMemoryText)(readOnlyContext || "已完成只读探索。", 220),
            status: "completed",
        },
        ...modelPlanSteps,
        {
            id: "confirm_boundary",
            label: (0, main_agent_plan_core_1.planStepText)("confirm_boundary").content,
            detail: clarificationQuestions.length
                ? "需要先补充关键问题，再进入派发。"
                : requiresConfirmation ? "模型选择先规划，或服务端安全下限要求确认后执行。" : "模型选择直接执行，当前安全边界允许自动继续。",
            status: requiresConfirmation ? "needs_confirmation" : "completed",
        },
        {
            id: "dispatch_sub_agents",
            label: (0, main_agent_plan_core_1.planStepText)("dispatch_sub_agents").content,
            detail: "每个子 Agent 会收到目标、允许范围、禁止事项和验收标准。",
            status: requiresConfirmation ? "pending" : "in_progress",
        },
        {
            id: "verify_and_summarize",
            label: (0, main_agent_plan_core_1.planStepText)("verify_and_summarize").content,
            detail: "完成后主 Agent 必须核对文件变更、验证结果、风险和下一步。",
            status: "pending",
        },
    ];
    return {
        title: "执行前计划",
        mode: "cc-style-plan-mode",
        source: "group-main-agent-model-plan-mode-5.0",
        workflow_decision: workflowDecision,
        coordinator: coordinatorProject,
        group_id: group?.id || "",
        requirement: (0, collaboration_1.compactFormText)(message, ""),
        read_only_exploration: {
            summary: readOnlyContext,
            projects: selectedProjects,
            knowledge_used: false,
            code_snapshot_used: !!planningSource?.projects.some(project => project.files.length > 0),
            source_snapshot_checksum: planningSource?.checksum || "",
            model_planning_receipt: planningSource?.modelPlanning || null,
            source_evidence: (planningSource?.projects || []).map(project => ({
                project: project.project,
                status: project.status,
                manifest_checksum: project.manifestChecksum,
                selected_paths: project.selectedPaths,
                issue: project.issue,
            })),
            source_ready: planningSource?.ready === true,
            source_issues: planningSource?.issues || [],
        },
        steps,
        impact_scope: {
            areas,
            projects: selectedProjects,
            multi_agent: selectedProjects.length > 1 || risk.signals.crossProject,
        },
        risk: { ...risk, model_reason: workflowDecision.reason, workflow_mode: workflowDecision.mode },
        acceptance,
        clarification_questions: clarificationQuestions,
        needs_clarification: clarificationQuestions.length > 0,
        permission_boundaries: permissionBoundaries,
        sub_agent_work_order_requirements: [
            "每个工作单必须包含目标、背景、允许修改范围、禁止事项、验收标准和回执格式",
            "子 Agent 必须返回修改文件、执行动作、验证命令/结果、阻塞点和是否需要主 Agent 返工",
            "返工必须复用原任务上下文和原生会话，不能重新开一个失忆任务",
        ],
        session_strategy: {
            native_resume_first: true,
            keep_task_session_until_final_review: true,
            fallback: "native 不可用时使用 scratchpad 续跑，并注入上轮回执、未完成 Todo 和验收缺口",
        },
        requires_confirmation: requiresConfirmation,
        auto_continue: !requiresConfirmation,
        next_step: clarificationQuestions.length
            ? "请先确认或补充上面的问题；确认后才会派发子 Agent"
            : requiresConfirmation ? "等待用户确认后创建执行队列并派发子 Agent" : "模型选择直接执行，自动进入执行队列",
        generated_at: new Date().toISOString(),
    };
}
function buildProjectCodeReadOnlySnapshot(project, workDir, message) {
    return (0, project_analysis_1.buildProjectCodeReadOnlySnapshot)(project, workDir, message, { compactMemoryText: memory_1.compactMemoryText });
}
function buildChildAgentWorkerHandoff(targetProject, taskText = "", options = {}) {
    const requiresCodeChanges = options.requires_code_changes !== false && options.requiresCodeChanges !== false;
    const acceptance = options.acceptance || options.acceptance_criteria || options.acceptanceCriteria || "";
    const verificationHints = Array.isArray(options.verification_hints || options.verificationHints)
        ? (options.verification_hints || options.verificationHints).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const dependencies = [
        ...(Array.isArray(options.dependencies) ? options.dependencies : []),
        ...(options.dependsOn || options.depends_on ? [{ project: options.dependsOn || options.depends_on, reason: "前置依赖" }] : []),
    ];
    const sourceTask = options.task || options.source_task || options.sourceTask || null;
    const analysis = {
        ...(options.analysis || {}),
        summary: options.user_goal || options.userGoal || options.business_goal || options.businessGoal || sourceTask?.business_goal || sourceTask?.businessGoal || sourceTask?.title || taskText,
        documentFindings: options.document_findings || options.documentFindings || (0, collaboration_1.splitUserAcceptanceText)(sourceTask?.source_documents || sourceTask?.sourceDocuments || ""),
        constraints: options.constraints || [],
    };
    return (0, worker_handoff_1.buildSelfContainedWorkerHandoff)({
        group: options.group || null,
        project: targetProject,
        task: taskText,
        userGoal: analysis.summary,
        source: options.source || "主 Agent 派发",
        reason: options.reason || "主 Agent 根据项目职责分派",
        workDir: options.work_dir || options.workDir || "",
        agentType: options.agent_type || options.agentType || "",
        model: options.model || options.model_id || options.modelId || "",
        traceId: options.trace_id || options.traceId || sourceTask?.trace_id || sourceTask?.traceId || "",
        taskId: options.task_id || options.taskId || sourceTask?.id || "",
        taskAgentSessionId: options.task_agent_session_id || options.taskAgentSessionId || "",
        analysis,
        workerContextPacket: options.worker_context_packet || options.workerContextPacket || options.handoff?.worker_context_packet || null,
        dependencies,
        contractInjections: options.contract_injections || options.contractInjections || options.handoff?.worker_context_packet?.contract_injections || [],
        memory: options.memory || options.memory_packet || options.memoryPacket || null,
        verificationHints,
        acceptance: (0, collaboration_1.splitUserAcceptanceText)(acceptance),
        requiresCodeChanges,
        advisoryOnly: options.advisoryOnly === true || options.advisory_only === true,
        continuation: options.continuation || null,
        allowedScope: options.allowed_scope || options.allowedScope || [],
        forbiddenScope: options.forbidden_scope || options.forbiddenScope || [],
        expectedFiles: options.expected_files || options.expectedFiles || [],
        doneCriteria: options.done_criteria || options.doneCriteria || [],
        communicationEnvelope: options.communication_envelope || options.communicationEnvelope || null,
    });
}
function buildQueuedGroupTaskMessage(task) {
    const base = [
        `📋 执行任务：${task.title}`,
        task.description || "",
    ].filter(Boolean).join("\n");
    if (task?.workflow_type !== "daily_dev") {
        return `${base}\n\n请完成此任务并回复 "✅ 任务完成"。`;
    }
    const requiresCodeChanges = (0, collaboration_1.taskRequiresCodeChanges)(task);
    const requiresVerification = (0, collaboration_1.taskRequiresVerification)(task);
    const missionHandoff = task.mission_handoff || task.missionHandoff || null;
    const missionContext = missionHandoff ? [
        "全局任务交接：",
        task.global_mission_id ? `- 全局任务 ID：${task.global_mission_id}` : "",
        missionHandoff.user_goal ? `- 全局目标：${(0, memory_1.compactMemoryText)(missionHandoff.user_goal, 500)}` : "",
        missionHandoff.reason ? `- 派发原因：${(0, memory_1.compactMemoryText)(missionHandoff.reason, 300)}` : "",
        Array.isArray(missionHandoff.global_mission?.depends_on) && missionHandoff.global_mission.depends_on.length
            ? `- 前置依赖：${missionHandoff.global_mission.depends_on.join("、")}`
            : "",
        Array.isArray(missionHandoff.done_criteria) && missionHandoff.done_criteria.length
            ? `- 给全局 Agent 的交付要求：${missionHandoff.done_criteria.slice(0, 4).join("；")}`
            : "- 给全局 Agent 的交付要求：完成内容、涉及范围、验证结果、风险和仍需确认事项必须可追踪。",
        "",
    ].filter(Boolean) : [];
    return [
        "【主 Agent 业务开发工作单】",
        `任务标题：${task.title || "未命名任务"}`,
        `业务目标：${(0, memory_1.compactMemoryText)(task.business_goal || task.businessGoal || task.title || "", 900)}`,
        task.acceptance_criteria || task.acceptanceCriteria
            ? `验收标准：${(0, memory_1.compactMemoryText)(task.acceptance_criteria || task.acceptanceCriteria, 900)}`
            : "",
        task.source_documents || task.sourceDocuments
            ? `关联文档：${(0, memory_1.compactMemoryText)(task.source_documents || task.sourceDocuments, 1200)}`
            : "",
        ...missionContext,
        "",
        "完整任务说明：",
        task.description || "无",
        "",
        "执行要求：",
        "- 先根据业务目标、文档和验收标准判断影响范围，再派发给对应项目子 Agent。",
        "- 每个被派发的子 Agent 必须拿到明确的实现范围、文件/模块方向、验收标准和风险提示。",
        "- 子 Agent 必须返回 CCM_AGENT_RECEIPT；缺回执、缺证据或状态不是 done 时不能判定完成。",
        requiresCodeChanges
            ? "- 完成门禁：必须有系统实际捕获的代码/配置/文档文件变更。"
            : "- 本任务允许无代码变更，但最终报告必须说明可验收产出和依据。",
        requiresVerification
            ? "- 验证门禁：必须有可采信的已执行验证记录；只写建议运行、未运行或失败验证不能完成。"
            : "- 本任务不强制验证门禁，但仍建议记录实际检查依据。",
        "- 主 Agent 必须等待子 Agent 完成并复盘；发现缺口时继续返工或向用户明确索要信息。",
        "- 最终报告必须说明完成内容、涉及项目/文件、已执行验证、风险、阻塞和仍需用户确认的事项。",
    ].filter(line => line !== "").join("\n");
}
//# sourceMappingURL=collaboration-task-intake.js.map