"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTaskOrigin = normalizeTaskOrigin;
exports.resolveTaskSessionArchivePolicy = resolveTaskSessionArchivePolicy;
exports.resolveTaskSessionCreationPolicy = resolveTaskSessionCreationPolicy;
exports.defaultTaskSessionCreationPolicy = defaultTaskSessionCreationPolicy;
exports.resolveTaskExecutionPolicy = resolveTaskExecutionPolicy;
exports.buildTaskSpecV1 = buildTaskSpecV1;
exports.buildTaskRunV1 = buildTaskRunV1;
exports.buildAutomationDefinitionV1 = buildAutomationDefinitionV1;
exports.validateTaskWorkflowModel = validateTaskWorkflowModel;
const crypto = __importStar(require("crypto"));
function text(value, fallback = "") {
    return String(value ?? fallback).trim();
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function bool(value) {
    return value === true || value === 1 || value === "true";
}
function normalizeTaskOrigin(task) {
    const raw = text(task?.origin || task?.task_origin || task?.request_origin || task?.requestOrigin || task?.source_channel || task?.sourceChannel || task?.automation_task_source || task?.automationTaskSource || task?.workflow_meta?.intake?.source).toLowerCase().replace(/[\s-]+/g, "_");
    if ([
        "conversation",
        "chat",
        "project_chat",
        "group_chat",
        "project_session",
        "group_session",
        "project_conversation",
        "group_conversation",
        "feishu",
        "feishu_session",
        "feishu_chat",
        "lark",
        "lark_session",
    ].includes(raw))
        return "conversation";
    if (["workbench", "usability", "usability_intake", "usability_workbench", "task_workbench", "task_workbench_intake"].includes(raw))
        return "workbench";
    if (["dispatch", "task_dispatch", "task-dispatch", "requirement_pool", "requirement", "requirements"].includes(raw))
        return "dispatch";
    if (["automation", "schedule", "scheduled", "daily_dev", "cron_gap_rework"].includes(raw))
        return "automation";
    if ([
        "global",
        "global_agent",
        "global_web",
        "global_feishu",
        "global_agent_web",
        "global_agent_session",
        "mission",
    ].includes(raw) || task?.global_mission_id || task?.mission_id)
        return "global_agent";
    return "dispatch";
}
function resolveTaskSessionArchivePolicy(task) {
    const explicit = text(task?.task_session_archive_policy || task?.taskSessionArchivePolicy || task?.archive_policy || task?.archivePolicy);
    if (explicit === "user_confirm" || explicit === "auto_terminal")
        return explicit;
    const origin = normalizeTaskOrigin(task);
    if (origin === "automation" || origin === "workbench" || origin === "dispatch")
        return "auto_terminal";
    return "user_confirm";
}
function resolveTaskSessionCreationPolicy(task) {
    const frozen = text(task?.task_spec?.task_session_creation_policy);
    if (frozen === "on_create" || frozen === "on_terminal")
        return frozen;
    const explicit = text(task?.task_session_creation_policy || task?.taskSessionCreationPolicy || task?.session_creation_policy || task?.sessionCreationPolicy);
    if (explicit === "on_create" || explicit === "on_terminal")
        return explicit;
    // Persisted records without the new frozen field are historical records.
    // They must remain terminal-only; never infer a new lifecycle from a
    // mutable source/origin field while reading them.
    return "on_terminal";
}
/**
 * Resolve the default only while creating a brand-new task. Callers may pass
 * an explicit policy when an entrypoint has a special lifecycle contract.
 */
function defaultTaskSessionCreationPolicy(task) {
    const explicit = text(task?.task_session_creation_policy || task?.taskSessionCreationPolicy || task?.session_creation_policy || task?.sessionCreationPolicy);
    if (explicit === "on_create" || explicit === "on_terminal")
        return explicit;
    const origin = normalizeTaskOrigin(task);
    return origin === "workbench" || origin === "dispatch" || origin === "automation"
        ? "on_create"
        : "on_terminal";
}
function projectCount(task) {
    const projects = new Set();
    for (const value of [task?.target_project, task?.targetProject, task?.target_projects, task?.targetProjects]) {
        if (Array.isArray(value))
            value.forEach(item => { if (text(item))
                projects.add(text(item)); });
        else if (text(value))
            projects.add(text(value));
    }
    for (const item of Array.isArray(task?.work_items) ? task.work_items : []) {
        const project = text(item?.project || item?.project_id || item?.projectId || item?.target_project);
        if (project)
            projects.add(project);
    }
    return projects.size;
}
function resolveTaskExecutionPolicy(task) {
    const frozen = task?.workflow_policy_snapshot
        || task?.task_spec?.execution_policy
        || task?.automation_definition?.execution_policy
        || task?.automationDefinition?.execution_policy;
    if (frozen && ["direct_worker", "planned_worker", "orchestrated"].includes(String(frozen.dispatch))
        && ["quick_check", "main_agent_self", "test_agent"].includes(String(frozen.verification))
        && ["shared_serial", "isolated_worktree"].includes(String(frozen.workspace))
        && ["preapproved", "confirm_before_write", "confirm_before_delivery"].includes(String(frozen.approval))) {
        const core = {
            dispatch: frozen.dispatch,
            verification: frozen.verification,
            workspace: frozen.workspace,
            approval: frozen.approval,
            reasons: Array.isArray(frozen.reasons) ? frozen.reasons.map((item) => text(item)).filter(Boolean) : ["沿用自动化定义冻结策略"],
        };
        return { ...core, checksum: checksum(core) };
    }
    const origin = normalizeTaskOrigin(task);
    const workflow = text(task?.workflow_type || task?.workflowType).toLowerCase();
    const risk = text(task?.risk_level || task?.riskLevel || task?.workflow_decision?.riskLevel || task?.workflow_decision?.risk_level).toLowerCase();
    const verificationModes = Array.isArray(task?.verification_modes || task?.verificationModes || task?.workflow_decision?.verificationModes)
        ? (task?.verification_modes || task?.verificationModes || task?.workflow_decision?.verificationModes).map((item) => text(item).toLowerCase())
        : [];
    const crossProject = projectCount(task) > 1 || bool(task?.cross_project) || bool(task?.crossProject);
    const destructive = bool(task?.destructive) || bool(task?.requires_destructive_confirmation) || ["release", "migration", "security", "destructive"].some(item => verificationModes.includes(item));
    const strict = destructive || crossProject || risk === "high" || bool(task?.requires_independent_review) || workflow === "daily_dev";
    const conversation = origin === "conversation" || origin === "global_agent";
    const explicitDispatch = text(task?.dispatch_policy || task?.dispatchPolicy).toLowerCase();
    const explicitVerification = text(task?.verification_policy || task?.verificationPolicy).toLowerCase();
    const explicitApproval = text(task?.approval_policy || task?.approvalPolicy).toLowerCase();
    const dispatch = ["direct_worker", "planned_worker", "orchestrated"].includes(explicitDispatch)
        ? explicitDispatch
        : strict ? "orchestrated" : conversation ? "planned_worker" : "direct_worker";
    const verification = ["quick_check", "main_agent_self", "test_agent"].includes(explicitVerification)
        ? explicitVerification
        : strict ? "test_agent" : conversation ? "main_agent_self" : "quick_check";
    const workspace = text(task?.workspace_policy || task?.workspacePolicy).toLowerCase() === "isolated_worktree"
        || text(task?.child_agent_isolation || task?.childAgentIsolation).toLowerCase() === "worktree"
        || strict && (crossProject || destructive || bool(task?.requires_isolation))
        ? "isolated_worktree" : "shared_serial";
    const approval = ["preapproved", "confirm_before_write", "confirm_before_delivery"].includes(explicitApproval)
        ? explicitApproval
        : destructive || risk === "high"
            ? "confirm_before_delivery"
            : bool(task?.requires_confirmation) || bool(task?.requiresConfirmation)
                ? "confirm_before_write"
                : "preapproved";
    const reasons = [
        origin === "workbench" ? "工作台明确任务默认轻量执行" : "",
        origin === "dispatch" ? "任务派发明确任务默认轻量执行" : "",
        conversation ? "对话任务保留主 Agent 规划" : "",
        crossProject ? "跨项目任务升级为编排执行" : "",
        destructive ? "破坏性或发布类任务必须人工确认" : "",
        strict && !destructive && !crossProject ? "高风险或需要独立验收" : "",
    ].filter(Boolean);
    const core = { dispatch, verification, workspace, approval, reasons };
    return { ...core, checksum: checksum(core) };
}
function buildTaskSpecV1(task, policy = resolveTaskExecutionPolicy(task)) {
    const origin = normalizeTaskOrigin(task);
    const targetType = text(task?.group_id || task?.groupId) ? "group" : "project";
    const targetId = targetType === "group" ? text(task?.group_id || task?.groupId) : text(task?.target_project || task?.targetProject);
    const exactSessionId = text(task?.exact_session_id || task?.exactSessionId || task?.group_session_id || task?.groupSessionId || task?.project_session_id || task?.projectSessionId);
    const acceptance = Array.isArray(task?.acceptance_criteria) ? task.acceptance_criteria.map((item) => text(item)).filter(Boolean) : text(task?.acceptance_criteria || task?.acceptanceCriteria) ? [text(task?.acceptance_criteria || task?.acceptanceCriteria)] : [];
    const core = {
        schema: "ccm-task-spec-v1",
        task_id: text(task?.id),
        origin,
        task_session_creation_policy: task?.task_spec?.task_session_creation_policy
            || task?.task_session_creation_policy
            || defaultTaskSessionCreationPolicy(task),
        task_session_archive_policy: resolveTaskSessionArchivePolicy(task),
        target: { type: targetType, id: targetId, exact_session_id: exactSessionId },
        goal: text(task?.business_goal || task?.businessGoal || task?.description || task?.title),
        scope: text(task?.scope || task?.allowed_paths || task?.allowedPaths),
        attachments: Array.isArray(task?.source_attachments || task?.sourceAttachments)
            ? (task?.source_attachments || task?.sourceAttachments).map((item) => ({ ...item }))
            : [],
        acceptance,
        acceptance_policy: { criteria: acceptance, verification: policy.verification },
        approval_policy: policy.approval,
        delivery_policy: {
            require_confirmation: policy.approval === "confirm_before_delivery",
            channels: Array.isArray(task?.delivery_channels || task?.deliveryChannels) ? [...task.delivery_channels || task.deliveryChannels] : [],
        },
        execution_policy: policy,
        source_snapshot: {
            content_checksum: text(task?.content_checksum || task?.contentChecksum || task?.requirement_content_hash),
            source_channel: text(task?.source_channel || task?.sourceChannel || task?.request_origin),
            client_message_id: text(task?.client_message_id || task?.clientMessageId),
        },
        revision: Math.max(1, Number(task?.task_spec_revision || task?.taskSpecRevision || 1)),
        created_at: text(task?.created_at, new Date().toISOString()),
    };
    const planChecksum = checksum(core);
    return { ...core, checksum: planChecksum, plan_revision: core.revision, spec_revision: core.revision, plan_checksum: planChecksum };
}
function buildTaskRunV1(task, spec, trigger = "user") {
    const now = new Date().toISOString();
    const runId = text(task?.run_id || task?.task_run?.run_id || task?.taskRun?.runId, `run_${crypto.randomUUID()}`);
    const automation = task?.automation_definition || task?.automationDefinition || null;
    return {
        schema: "ccm-task-run-v1",
        run_id: runId,
        task_id: spec.task_id,
        trace_id: text(task?.trace_id || task?.traceId, `trace_${crypto.randomUUID()}`),
        spec_revision: spec.revision,
        trigger,
        status: task?.auto_execute === false ? "blocked" : "queued",
        attempt: Math.max(1, Number(task?.execution_attempt || task?.attempt || 1)),
        created_at: now,
        updated_at: now,
        ...(automation?.schema === "ccm-automation-definition-v1" ? {
            automation_definition_id: automation.definition_id,
            automation_definition_revision: automation.revision,
        } : {}),
        ...(text(task?.queue_scope || task?.queueScope) ? { queue_lane: text(task?.queue_scope || task?.queueScope) } : {}),
        ...(text(task?.parent_run_id || task?.parentRunId) ? { parent_run_id: text(task?.parent_run_id || task?.parentRunId) } : {}),
    };
}
function buildAutomationDefinitionV1(job, policy) {
    const targetType = text(job?.group_id || job?.groupId) ? "group" : "project";
    const targetId = targetType === "group" ? text(job?.group_id || job?.groupId) : text(job?.project || job?.target_project || job?.targetProject);
    const targetSession = text(job?.exact_session_id || job?.exactSessionId || job?.group_session_id || job?.groupSessionId || job?.project_session_id || job?.projectSessionId);
    const effectivePolicy = policy || resolveTaskExecutionPolicy({
        ...job,
        origin: "automation",
        risk_level: job?.risk_level || (job?.workflow_type === "daily_dev" ? "high" : ""),
        dispatch_policy: job?.dispatch_policy || job?.dispatchPolicy,
        verification_policy: job?.verification_policy || job?.verificationPolicy,
        workspace_policy: job?.workspace_policy || job?.workspacePolicy,
    });
    const frozenAt = new Date().toISOString();
    const source = {
        name: text(job?.name || job?.title, "自动化任务"),
        prompt: text(job?.prompt || job?.description),
        schedule: text(job?.schedule),
        timezone: text(job?.timezone, "Asia/Shanghai"),
        revision: Math.max(1, Number(job?.revision || 1)),
        source_attachments: Array.isArray(job?.source_attachments) ? job.source_attachments : [],
        template_id: text(job?.task_template_id || job?.taskTemplateId),
        template_revision: Number(job?.task_template_revision || job?.taskTemplateRevision || 0),
    };
    const definitionId = text(job?.id || job?.definition_id || job?.definitionId, `automation_${crypto.randomUUID()}`);
    const core = {
        schema: "ccm-automation-definition-v1",
        definition_id: definitionId,
        revision: source.revision,
        name: source.name,
        target: { type: targetType, id: targetId, exact_session_id: targetSession },
        goal: text(job?.business_goal || job?.businessGoal || source.prompt || source.name),
        scope: text(job?.scope || job?.allowed_paths || job?.allowedPaths),
        prompt: source.prompt,
        attachments: source.source_attachments.map((item) => ({ ...item })),
        schedule: source.schedule,
        timezone: source.timezone,
        execution_policy: effectivePolicy,
        notification_policy: job?.notification_policy || job?.notificationPolicy || {},
        ...(job?.metadata && typeof job.metadata === "object" ? { metadata: { ...job.metadata } } : {}),
        source_snapshot: { checksum: checksum(source), captured_at: frozenAt },
        frozen_at: frozenAt,
    };
    return { ...core, checksum: checksum(core) };
}
function validateTaskWorkflowModel(task) {
    const spec = task?.task_spec;
    const run = task?.task_run;
    const policy = spec?.execution_policy;
    const validPolicy = !!policy && ["direct_worker", "planned_worker", "orchestrated"].includes(policy.dispatch)
        && ["quick_check", "main_agent_self", "test_agent"].includes(policy.verification)
        && ["shared_serial", "isolated_worktree"].includes(policy.workspace)
        && ["preapproved", "confirm_before_write", "confirm_before_delivery"].includes(policy.approval);
    return {
        valid: spec?.schema === "ccm-task-spec-v1" && run?.schema === "ccm-task-run-v1" && validPolicy && spec.task_id === run.task_id && !!run.trace_id,
        spec,
        run,
        reason: !spec ? "task_spec_missing" : !run ? "task_run_missing" : !validPolicy ? "execution_policy_invalid" : "ok",
    };
}
//# sourceMappingURL=task-workflow-model.js.map