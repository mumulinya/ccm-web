"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.buildTaskIntakeIdentityV2 = buildTaskIntakeIdentityV2;
exports.createTask = createTask;
exports.createRequirementEpicWithChildren = createRequirementEpicWithChildren;
exports.updateRequirementEpicFromPlan = updateRequirementEpicFromPlan;
exports.classifyTaskContinuation = classifyTaskContinuation;
exports.looksLikeTaskContinuation = looksLikeTaskContinuation;
exports.hasStructuredTaskAcceptanceEvidence = hasStructuredTaskAcceptanceEvidence;
exports.validateTaskTerminalTransition = validateTaskTerminalTransition;
exports.buildTaskTerminalDecisionV2 = buildTaskTerminalDecisionV2;
exports.updateTask = updateTask;
exports.normalizeTaskTerminalStateView = normalizeTaskTerminalStateView;
exports.removeTaskFromQueues = removeTaskFromQueues;
exports.canCompleteDailyDevFromDeliverySummary = canCompleteDailyDevFromDeliverySummary;
exports.reconcileTaskCollaborationState = reconcileTaskCollaborationState;
exports.continueDailyDevTasksFromGaps = continueDailyDevTasksFromGaps;
exports.retryTask = retryTask;
exports.purgeArchivedTask = purgeArchivedTask;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const task_execution_stage_projection_1 = require("../../system/task-execution-stage-projection");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const source_ingestion_1 = require("../requirements/source-ingestion");
const db_1 = require("../../core/db");
const task_acceptance_policy_1 = require("./task-acceptance-policy");
const main_agent_self_verification_1 = require("./main-agent-self-verification");
const unified_evidence_registry_1 = require("../../system/unified-evidence-registry");
const failure_record_1 = require("../../system/failure-record");
const task_transition_ledger_1 = require("../../system/task-transition-ledger");
const completion_gate_1 = require("../../test-agent/completion-gate");
const conversation_permission_policy_1 = require("../tools/conversation-permission-policy");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const logs_1 = require("./logs");
const test_agent_runner_1 = require("./test-agent-runner");
const artifact_retention_1 = require("../../test-agent/artifact-retention");
const storage_1 = require("./storage");
const sessions_1 = require("../projects/sessions");
const automation_session_bindings_1 = require("../../system/automation-session-bindings");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const task_replay_journal_1 = require("../../system/task-replay-journal");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function taskIdentityPart(value, fallback = "") {
    return (0, collaboration_1.compactFormText)(value, fallback).toLowerCase().replace(/\s+/g, " ");
}
function buildTaskIntakeIdentityV2(task) {
    const clientMessageId = (0, collaboration_1.compactFormText)(task.client_message_id || task.clientMessageId || task.workflow_meta?.intake?.client_message_id, "");
    if (!clientMessageId)
        return null;
    const groupId = (0, collaboration_1.compactFormText)(task.group_id || task.groupId, "");
    const groupSessionId = (0, collaboration_1.compactFormText)(task.group_session_id || task.groupSessionId, "");
    const projectId = (0, collaboration_1.compactFormText)(task.target_project || task.targetProject, "");
    const projectSessionId = (0, collaboration_1.compactFormText)(task.project_session_id || task.projectSessionId, "");
    const requestedScope = taskIdentityPart(task.target_scope || task.targetScope || task.orchestration_scope || task.orchestrationScope, "");
    const assignType = taskIdentityPart(task.assign_type || task.assignType, "");
    const targetScope = requestedScope === "group_session" || assignType === "group" || groupId
        ? "group_session"
        : requestedScope === "project_session" || assignType === "project" || projectSessionId
            ? "project_session"
            : "global";
    const sourceChannel = taskIdentityPart(task.source_channel || task.sourceChannel || task.request_origin || task.requestOrigin || task.workflow_meta?.intake?.source, "usability-intake");
    const targetId = taskIdentityPart(task.target_id || task.targetId || (targetScope === "group_session" ? groupId : targetScope === "project_session" ? projectId : "global"), "global");
    const exactSessionId = taskIdentityPart(task.exact_session_id || task.exactSessionId || (targetScope === "group_session" ? groupSessionId : targetScope === "project_session" ? projectSessionId : task.origin_session_id || task.originSessionId), targetScope === "global" ? "global" : "");
    const contentChecksum = taskIdentityPart(task.requirement_content_hash || task.requirementContentHash || task.content_checksum || task.contentChecksum, "");
    const workflowType = taskIdentityPart(task.workflow_type || task.workflowType, "general");
    const base = {
        schema: "ccm-task-intake-identity-v2",
        source_channel: sourceChannel,
        target_scope: targetScope,
        target_id: targetId,
        exact_session_id: exactSessionId,
        client_message_id: clientMessageId,
        content_checksum: contentChecksum,
        workflow_type: workflowType,
    };
    return {
        ...base,
        checksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex"),
    };
}
function sameTaskIdempotencyScope(existing, incoming) {
    const existingIdentity = existing?.intake_identity;
    const incomingIdentity = incoming?.intake_identity;
    if (existingIdentity?.schema === "ccm-task-intake-identity-v2" && incomingIdentity?.schema === "ccm-task-intake-identity-v2") {
        return existingIdentity.checksum === incomingIdentity.checksum;
    }
    return taskIdentityPart(existing?.workflow_type, "general") === taskIdentityPart(incoming?.workflow_type, "general")
        && taskIdentityPart(existing?.group_id) === taskIdentityPart(incoming?.group_id)
        && taskIdentityPart(existing?.group_session_id) === taskIdentityPart(incoming?.group_session_id)
        && taskIdentityPart(existing?.target_project) === taskIdentityPart(incoming?.target_project)
        && taskIdentityPart(existing?.project_session_id) === taskIdentityPart(incoming?.project_session_id)
        && taskIdentityPart(existing?.orchestration_scope) === taskIdentityPart(incoming?.orchestration_scope);
}
function createTaskWithScopedIdentity(task) {
    const tasks = (0, db_1.loadTasks)();
    const explicitIdempotencyKey = String(task.idempotency_key || task.idempotencyKey || "").trim();
    const taskGroupId = String(task.group_id || task.groupId || "").trim();
    const requestedProject = String(task.target_project || task.targetProject || "").trim();
    const projectTask = !taskGroupId
        && String(task.assign_type || task.assignType || "project").trim().toLowerCase() === "project"
        && (0, db_1.getConfigs)().some((config) => String(config?.name || "") === requestedProject);
    const automationTaskSource = (0, automation_session_bindings_1.inferAutomationTaskSource)(task);
    const bindingResolution = automationTaskSource && (taskGroupId || projectTask)
        ? (0, automation_session_bindings_1.resolveAutomationSessionBinding)({
            scope: taskGroupId ? "group" : "project",
            scopeId: taskGroupId || requestedProject,
            source: automationTaskSource,
            title: (0, memory_1.compactMemoryText)(task.title || "自动化任务", 80),
            actor: String(task.request_origin || task.requestOrigin || "task-service"),
        })
        : null;
    const taskGroupSession = taskGroupId
        ? bindingResolution
            ? { id: bindingResolution.snapshot.exactSessionId }
            : (0, storage_1.resolveWritableGroupChatSession)(taskGroupId, task.group_session_id || task.groupSessionId || "", {
                title: (0, memory_1.compactMemoryText)(task.title || "任务会话", 80),
                createDedicated: !String(task.group_session_id || task.groupSessionId || "").trim(),
                sessionKind: "automation",
            })
        : null;
    const taskGroupSessionId = String(taskGroupSession?.id || "");
    const requestedProjectSessionId = String(task.project_session_id || task.projectSessionId || "").trim();
    const projectSession = projectTask && bindingResolution
        ? { sessionId: bindingResolution.snapshot.exactSessionId }
        : projectTask && !requestedProjectSessionId
            ? (0, sessions_1.ensureProjectAutomationSession)(requestedProject, "", (0, memory_1.compactMemoryText)(task.title || "自动开发任务", 80))
            : null;
    // Public production routes validate supplied session ids before task creation. Preserve
    // existing persisted/internal ids here so historical tasks can still be recovered.
    const taskProjectSessionId = String(projectSession?.sessionId || requestedProjectSessionId || "");
    const sourceConversationRef = task.source_conversation_ref || task.sourceConversationRef || null;
    const targetConversationRef = task.target_conversation_ref || task.targetConversationRef || (taskGroupSessionId
        ? {
            scope: "group",
            scopeId: taskGroupId,
            exactSessionId: taskGroupSessionId,
            messageId: task.target_message_id || task.targetMessageId || "",
            title: (0, memory_1.compactMemoryText)(task.title || "群聊任务", 80),
        }
        : taskProjectSessionId && requestedProject
            ? {
                scope: "project",
                scopeId: requestedProject,
                exactSessionId: taskProjectSessionId,
                messageId: task.target_message_id || task.targetMessageId || "",
                title: (0, memory_1.compactMemoryText)(task.title || "项目任务", 80),
            }
            : null);
    const suppliedClientMessageId = (0, collaboration_1.compactFormText)(task.client_message_id || task.clientMessageId || task.workflow_meta?.intake?.client_message_id, "");
    const clientMessageId = suppliedClientMessageId
        || (explicitIdempotencyKey
            ? `legacy_${crypto.createHash("sha256").update(explicitIdempotencyKey).digest("hex").slice(0, 24)}`
            : `server_${crypto.randomUUID()}`);
    const suppliedContentChecksum = (0, collaboration_1.compactFormText)(task.requirement_content_hash || task.requirementContentHash || task.content_checksum || task.contentChecksum, "");
    const contentChecksum = suppliedContentChecksum || crypto.createHash("sha256").update(JSON.stringify({
        title: task.title || "",
        description: task.description || "",
        business_goal: task.business_goal || task.businessGoal || "",
        acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || "",
    })).digest("hex");
    const identityInput = {
        ...task,
        group_id: taskGroupId || null,
        group_session_id: taskGroupSessionId || null,
        project_session_id: taskProjectSessionId || null,
        client_message_id: clientMessageId,
        content_checksum: contentChecksum,
    };
    const intakeIdentity = buildTaskIntakeIdentityV2(identityInput);
    const idempotencyKey = intakeIdentity ? `task-intake-v2:${intakeIdentity.checksum}` : explicitIdempotencyKey;
    if (idempotencyKey) {
        const existing = tasks.find((item) => String(item.idempotency_key || "") === idempotencyKey
            && sameTaskIdempotencyScope(item, { ...identityInput, intake_identity: intakeIdentity }));
        if (existing)
            return { ...existing, deduplicated: true, duplicate_reason: "同一次提交已在当前精确会话创建任务" };
    }
    const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id || task.traceId, "task");
    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: task.title,
        description: task.description || "",
        target_project: task.target_project,
        group_id: taskGroupId || null,
        group_session_id: taskGroupSessionId || null,
        assign_type: task.assign_type || "project",
        status: "pending",
        revision: 0,
        priority: task.priority || "normal",
        auto_execute: !!(task.auto_execute || task.autoExecute),
        queue_scope: task.queue_scope || task.queueScope || (taskGroupSessionId || taskProjectSessionId ? "conversation_serial" : ""),
        child_agent_isolation: task.child_agent_isolation || task.childAgentIsolation || "",
        branch_policy: task.branch_policy || task.branchPolicy || "",
        commit_policy: task.commit_policy || task.commitPolicy || "",
        allowed_paths: Array.isArray(task.allowed_paths || task.allowedPaths) ? (task.allowed_paths || task.allowedPaths) : [],
        workflow_type: task.workflow_type || task.workflowType || "general",
        business_goal: task.business_goal || task.businessGoal || "",
        acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || "",
        source_documents: task.source_documents || task.sourceDocuments || "",
        source_attachments: Array.isArray(task.source_attachments || task.sourceAttachments)
            ? (task.source_attachments || task.sourceAttachments)
            : [],
        source_attachment_contexts: Array.isArray(task.source_attachment_contexts || task.sourceAttachmentContexts)
            ? (task.source_attachment_contexts || task.sourceAttachmentContexts)
            : [],
        source_attachment_context: task.source_attachment_context || task.sourceAttachmentContext || "",
        source_attachment_warnings: Array.isArray(task.source_attachment_warnings || task.sourceAttachmentWarnings)
            ? (task.source_attachment_warnings || task.sourceAttachmentWarnings)
            : [],
        requirement_extraction: task.requirement_extraction || task.requirementExtraction || null,
        requirement_decomposition: task.requirement_decomposition || task.requirementDecomposition || null,
        decomposition_plan: task.decomposition_plan || task.decompositionPlan || null,
        requirement_content_hash: task.requirement_content_hash || task.requirementContentHash || "",
        requirement_version: Math.max(1, Number(task.requirement_version || task.requirementVersion || 1)),
        requirement_item_key: task.requirement_item_key || task.requirementItemKey || "",
        source_ingestion: task.source_ingestion || task.sourceIngestion || null,
        requires_code_changes: task.requires_code_changes ?? task.requiresCodeChanges ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
        requires_verification: task.requires_verification ?? task.requiresVerification ?? (task.workflow_type === "daily_dev" || task.workflowType === "daily_dev"),
        requires_independent_review: task.requires_independent_review ?? task.requiresIndependentReview ?? false,
        requires_agent_qa: task.requires_agent_qa ?? task.requiresAgentQa ?? false,
        workflow_decision: task.workflow_decision || task.workflowDecision || task.intake_draft?.workflow_decision || task.intakeDraft?.workflowDecision || null,
        workflow_meta: task.workflow_meta || task.workflowMeta || null,
        orchestration_scope: task.orchestration_scope || task.orchestrationScope || "",
        project_session_id: taskProjectSessionId || null,
        automation_task_source: automationTaskSource || null,
        automation_session_binding_snapshot: bindingResolution?.snapshot || null,
        source_conversation_ref: sourceConversationRef,
        target_conversation_ref: targetConversationRef,
        target_message_id: task.target_message_id || task.targetMessageId || null,
        project_main_run_id: task.project_main_run_id || task.projectMainRunId || null,
        request_origin: task.request_origin || task.requestOrigin || task.workflow_meta?.intake?.source || "task-dispatch",
        origin_session_id: task.origin_session_id || task.originSessionId || taskGroupSessionId || task.project_session_id || task.projectSessionId || null,
        parent_work_item_id: task.parent_work_item_id || task.parentWorkItemId || null,
        acceptance_state: task.acceptance_state || task.acceptanceState || "pending",
        acceptance_mode: task.acceptance_mode || task.acceptanceMode || null,
        test_agent_enabled: task.test_agent_enabled ?? task.testAgentEnabled ?? null,
        parent_task_id: task.parent_task_id || task.parentTaskId || null,
        root_task_id: task.root_task_id || task.rootTaskId || null,
        retry_of_task_id: task.retry_of_task_id || task.retryOfTaskId || null,
        source_task_id: task.source_task_id || task.sourceTaskId || null,
        task_thread_id: task.task_thread_id || task.taskThreadId || task.root_task_id || task.rootTaskId || task.retry_of_task_id || task.retryOfTaskId || task.source_task_id || task.sourceTaskId || null,
        global_mission_id: task.global_mission_id || task.globalMissionId || null,
        mission_target: task.mission_target || task.missionTarget || null,
        mission_handoff: task.mission_handoff || task.missionHandoff || null,
        mission_dependencies: Array.isArray(task.mission_dependencies || task.missionDependencies)
            ? (task.mission_dependencies || task.missionDependencies)
            : [],
        deadline_at: task.deadline_at || task.deadlineAt || null,
        task_template_id: task.task_template_id || task.taskTemplateId || null,
        task_template_revision: task.task_template_revision || task.taskTemplateRevision || null,
        template_variables: task.template_variables || task.templateVariables || null,
        intake_preflight: task.intake_preflight || task.intakePreflight || null,
        child_task_ids: Array.isArray(task.child_task_ids || task.childTaskIds) ? (task.child_task_ids || task.childTaskIds) : [],
        mission_plan: task.mission_plan || task.missionPlan || null,
        followups: Array.isArray(task.followups) ? task.followups : [],
        intake_state: task.intake_state || task.intakeState || null,
        intake_draft: task.intake_draft || task.intakeDraft || null,
        cron_job_id: task.cron_job_id || null,
        cron_run_id: task.cron_run_id || null,
        cron_occurrence_id: task.cron_occurrence_id || task.cronOccurrenceId || null,
        cron_scheduled_for: task.cron_scheduled_for || task.cronScheduledFor || null,
        cron_trigger: task.cron_trigger || null,
        trace_id: traceId,
        idempotency_key: idempotencyKey || null,
        intake_identity: intakeIdentity,
        client_message_id: intakeIdentity?.client_message_id || task.client_message_id || task.clientMessageId || null,
        source_channel: intakeIdentity?.source_channel || task.source_channel || task.sourceChannel || null,
        target_scope: intakeIdentity?.target_scope || task.target_scope || task.targetScope || null,
        target_id: intakeIdentity?.target_id || task.target_id || task.targetId || null,
        exact_session_id: intakeIdentity?.exact_session_id || task.exact_session_id || task.exactSessionId || null,
        intake_identity_checksum: intakeIdentity?.checksum || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    const acceptancePolicy = (0, task_acceptance_policy_1.buildTaskAcceptancePolicySnapshot)(newTask);
    newTask.conversation_permission_snapshot = (0, conversation_permission_policy_1.permissionSnapshotForTask)(newTask);
    newTask.conversation_permission_mode = newTask.conversation_permission_snapshot.mode;
    newTask.permission_policy_revision = newTask.conversation_permission_snapshot.revision;
    if (acceptancePolicy) {
        newTask.acceptance_policy_snapshot = acceptancePolicy;
        newTask.acceptance_mode = acceptancePolicy.mode;
        newTask.test_agent_enabled = acceptancePolicy.test_agent_enabled;
    }
    newTask.work_items = (0, work_items_1.buildMainAgentWorkItems)(newTask);
    newTask.work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(newTask.work_items);
    tasks.push(newTask);
    (0, db_1.saveTasks)(tasks);
    (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `task:${newTask.id}:created`, type: "task.created", status: "ok", task_id: newTask.id, group_id: newTask.group_id || "", agent: newTask.target_project || "", message: newTask.title, data: { workflow_type: newTask.workflow_type, assign_type: newTask.assign_type, group_session_id: newTask.group_session_id || "", idempotency_key: idempotencyKey ? "present" : "absent", intake_identity_checksum: intakeIdentity?.checksum || "", source_channel: intakeIdentity?.source_channel || "", target_scope: intakeIdentity?.target_scope || "" } });
    return newTask;
}
function createTask(task) {
    return (0, atomic_json_file_1.withFileLock)(path.join(utils_1.CCM_DIR, "task-create-identity-v2"), () => createTaskWithScopedIdentity(task), {
        timeoutMs: 10_000,
        staleMs: 60_000,
    });
}
function requirementEpicTaskId(prefix = "task") {
    return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}
function requirementEpicTextList(value, fallback = "") {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    const cleaned = rows.map(item => (0, collaboration_1.compactFormText)(item, "")).filter(Boolean);
    return cleaned.length ? cleaned.join("；") : fallback;
}
function resolveRequirementEpicTarget(item, input, groups, configs) {
    const requestedType = String(item.target_type || "auto").toLowerCase();
    const requestedId = String(item.target_id || "").trim();
    const defaultGroupId = String(input.group_id || input.groupId || input.default_group_id || input.defaultGroupId || "").trim();
    const defaultProject = String(input.target_project || input.targetProject || input.default_project || input.defaultProject || "").trim();
    const taskSource = (0, automation_session_bindings_1.inferAutomationTaskSource)(input) || "requirement_pool";
    const directProject = requestedType === "project"
        ? configs.find((config) => config.name === requestedId)
        : requestedType === "auto" && !defaultGroupId && defaultProject
            ? configs.find((config) => config.name === defaultProject)
            : null;
    if (requestedType === "project" && requestedId && !directProject)
        throw new Error(`子任务 ${item.item_key} 指定的项目不存在：${requestedId}`);
    if (directProject) {
        const resolution = (0, automation_session_bindings_1.resolveAutomationSessionBinding)({
            scope: "project",
            scopeId: directProject.name,
            source: taskSource,
            title: (0, memory_1.compactMemoryText)(item.title || "需求子任务", 80),
            actor: "requirement_epic_target_resolution",
        });
        return {
            assign_type: "project",
            group_id: null,
            group_session_id: null,
            project_session_id: resolution.snapshot.exactSessionId,
            automation_session_binding_snapshot: resolution.snapshot,
            target_project: directProject.name,
            target: {
                type: "project",
                name: directProject.name,
                project: directProject.name,
                item_key: item.item_key,
                automation_session_binding_snapshot: resolution.snapshot,
            },
        };
    }
    const requestedGroup = requestedType === "group" && requestedId
        ? groups.find((group) => group.id === requestedId || group.name === requestedId)
        : null;
    if (requestedType === "group" && requestedId && !requestedGroup)
        throw new Error(`子任务 ${item.item_key} 指定的群聊不存在：${requestedId}`);
    const group = requestedGroup || groups.find((entry) => entry.id === defaultGroupId) || null;
    if (!group)
        throw new Error(`子任务 ${item.item_key} 未找到可执行项目或群聊`);
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
    if (!coordinator?.project)
        throw new Error(`群聊 ${group.name || group.id} 没有可执行的主 Agent`);
    const resolution = (0, automation_session_bindings_1.resolveAutomationSessionBinding)({
        scope: "group",
        scopeId: group.id,
        source: taskSource,
        title: (0, memory_1.compactMemoryText)(item.title || "需求子任务", 80),
        actor: "requirement_epic_target_resolution",
    });
    return {
        assign_type: "group",
        group_id: group.id,
        group_session_id: resolution.snapshot.exactSessionId,
        project_session_id: null,
        automation_session_binding_snapshot: resolution.snapshot,
        target_project: coordinator.project,
        target: {
            type: "group",
            name: group.name || group.id,
            group_id: group.id,
            coordinator: coordinator.project,
            item_key: item.item_key,
            automation_session_binding_snapshot: resolution.snapshot,
        },
    };
}
function buildRequirementEpicTaskRecord(input, id, traceId, now) {
    const groupId = String(input.group_id || input.groupId || "").trim();
    const groupSession = groupId
        ? (0, storage_1.resolveWritableGroupChatSession)(groupId, input.group_session_id || input.groupSessionId || "", {
            title: (0, memory_1.compactMemoryText)(input.title || "需求 Epic", 80),
            createDedicated: !String(input.group_session_id || input.groupSessionId || "").trim(),
            sessionKind: "automation",
        })
        : null;
    const record = {
        id,
        title: input.title || "需求开发任务",
        description: input.description || "",
        target_project: input.target_project || "",
        group_id: groupId || null,
        group_session_id: String(groupSession?.id || input.group_session_id || input.groupSessionId || "") || null,
        assign_type: input.assign_type || "project",
        status: input.status || "pending",
        status_detail: input.status_detail || "",
        priority: input.priority || "normal",
        auto_execute: input.auto_execute === true || input.autoExecute === true,
        queue_scope: input.queue_scope || input.queueScope || "",
        child_agent_isolation: input.child_agent_isolation || input.childAgentIsolation || "",
        branch_policy: input.branch_policy || input.branchPolicy || "",
        commit_policy: input.commit_policy || input.commitPolicy || "",
        allowed_paths: Array.isArray(input.allowed_paths || input.allowedPaths) ? (input.allowed_paths || input.allowedPaths) : [],
        workflow_type: input.workflow_type || input.workflowType || "daily_dev",
        business_goal: input.business_goal || input.businessGoal || "",
        acceptance_criteria: input.acceptance_criteria || input.acceptanceCriteria || "",
        source_documents: input.source_documents || input.sourceDocuments || "",
        source_attachments: Array.isArray(input.source_attachments || input.sourceAttachments) ? (input.source_attachments || input.sourceAttachments) : [],
        requirement_extraction: input.requirement_extraction || input.requirementExtraction || null,
        requirement_decomposition: input.requirement_decomposition || input.requirementDecomposition || null,
        source_ingestion: input.source_ingestion || input.sourceIngestion || null,
        requirement_content_hash: input.requirement_content_hash || input.requirementContentHash || "",
        requirement_version: Math.max(1, Number(input.requirement_version || input.requirementVersion || 1)),
        requirement_item_key: input.requirement_item_key || input.requirementItemKey || "",
        decomposition_plan: input.decomposition_plan || input.decompositionPlan || null,
        requires_code_changes: input.requires_code_changes ?? input.requiresCodeChanges ?? true,
        requires_verification: input.requires_verification ?? input.requiresVerification ?? true,
        requires_independent_review: input.requires_independent_review ?? input.requiresIndependentReview ?? false,
        requires_agent_qa: input.requires_agent_qa ?? input.requiresAgentQa ?? false,
        workflow_meta: input.workflow_meta || input.workflowMeta || null,
        orchestration_scope: input.orchestration_scope || input.orchestrationScope || "",
        project_session_id: input.project_session_id || input.projectSessionId || null,
        request_origin: input.request_origin || input.requestOrigin || input.workflow_meta?.intake?.source || "task-dispatch",
        origin_session_id: input.origin_session_id || input.originSessionId || input.group_session_id || input.groupSessionId || input.project_session_id || input.projectSessionId || null,
        parent_task_id: input.parent_task_id || input.parentTaskId || null,
        root_task_id: input.root_task_id || input.rootTaskId || null,
        retry_of_task_id: input.retry_of_task_id || input.retryOfTaskId || null,
        source_task_id: input.source_task_id || input.sourceTaskId || null,
        task_thread_id: input.task_thread_id || input.taskThreadId || input.root_task_id || input.rootTaskId || input.retry_of_task_id || input.retryOfTaskId || input.source_task_id || input.sourceTaskId || null,
        global_mission_id: input.global_mission_id || input.globalMissionId || null,
        requirement_epic_id: input.requirement_epic_id || input.requirementEpicId || null,
        mission_target: input.mission_target || input.missionTarget || null,
        mission_handoff: input.mission_handoff || input.missionHandoff || null,
        mission_dependencies: Array.isArray(input.mission_dependencies || input.missionDependencies) ? (input.mission_dependencies || input.missionDependencies) : [],
        requirement_dependency_keys: Array.isArray(input.requirement_dependency_keys || input.requirementDependencyKeys) ? (input.requirement_dependency_keys || input.requirementDependencyKeys) : [],
        child_task_ids: Array.isArray(input.child_task_ids || input.childTaskIds) ? (input.child_task_ids || input.childTaskIds) : [],
        mission_plan: input.mission_plan || input.missionPlan || null,
        intake_state: input.intake_state || input.intakeState || "confirmed",
        intake_draft: input.intake_draft || input.intakeDraft || null,
        trace_id: traceId,
        idempotency_key: String(input.idempotency_key || input.idempotencyKey || "").trim() || null,
        intake_identity: input.intake_identity || input.intakeIdentity || null,
        client_message_id: input.client_message_id || input.clientMessageId || null,
        source_channel: input.source_channel || input.sourceChannel || null,
        target_scope: input.target_scope || input.targetScope || null,
        target_id: input.target_id || input.targetId || null,
        exact_session_id: input.exact_session_id || input.exactSessionId || null,
        intake_identity_checksum: input.intake_identity_checksum || input.intakeIdentityChecksum || input.intake_identity?.checksum || input.intakeIdentity?.checksum || null,
        created_at: now,
        updated_at: now,
    };
    record.work_items = (0, work_items_1.buildMainAgentWorkItems)(record);
    record.work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(record.work_items);
    record.conversation_permission_snapshot = (0, conversation_permission_policy_1.permissionSnapshotForTask)(record);
    record.conversation_permission_mode = record.conversation_permission_snapshot.mode;
    record.permission_policy_revision = record.conversation_permission_snapshot.revision;
    return record;
}
function createRequirementEpicWithChildren(payload) {
    const tasks = (0, db_1.loadTasks)();
    const rawPlan = payload.decomposition_plan || payload.decompositionPlan || payload.requirement_decomposition || payload.requirementDecomposition;
    const requirement = payload.requirement_extraction || payload.requirementExtraction || null;
    const contentHash = String(payload.requirement_content_hash || payload.requirementContentHash || rawPlan?.content_hash || "").trim();
    const plan = (0, source_ingestion_1.validateRequirementDecomposition)(rawPlan, {
        contentHash,
        requirement,
        extractionMethod: rawPlan?.extraction_method,
    });
    const channel = (0, collaboration_1.compactFormText)(payload.channel || payload.source, "ccm").replace(/[^a-zA-Z0-9_.:-]/g, "-");
    const conversation = (0, collaboration_1.compactFormText)(payload.conversation_id || payload.conversationId || payload.group_session_id || payload.groupSessionId || payload.group_id || payload.groupId, "default").replace(/[^a-zA-Z0-9_.:-]/g, "-");
    const clientMessageId = (0, collaboration_1.compactFormText)(payload.client_message_id || payload.clientMessageId, plan.content_hash.slice(0, 16))
        .replace(/[^a-zA-Z0-9_.:-]/g, "-");
    const batchKey = String(payload.idempotency_key || payload.idempotencyKey || `requirement-epic:${channel}:${conversation}:${clientMessageId}:${plan.content_hash}`).trim();
    const requestedDraftId = String(payload.draft_task_id || payload.draftTaskId || "").trim();
    const existingParent = tasks.find((task) => task.workflow_type === "requirement_epic"
        && (task.idempotency_key === batchKey || (requestedDraftId && task.id === requestedDraftId)));
    if (existingParent && Array.isArray(existingParent.child_task_ids) && existingParent.child_task_ids.length > 0) {
        const byId = new Map(tasks.map((task) => [task.id, task]));
        return {
            success: true,
            duplicate: true,
            epic: existingParent,
            children: (existingParent.child_task_ids || []).map((id) => byId.get(id)).filter(Boolean),
            decomposition_plan: existingParent.decomposition_plan || plan,
        };
    }
    if (plan.clarification_questions.length && payload.clarifications_resolved !== true && payload.clarificationsResolved !== true) {
        return {
            success: false,
            needs_clarification: true,
            decomposition_plan: plan,
            clarification_questions: plan.clarification_questions,
        };
    }
    if (payload.confirmed !== true) {
        return {
            success: false,
            needs_confirmation: true,
            decomposition_plan: plan,
        };
    }
    const groups = (0, storage_1.loadGroups)();
    const configs = (0, db_1.getConfigs)();
    const traceId = (0, reliability_ledger_1.ensureTraceId)(payload.trace_id || payload.traceId, "requirement-epic");
    const now = new Date().toISOString();
    const parentId = existingParent?.id || requirementEpicTaskId("epic");
    const childIdByKey = new Map(plan.items.map(item => [item.item_key, requirementEpicTaskId("task")]));
    const resolved = plan.items.map(item => ({
        item,
        target: resolveRequirementEpicTarget(item, payload, groups, configs),
    }));
    const dependencyEdges = resolved.flatMap(({ item }) => item.depends_on.map(dependency => ({
        from_item_key: dependency,
        to_item_key: item.item_key,
        from_task_id: childIdByKey.get(dependency),
        to_task_id: childIdByKey.get(item.item_key),
    })));
    const shared = {
        priority: payload.priority || "normal",
        queue_scope: payload.queue_scope || payload.queueScope || "conversation_serial",
        orchestration_scope: payload.orchestration_scope || payload.orchestrationScope || (payload.group_id || payload.groupId ? "group_session" : "project_session"),
        project_session_id: payload.project_session_id || payload.projectSessionId || null,
        automation_task_source: (0, automation_session_bindings_1.inferAutomationTaskSource)(payload) || null,
        automation_session_binding_snapshot: payload.automation_session_binding_snapshot || payload.automationSessionBindingSnapshot || null,
        request_origin: payload.request_origin || payload.requestOrigin || payload.source || channel,
        origin_session_id: payload.origin_session_id || payload.originSessionId || payload.group_session_id || payload.groupSessionId || payload.project_session_id || payload.projectSessionId || null,
        source_documents: payload.source_documents || payload.sourceDocuments || "",
        source_attachments: payload.source_attachments || payload.sourceAttachments || [],
        requirement_extraction: requirement,
        requirement_decomposition: plan,
        source_ingestion: payload.source_ingestion || payload.sourceIngestion || null,
        requirement_content_hash: plan.content_hash,
        requirement_version: plan.version,
        trace_id: traceId,
        intake_identity: payload.intake_identity || payload.intakeIdentity || null,
        client_message_id: clientMessageId,
        source_channel: payload.source_channel || payload.sourceChannel || channel,
        target_scope: payload.target_scope || payload.targetScope || (payload.group_id || payload.groupId ? "group_session" : "project_session"),
        target_id: payload.target_id || payload.targetId || payload.group_id || payload.groupId || payload.target_project || payload.targetProject || "",
        exact_session_id: payload.exact_session_id || payload.exactSessionId || payload.group_session_id || payload.groupSessionId || payload.project_session_id || payload.projectSessionId || "",
        intake_identity_checksum: payload.intake_identity_checksum || payload.intakeIdentityChecksum || payload.intake_identity?.checksum || payload.intakeIdentity?.checksum || null,
    };
    const parent = buildRequirementEpicTaskRecord({
        ...shared,
        title: plan.epic_title,
        description: plan.business_goal,
        business_goal: plan.business_goal,
        acceptance_criteria: requirementEpicTextList(plan.global_acceptance_criteria, "所有必需子任务通过验收并完成 Epic 集成验证"),
        target_project: "global-agent",
        group_id: payload.group_id || payload.groupId || null,
        group_session_id: payload.group_session_id || payload.groupSessionId || null,
        assign_type: "global",
        workflow_type: "requirement_epic",
        status: "in_progress",
        status_detail: `Epic 已确认，准备派发 ${plan.items.length} 个子任务`,
        auto_execute: false,
        requires_code_changes: resolved.some(({ item }) => item.suggested_agent_capabilities.some(capability => capability !== "documentation")),
        requires_verification: true,
        requires_independent_review: true,
        decomposition_plan: { ...plan, dependency_edges: dependencyEdges },
        child_task_ids: [...childIdByKey.values()],
        intake_state: "confirmed",
        workflow_meta: {
            requirement_epic: {
                owner_agent: payload.owner_agent || payload.ownerAgent || "global-agent",
                source: payload.source || channel,
                batch_key: batchKey,
                confirmed_at: now,
                child_count: plan.items.length,
            },
        },
        idempotency_key: batchKey,
    }, parentId, traceId, now);
    if (existingParent?.created_at)
        parent.created_at = existingParent.created_at;
    const children = resolved.map(({ item, target }) => {
        const childId = childIdByKey.get(item.item_key);
        const dependencyTaskIds = item.depends_on.map(key => childIdByKey.get(key)).filter(Boolean);
        return buildRequirementEpicTaskRecord({
            ...shared,
            title: item.title,
            description: (0, daily_dev_backlog_1.buildDailyDevTaskDescription)({
                title: item.title,
                business_goal: item.business_goal,
                scope: requirementEpicTextList(item.scope, "按确认后的 Epic 子任务边界执行"),
                documents: payload.source_documents || payload.sourceDocuments || "",
                acceptance: requirementEpicTextList(item.acceptance_criteria, "完成子任务并提供实际验证证据"),
                constraints: `这是需求 Epic ${parentId} 的子任务 ${item.item_key}；不得静默扩大确认范围。`,
            }),
            business_goal: item.business_goal,
            acceptance_criteria: requirementEpicTextList(item.acceptance_criteria),
            target_project: target.target_project,
            group_id: target.group_id,
            group_session_id: target.group_session_id || null,
            project_session_id: target.project_session_id || null,
            automation_task_source: (0, automation_session_bindings_1.inferAutomationTaskSource)(payload) || "requirement_pool",
            automation_session_binding_snapshot: target.automation_session_binding_snapshot || null,
            queue_scope: payload.queue_scope || payload.queueScope || "conversation_serial",
            assign_type: target.assign_type,
            workflow_type: "daily_dev",
            status: "pending",
            status_detail: dependencyTaskIds.length ? "等待前置子任务通过验收" : "等待进入执行队列",
            auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
            parent_task_id: parentId,
            global_mission_id: parentId,
            requirement_epic_id: parentId,
            requirement_item_key: item.item_key,
            mission_target: target.target,
            mission_dependencies: dependencyTaskIds,
            requirement_dependency_keys: item.depends_on,
            requires_code_changes: item.item_key === "epic-integration-acceptance"
                ? false
                : !item.suggested_agent_capabilities.every(capability => capability === "documentation"),
            requires_verification: true,
            requires_independent_review: payload.requires_independent_review !== false,
            workflow_meta: {
                requirement_epic: {
                    parent_task_id: parentId,
                    item_key: item.item_key,
                    scope: item.scope,
                    risks: item.risks,
                    source_evidence: item.source_evidence,
                    confirmed_plan_version: plan.version,
                },
            },
            idempotency_key: `${batchKey}:item:${item.item_key}`,
        }, childId, traceId, now);
    });
    const retainedTasks = existingParent ? tasks.filter((task) => task.id !== existingParent.id) : tasks;
    const duplicateTaskIds = new Set(retainedTasks.map((task) => task.id));
    for (const record of [parent, ...children]) {
        if (duplicateTaskIds.has(record.id))
            throw new Error(`批量创建任务 ID 冲突：${record.id}`);
        duplicateTaskIds.add(record.id);
    }
    (0, db_1.saveTasks)([...retainedTasks, parent, ...children]);
    (0, reliability_ledger_1.appendTraceEvent)(traceId, {
        id: `requirement-epic:${parentId}:created`,
        type: "requirement_epic.created",
        status: "ok",
        task_id: parentId,
        group_id: parent.group_id || "",
        agent: payload.owner_agent || payload.ownerAgent || "global-agent",
        message: `已从需求文档原子创建 Epic 和 ${children.length} 个子任务`,
        data: { batch_key: batchKey, content_hash: plan.content_hash, version: plan.version, child_task_ids: children.map(child => child.id), dependency_edges: dependencyEdges },
    });
    (0, logs_1.appendTaskTimelineEvent)(parentId, {
        type: "requirement_epic_created",
        title: "需求文档已拆分为持久任务",
        detail: `一次创建 ${children.length} 个子任务，依赖关系已保存`,
        status: "active",
        phase: "dispatching",
        agent: payload.owner_agent || payload.ownerAgent || "global-agent",
        data: { decomposition_plan: plan, dependency_edges: dependencyEdges },
    });
    return {
        success: true,
        duplicate: false,
        epic: parent,
        children,
        decomposition_plan: plan,
        dependency_edges: dependencyEdges,
    };
}
function updateRequirementEpicFromPlan(payload) {
    const tasks = (0, db_1.loadTasks)();
    const epicId = String(payload.epic_id || payload.epicId || payload.id || "").trim();
    const epic = tasks.find((task) => task.id === epicId && task.workflow_type === "requirement_epic");
    if (!epic)
        throw new Error("需求 Epic 不存在");
    if (payload.confirmed !== true)
        return { success: false, needs_confirmation: true, epic };
    const previousPlan = epic.decomposition_plan || epic.requirement_decomposition;
    const requestedPlan = payload.decomposition_plan || payload.decompositionPlan || payload.requirement_decomposition || payload.requirementDecomposition;
    const nextPlan = (0, source_ingestion_1.validateRequirementDecomposition)({
        ...requestedPlan,
        version: Math.max(Number(previousPlan?.version || epic.requirement_version || 1) + 1, Number(requestedPlan?.version || 1)),
    }, {
        contentHash: requestedPlan?.content_hash || payload.requirement_content_hash || payload.requirementContentHash,
        requirement: payload.requirement_extraction || payload.requirementExtraction || epic.requirement_extraction,
        extractionMethod: requestedPlan?.extraction_method,
    });
    const diff = (0, source_ingestion_1.diffRequirementDecompositionPlans)(previousPlan, nextPlan);
    if (!diff.has_changes && nextPlan.content_hash === previousPlan?.content_hash) {
        return { success: true, duplicate: true, epic, children: tasks.filter((task) => task.parent_task_id === epic.id), diff };
    }
    const groups = (0, storage_1.loadGroups)();
    const configs = (0, db_1.getConfigs)();
    const now = new Date().toISOString();
    const traceId = epic.trace_id;
    const existingChildren = tasks.filter((task) => task.parent_task_id === epic.id);
    const childByKey = new Map(existingChildren.map((task) => [String(task.requirement_item_key || ""), task]));
    const childIdByKey = new Map(nextPlan.items.map(item => [
        item.item_key,
        childByKey.get(item.item_key)?.id || requirementEpicTaskId("task"),
    ]));
    const resolved = nextPlan.items.map(item => ({
        item,
        target: resolveRequirementEpicTarget(item, { ...epic, ...payload }, groups, configs),
    }));
    const changedKeys = new Set([...diff.added, ...diff.changed]);
    let expanded = true;
    while (expanded) {
        expanded = false;
        for (const item of nextPlan.items) {
            if (changedKeys.has(item.item_key))
                continue;
            if (item.depends_on.some(dependency => changedKeys.has(dependency))) {
                changedKeys.add(item.item_key);
                expanded = true;
            }
        }
    }
    const impactDiff = {
        ...diff,
        affected: [...changedKeys],
        reopened: [...changedKeys].filter(key => !diff.added.includes(key)),
    };
    const activeChildren = resolved.map(({ item, target }) => {
        const existing = childByKey.get(item.item_key);
        const dependencies = item.depends_on.map(key => childIdByKey.get(key)).filter(Boolean);
        if (existing && !changedKeys.has(item.item_key)) {
            return {
                ...existing,
                mission_dependencies: dependencies,
                requirement_dependency_keys: item.depends_on,
                requirement_version: nextPlan.version,
                requirement_content_hash: nextPlan.content_hash,
                requirement_decomposition: nextPlan,
                mission_target: target.target,
                updated_at: now,
            };
        }
        const record = buildRequirementEpicTaskRecord({
            title: item.title,
            description: (0, daily_dev_backlog_1.buildDailyDevTaskDescription)({
                title: item.title,
                business_goal: item.business_goal,
                scope: requirementEpicTextList(item.scope),
                documents: payload.source_documents || epic.source_documents || "",
                acceptance: requirementEpicTextList(item.acceptance_criteria),
                constraints: `这是需求 Epic ${epic.id} 的第 ${nextPlan.version} 版子任务 ${item.item_key}；只处理新版计划中受影响的范围。`,
            }),
            business_goal: item.business_goal,
            acceptance_criteria: requirementEpicTextList(item.acceptance_criteria),
            target_project: target.target_project,
            group_id: target.group_id,
            // Epic 的会话只属于 Epic 主群；子任务落在其他群时按该群自行解析，避免跨群传错会话。
            group_session_id: target.group_id && String(target.group_id) === String(epic.group_id || "")
                ? epic.group_session_id
                : null,
            assign_type: target.assign_type,
            workflow_type: "daily_dev",
            status: "pending",
            status_detail: existing ? `需求第 ${nextPlan.version} 版影响该子任务，已保留历史并重新等待执行` : `需求第 ${nextPlan.version} 版新增子任务，等待执行`,
            auto_execute: payload.auto_execute !== false,
            parent_task_id: epic.id,
            global_mission_id: epic.id,
            requirement_epic_id: epic.id,
            requirement_item_key: item.item_key,
            requirement_version: nextPlan.version,
            requirement_content_hash: nextPlan.content_hash,
            requirement_extraction: payload.requirement_extraction || epic.requirement_extraction,
            requirement_decomposition: nextPlan,
            source_documents: payload.source_documents || epic.source_documents,
            source_attachments: payload.source_attachments || epic.source_attachments,
            source_ingestion: payload.source_ingestion || epic.source_ingestion,
            mission_target: target.target,
            mission_dependencies: dependencies,
            requirement_dependency_keys: item.depends_on,
            requires_code_changes: item.item_key === "epic-integration-acceptance"
                ? false
                : !item.suggested_agent_capabilities.every(capability => capability === "documentation"),
            requires_verification: true,
            requires_independent_review: true,
            workflow_meta: {
                requirement_epic: {
                    parent_task_id: epic.id,
                    item_key: item.item_key,
                    confirmed_plan_version: nextPlan.version,
                    changed_from_previous_version: !!existing,
                    previous_delivery: existing?.delivery_summary || null,
                },
            },
            idempotency_key: `${epic.id}:v${nextPlan.version}:item:${item.item_key}`,
        }, childIdByKey.get(item.item_key), traceId, now);
        if (existing?.created_at)
            record.created_at = existing.created_at;
        if (existing) {
            record.delivery_history = [
                ...(Array.isArray(existing.delivery_history) ? existing.delivery_history : []),
                {
                    version: Number(existing.requirement_version || nextPlan.version - 1),
                    archived_at: now,
                    status: existing.status,
                    delivery_summary: existing.delivery_summary || null,
                    receipt: existing.receipt || null,
                },
            ].slice(-20);
        }
        return record;
    });
    const activeIds = new Set(activeChildren.map(child => child.id));
    const retiredChildren = existingChildren
        .filter(child => !activeIds.has(child.id))
        .map(child => ({
        ...child,
        status: child.status === "done" ? child.status : "cancelled",
        auto_execute: false,
        requirement_removed_in_version: nextPlan.version,
        status_detail: child.status === "done"
            ? `需求第 ${nextPlan.version} 版已删除该范围；保留已完成交付作为历史`
            : `需求第 ${nextPlan.version} 版已删除该范围，尚未完成的子任务已取消`,
        updated_at: now,
    }));
    const dependencyEdges = nextPlan.items.flatMap(item => item.depends_on.map(key => ({
        from_item_key: key,
        to_item_key: item.item_key,
        from_task_id: childIdByKey.get(key),
        to_task_id: childIdByKey.get(item.item_key),
    })));
    const updatedEpic = {
        ...epic,
        status: "in_progress",
        status_detail: `需求已升级到第 ${nextPlan.version} 版：新增 ${diff.added.length}、重开 ${impactDiff.reopened.length}、移除 ${diff.removed.length}`,
        decomposition_plan: { ...nextPlan, dependency_edges: dependencyEdges },
        requirement_decomposition: nextPlan,
        requirement_content_hash: nextPlan.content_hash,
        requirement_version: nextPlan.version,
        requirement_extraction: payload.requirement_extraction || epic.requirement_extraction,
        source_documents: payload.source_documents || epic.source_documents,
        source_attachments: payload.source_attachments || epic.source_attachments,
        source_ingestion: payload.source_ingestion || epic.source_ingestion,
        child_task_ids: activeChildren.map(child => child.id),
        requirement_version_history: [
            ...(Array.isArray(epic.requirement_version_history) ? epic.requirement_version_history : []),
            {
                version: Number(previousPlan?.version || epic.requirement_version || 1),
                content_hash: previousPlan?.content_hash || epic.requirement_content_hash || "",
                archived_at: now,
                decomposition_plan: previousPlan,
            },
        ].slice(-10),
        last_requirement_diff: impactDiff,
        updated_at: now,
    };
    const existingChildIds = new Set(existingChildren.map(child => child.id));
    const retained = tasks.filter((task) => task.id !== epic.id && !existingChildIds.has(task.id));
    (0, db_1.saveTasks)([...retained, updatedEpic, ...activeChildren, ...retiredChildren]);
    (0, reliability_ledger_1.appendTraceEvent)(traceId, {
        id: `requirement-epic:${epic.id}:version:${nextPlan.version}`,
        type: "requirement_epic.version_changed",
        status: "ok",
        task_id: epic.id,
        group_id: epic.group_id || "",
        agent: payload.owner_agent || "global-agent",
        message: `需求 Epic 已升级到第 ${nextPlan.version} 版`,
        data: { diff: impactDiff, dependency_edges: dependencyEdges },
    });
    (0, logs_1.appendTaskTimelineEvent)(epic.id, {
        type: "requirement_epic_version_changed",
        title: `需求文档已更新到第 ${nextPlan.version} 版`,
        detail: `新增 ${diff.added.length}、重开 ${impactDiff.reopened.length}、移除 ${diff.removed.length}，未受影响的已完成成果保持不变`,
        status: "active",
        phase: "planning",
        data: { diff: impactDiff },
    });
    return { success: true, epic: updatedEpic, children: activeChildren, retired_children: retiredChildren, diff: impactDiff, dependency_edges: dependencyEdges };
}
function classifyTaskContinuation(message) {
    void message;
    return "new_task";
}
function looksLikeTaskContinuation(message) {
    void message;
    return false;
}
const AUTOMATED_TERMINAL_WORKFLOWS = new Set([
    "daily_dev",
    "project_main_agent",
    "requirement_epic",
    "global_mission",
    "agent_coordination_dependency",
]);
function hasStructuredTaskAcceptanceEvidence(task, updates = {}) {
    const merged = { ...task, ...updates };
    const workflowType = String(merged?.workflow_type || "general").trim().toLowerCase();
    const exactAcceptanceWorkflow = ["daily_dev", "project_main_agent"].includes(workflowType)
        || (String(merged?.assign_type || "") === "project"
            && !!merged?.acceptance_policy_snapshot
            && workflowType !== "agent_coordination_dependency");
    if (exactAcceptanceWorkflow) {
        const policyResult = (0, task_acceptance_policy_1.resolveTaskAcceptancePolicy)(merged);
        if (!policyResult.valid || !policyResult.snapshot)
            return false;
        const finalAcceptance = updates.main_agent_final_acceptance
            || updates.delivery_summary?.main_agent_final_acceptance
            || task?.main_agent_final_acceptance
            || task?.delivery_summary?.main_agent_final_acceptance;
        const finalAcceptanceValid = finalAcceptance?.accepted === true
            && finalAcceptance?.acceptance_policy_checksum === policyResult.snapshot.checksum
            && (finalAcceptance?.mode === policyResult.snapshot.mode || finalAcceptance?.mode === "not_required");
        const acceptanceRequired = merged?.requires_code_changes === true
            || merged?.requires_verification === true
            || merged?.requires_independent_review === true;
        if (!acceptanceRequired)
            return finalAcceptanceValid;
        if (policyResult.snapshot.mode === "main_agent_self_verification") {
            const receipt = updates.main_agent_self_verification || task?.main_agent_self_verification;
            return (0, main_agent_self_verification_1.validateMainAgentSelfVerificationReceipt)(merged, policyResult.snapshot, receipt).valid
                && finalAcceptanceValid;
        }
        const summary = updates.delivery_summary || task?.delivery_summary || {};
        const review = updates.test_agent_review || task?.test_agent_review || updates.delivery_summary?.test_agent || task?.delivery_summary?.test_agent;
        const hardeningGate = review?.completionGate
            || review?.completion_gate
            || summary?.verification_hardening?.completionGate
            || summary?.verificationHardening?.completionGate
            || summary?.completion_gate
            || null;
        const hardeningRequired = policyResult.snapshot.schema === "ccm-task-acceptance-policy-snapshot-v2";
        const hardeningGateValid = !hardeningRequired || (0, completion_gate_1.validateTestAgentCompletionGate)(hardeningGate).valid;
        const independentReviewValid = review?.canAccept === true
            && (review?.runner?.sourceStable === true || review?.invocation?.artifactVerification?.status === "passed")
            && (review?.invocation?.outputValidation?.valid === true || review?.report?.acceptanceEvidenceGateSummary?.pass === true)
            && hardeningGateValid;
        const groupIndependentReviewValid = summary?.independent_review_gate?.pass === true
            && summary?.post_review_spot_check_gate?.pass === true
            && summary?.verification_source_gate_passed === true
            && (!hardeningRequired || (0, completion_gate_1.validateTestAgentCompletionGate)(summary?.verification_hardening?.completionGate
                || summary?.verificationHardening?.completionGate
                || summary?.completion_gate).valid);
        return (independentReviewValid || groupIndependentReviewValid) && finalAcceptanceValid;
    }
    const summary = updates.delivery_summary || task?.delivery_summary || {};
    const coordination = updates.coordination_acceptance || task?.coordination_acceptance || {};
    const report = summary.delivery_report || task?.delivery_report || {};
    return summary.acceptance_gate_passed === true
        || summary.acceptance_gate?.pass === true
        || summary.accepted === true
        || summary.evidence_contract?.acceptance_gate_passed === true
        || report.acceptance_gate_passed === true
        || coordination.accepted === true
        || updates.global_mission_gate_passed === true
        || task?.global_mission_gate_passed === true
        || updates.terminal_decision?.gate_passed === true;
}
function validateTaskTerminalTransition(task, updates = {}) {
    const requestedStatus = String(updates.status || "").trim().toLowerCase();
    if (requestedStatus !== "done" || String(task?.status || "") === "done")
        return null;
    const workflowType = String(task?.workflow_type || "general").trim().toLowerCase();
    if (!AUTOMATED_TERMINAL_WORKFLOWS.has(workflowType))
        return null;
    const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const structured = hasStructuredTaskAcceptanceEvidence(task, updates);
    if (!structured) {
        if (config.strictEvidenceFreshnessEnabled === true) {
            const criteria = updates.acceptanceCriteria || updates.acceptance_criteria || task?.acceptanceCriteria || task?.acceptance_criteria || task?.acceptance_evidence_plan || [];
            const evaluation = (0, unified_evidence_registry_1.buildAcceptanceEvaluation)(criteria, collectTerminalEvidence(task, updates));
            if (!evaluation.satisfied)
                return `自动开发任务 ${task?.id || ""} 的 Evidence 尚未满足全部验收条件`;
        }
        return `自动开发任务 ${task?.id || ""} 缺少结构化最终验收证据，不能进入 done + accepted`;
    }
    if (config.strictEvidenceFreshnessEnabled === true) {
        const criteria = updates.acceptanceCriteria || updates.acceptance_criteria || task?.acceptanceCriteria || task?.acceptance_criteria || task?.acceptance_evidence_plan || [];
        const evaluation = (0, unified_evidence_registry_1.buildAcceptanceEvaluation)(criteria, collectTerminalEvidence(task, updates));
        if (!evaluation.satisfied)
            return `自动开发任务 ${task?.id || ""} 的 Evidence 尚未满足全部验收条件`;
    }
    return null;
}
function collectTerminalEvidence(task, updates = {}) {
    const merged = { ...task, ...updates };
    const receipt = updates.receipt || task?.receipt || {};
    const summary = updates.delivery_summary || task?.delivery_summary || {};
    const review = updates.test_agent_review || task?.test_agent_review || summary?.test_agent || {};
    const workDir = String(updates.worktree || updates.workTree || updates.work_dir || updates.workDir
        || task?.worktree || task?.workTree || task?.work_dir || task?.workDir || "").trim();
    let repoStateIdentity = null;
    try {
        if (workDir)
            repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(workDir, [
                ...(Array.isArray(receipt.filesChanged) ? receipt.filesChanged : []),
                ...(Array.isArray(receipt.files_changed) ? receipt.files_changed : []),
                ...(Array.isArray(summary.files_changed) ? summary.files_changed : []),
            ].map(String));
    }
    catch { }
    const base = {
        taskId: merged.id,
        workItemId: updates.workItemId || updates.work_item_id || task?.work_item_id || task?.workItemId || "",
        scope: updates.scope || task?.scope || "",
        scopeId: updates.scopeId || updates.scope_id || task?.scope_id || task?.scopeId || "",
        exactSessionId: updates.exactSessionId || updates.exact_session_id || task?.exact_session_id || task?.exactSessionId || "",
        generation: updates.generation ?? task?.generation ?? 0,
        attempt: updates.attempt ?? task?.attempt ?? 1,
        leaseId: updates.leaseId || updates.lease_id || task?.lease_id || task?.leaseId || "",
        producerAgentId: updates.agentId || updates.agent_id || receipt.agentId || receipt.agent_id || task?.target_project || "",
        repoStateIdentity,
    };
    const records = [];
    const verification = [
        ...(Array.isArray(updates.verificationResults) ? updates.verificationResults : []),
        ...(Array.isArray(updates.verification_results) ? updates.verification_results : []),
        ...(Array.isArray(receipt.verificationResults) ? receipt.verificationResults : []),
        ...(Array.isArray(receipt.verification_results) ? receipt.verification_results : []),
        ...(Array.isArray(summary.verification) ? summary.verification : []),
        ...(Array.isArray(review?.invocation?.verificationResults) ? review.invocation.verificationResults : []),
    ];
    verification.slice(0, 80).forEach((item, index) => {
        const command = typeof item === "string" ? item : item?.command || item?.name || `verification-${index + 1}`;
        const status = typeof item === "object" && (item?.status || item?.state || item?.exitCode !== undefined)
            ? String(item.status || item.state || (Number(item.exitCode) === 0 ? "passed" : "failed"))
            : "recorded";
        records.push((0, unified_evidence_registry_1.recordEvidence)({ ...base, evidenceType: "test", subject: command, status: /pass|success|ok|recorded|completed|0/.test(status.toLowerCase()) ? "valid" : "invalid", summary: status, references: typeof item === "object" ? item.filesChanged || item.files_changed : [] }));
    });
    const files = [
        ...(Array.isArray(receipt.filesChanged) ? receipt.filesChanged : []),
        ...(Array.isArray(receipt.files_changed) ? receipt.files_changed : []),
        ...(Array.isArray(summary.files_changed) ? summary.files_changed : []),
    ].map(String).filter(Boolean);
    if (files.length)
        records.push((0, unified_evidence_registry_1.recordEvidence)({ ...base, evidenceType: "diff", subject: "workspace diff", status: "valid", references: files, summary: `${files.length} files changed` }));
    if (review && typeof review === "object" && (review.canAccept !== undefined || review.report)) {
        records.push((0, unified_evidence_registry_1.recordEvidence)({ ...base, evidenceType: "review", subject: "independent review", status: review.canAccept === true ? "valid" : "invalid", summary: review.canAccept === true ? "accepted" : "rejected" }));
    }
    return records;
}
function buildTaskTerminalDecisionV2(task, updates = {}) {
    const status = String(updates.status || "").trim().toLowerCase();
    const acceptanceState = { done: "accepted", failed: "rejected", blocked: "blocked", cancelled: "cancelled" };
    const evidenceRecords = collectTerminalEvidence(task, updates);
    const acceptanceCriteria = updates.acceptanceCriteria || updates.acceptance_criteria || task?.acceptanceCriteria || task?.acceptance_criteria || task?.acceptance_evidence_plan || [];
    const acceptanceEvaluation = (0, unified_evidence_registry_1.buildAcceptanceEvaluation)(acceptanceCriteria, evidenceRecords);
    const base = {
        schema: "ccm-task-terminal-decision-v2",
        task_id: String(task?.id || ""),
        status,
        acceptance_state: acceptanceState[status] || String(updates.acceptance_state || task?.acceptance_state || "pending"),
        actor: (0, collaboration_1.compactFormText)(updates.terminal_actor || updates.terminalActor || updates.acceptance_decision?.actor, "task-runtime"),
        gate_passed: status === "done" ? hasStructuredTaskAcceptanceEvidence(task, updates) : true,
        evidence_registry: {
            evidenceIds: evidenceRecords.map(item => item.evidenceId),
            validCount: evidenceRecords.filter(item => item.status === "valid").length,
            staleCount: evidenceRecords.filter(item => item.status === "stale").length,
            acceptance: acceptanceEvaluation,
        },
        evidence_checksum: crypto.createHash("sha256").update(JSON.stringify({
            delivery_summary: updates.delivery_summary || task?.delivery_summary || null,
            receipt: updates.receipt || task?.receipt || null,
            review: updates.review || task?.review || null,
            coordination_acceptance: updates.coordination_acceptance || task?.coordination_acceptance || null,
        })).digest("hex"),
        reason: (0, collaboration_1.compactFormText)(updates.status_detail || updates.result, status),
        decided_at: new Date().toISOString(),
    };
    return { ...base, checksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex") };
}
function updateTask(id, updates) {
    const tasks = (0, db_1.loadTasks)();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    const expectedRevision = updates?.expectedRevision ?? updates?.expected_revision;
    const currentRevision = Math.max(0, Number(tasks[idx].revision || 0));
    if (expectedRevision !== undefined && Number(expectedRevision) !== currentRevision) {
        throw new Error(`任务状态版本冲突：expected=${Number(expectedRevision)} actual=${currentRevision}`);
    }
    updates = { ...(updates || {}) };
    delete updates.expectedRevision;
    delete updates.expected_revision;
    const previousStatus = tasks[idx].status;
    const previousTaskSnapshot = { ...tasks[idx] };
    const previousGatePassed = tasks[idx].global_mission_gate_passed === true;
    const previousReceiptKey = String(tasks[idx].receipt_idempotency_key || "");
    const previousCollaborationState = tasks[idx].collaboration_state || {};
    const policyValidation = (0, task_acceptance_policy_1.validateTaskAcceptancePolicySnapshot)(tasks[idx]);
    if (policyValidation.valid && policyValidation.snapshot) {
        const policy = policyValidation.snapshot;
        const requestedMode = updates.acceptance_mode || updates.acceptanceMode;
        const requestedEnabled = updates.test_agent_enabled ?? updates.testAgentEnabled;
        if (requestedMode && requestedMode !== policy.mode)
            throw new Error("任务验收模式已在创建时固定，不能在执行中切换");
        if (requestedEnabled !== undefined && requestedEnabled !== policy.test_agent_enabled)
            throw new Error("任务 TestAgent 开关已在创建时固定，不能在执行中切换");
        if (updates.acceptance_policy_snapshot && updates.acceptance_policy_snapshot.checksum !== policy.checksum)
            throw new Error("任务验收策略快照不可修改");
        updates = {
            ...updates,
            acceptance_mode: policy.mode,
            test_agent_enabled: policy.test_agent_enabled,
            acceptance_policy_snapshot: policy,
        };
    }
    tasks[idx].trace_id = (0, reliability_ledger_1.ensureTraceId)(tasks[idx].trace_id || updates.trace_id || updates.traceId, "task");
    const requestedStatus = String(updates.status || "").toLowerCase();
    const terminalValidationError = validateTaskTerminalTransition(tasks[idx], updates);
    if (terminalValidationError)
        throw new Error(terminalValidationError);
    const terminalAcceptance = {
        done: "accepted",
        failed: "rejected",
        blocked: "blocked",
        cancelled: "cancelled",
    };
    if (terminalAcceptance[requestedStatus]) {
        const terminalDecision = buildTaskTerminalDecisionV2(tasks[idx], updates);
        if (requestedStatus === "failed" || requestedStatus === "blocked") {
            const failure = (0, failure_record_1.recordFailure)({
                taskId: id,
                workItemId: updates.workItemId || updates.work_item_id || tasks[idx].work_item_id || tasks[idx].workItemId || "",
                failureType: updates.failureType || updates.failure_type,
                reason: updates.status_detail || updates.statusDetail || requestedStatus,
                criterionIds: updates.unresolvedCriteria || updates.unresolved_criteria || updates.failedCriteria || updates.failed_criteria,
                observedEvidenceIds: terminalDecision.evidence_registry?.evidenceIds || [],
                allowedFiles: updates.allowedFiles || updates.allowed_files,
                forbiddenFiles: updates.forbiddenFiles || updates.forbidden_files,
                attempt: updates.attempt || tasks[idx].attempt || 1,
                recommendedAction: updates.nextAction || updates.next_action || "",
            });
            updates = { ...updates, failure_record: failure };
        }
        const settledAt = String(updates.completed_at || updates.failed_at || updates.cancelled_at || new Date().toISOString());
        const evidenceChecksum = crypto.createHash("sha256").update(JSON.stringify({
            delivery_summary: updates.delivery_summary || tasks[idx].delivery_summary || null,
            receipt: updates.receipt || tasks[idx].receipt || null,
            review: updates.review || tasks[idx].review || null,
        })).digest("hex");
        const receiptBase = {
            schema: "ccm-task-terminal-state-receipt-v1",
            task_id: id,
            status: requestedStatus,
            acceptance_state: terminalAcceptance[requestedStatus],
            queue_state: requestedStatus,
            queue_position: 0,
            settled_at: settledAt,
            actor: terminalDecision.actor,
            reason: (0, collaboration_1.compactFormText)(updates.status_detail || updates.result, requestedStatus),
            evidence_checksum: evidenceChecksum,
        };
        updates = {
            ...updates,
            acceptance_state: terminalAcceptance[requestedStatus],
            terminal_state_receipt: {
                ...receiptBase,
                checksum: crypto.createHash("sha256").update(JSON.stringify(receiptBase)).digest("hex"),
            },
            terminal_decision: terminalDecision,
            terminal_gate: {
                passed: terminalDecision.gate_passed,
                evidence_checksum: terminalDecision.evidence_checksum,
                decision_checksum: terminalDecision.checksum,
            },
            ...(requestedStatus === "done" ? { completed_at: settledAt } : {}),
            ...(requestedStatus === "failed" ? { failed_at: settledAt } : {}),
            ...(requestedStatus === "cancelled" ? { cancelled_at: settledAt } : {}),
        };
    }
    if (updates.receipt) {
        updates.receipt_idempotency_key = crypto.createHash("sha256").update(JSON.stringify(updates.receipt)).digest("hex");
    }
    Object.assign(tasks[idx], updates, { revision: currentRevision + 1, updated_at: new Date().toISOString() });
    try {
        (0, task_execution_stage_projection_1.projectTaskExecutionStageTransition)(previousTaskSnapshot, tasks[idx]);
    }
    catch (error) {
        // User-visible execution events are a projection of the authoritative task
        // state. A display/audit write must never make the task transition fail.
        console.warn(`[task-stage-projection] ${id}: ${error?.message || error}`);
    }
    if ((0, group_orchestrator_1.loadOrchestratorConfig)().taskEventReducerShadowWriteEnabled !== false) {
        (0, task_transition_ledger_1.appendTaskTransitionEvent)({
            taskId: id,
            revision: tasks[idx].revision,
            from: previousStatus || "unknown",
            to: tasks[idx].status || previousStatus || "unknown",
            actor: updates.terminal_actor || updates.actor || "task-runtime",
            reasonCode: updates.status_detail || (requestedStatus ? `status_${requestedStatus}` : "task_patch"),
        });
    }
    if (terminalAcceptance[requestedStatus] && previousStatus !== requestedStatus) {
        const terminalEvent = {
            id: `tl_terminal_${requestedStatus}_${tasks[idx].terminal_state_receipt?.checksum || Date.now().toString(36)}`,
            at: tasks[idx].terminal_state_receipt?.settled_at || tasks[idx].updated_at,
            type: "terminal_state_normalized",
            title: requestedStatus === "done" ? "任务已通过最终验收" : requestedStatus === "blocked" ? "任务已阻塞" : requestedStatus === "cancelled" ? "任务已取消" : "任务执行失败",
            detail: tasks[idx].terminal_state_receipt?.reason || tasks[idx].status_detail || requestedStatus,
            status: requestedStatus === "done" ? "ok" : requestedStatus === "failed" ? "fail" : "warn",
            phase: requestedStatus === "done" ? "completion" : requestedStatus === "blocked" ? "needs_user" : requestedStatus,
            agent: tasks[idx].terminal_state_receipt?.actor || "task-runtime",
            data: { terminal_state_receipt: tasks[idx].terminal_state_receipt },
        };
        tasks[idx].workflow_timeline = [...(Array.isArray(tasks[idx].workflow_timeline) ? tasks[idx].workflow_timeline : []), terminalEvent].slice(-160);
    }
    tasks[idx].workflow_timeline = [...(Array.isArray(tasks[idx].workflow_timeline) ? tasks[idx].workflow_timeline : []), {
            id: `tl_transition_${id}_${tasks[idx].revision}`,
            at: tasks[idx].updated_at,
            type: "task_state_transition",
            title: "任务状态已通过版本校验更新",
            detail: `${previousStatus || "unknown"} → ${requestedStatus || previousStatus || "unknown"}`,
            status: "info",
            phase: "state",
            agent: "task-runtime",
            data: { revision: tasks[idx].revision, from: previousStatus || "", to: requestedStatus || previousStatus || "" },
        }].slice(-160);
    if (updates.delivery_summary && typeof updates.delivery_summary === "object") {
        tasks[idx].collaboration_state = reconcileTaskCollaborationState(tasks[idx], previousCollaborationState);
    }
    else if (updates.status === "done" || updates.status === "cancelled") {
        tasks[idx].collaboration_state = reconcileTaskCollaborationState(tasks[idx], previousCollaborationState);
    }
    else if (updates.collaboration_state && typeof updates.collaboration_state === "object") {
        tasks[idx].collaboration_state = { ...previousCollaborationState, ...updates.collaboration_state, updated_at: new Date().toISOString() };
    }
    const taskExecutions = (0, execution_kernel_1.listExecutions)({ taskId: id });
    tasks[idx].lifecycle = (0, collaboration_1.deriveTaskLifecycle)(tasks[idx], taskExecutions);
    tasks[idx].work_items = (0, work_items_1.buildMainAgentWorkItems)(tasks[idx], { executions: taskExecutions });
    tasks[idx].work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(tasks[idx].work_items);
    if (updates.status === "done") {
        tasks[idx].completed_at = updates.completed_at || new Date().toISOString();
    }
    else if (updates.status && updates.status !== "done") {
        delete tasks[idx].completed_at;
    }
    if (tasks[idx].parent_task_id) {
        (0, collaboration_1.refreshGlobalMissionParentInTaskList)(tasks, tasks[idx].parent_task_id);
    }
    (0, collaboration_1.appendGlobalDirectDispatchContinuationToHistory)(tasks[idx], previousStatus);
    (0, collaboration_1.appendGlobalDirectDispatchCompletionToHistory)(tasks[idx], previousStatus);
    (0, collaboration_1.appendGlobalDirectDispatchRollbackToHistory)(tasks[idx], previousStatus);
    (0, db_1.saveTasks)(tasks);
    if (updates.status && updates.status !== previousStatus) {
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, { id: `task:${id}:status:${updates.status}:${tasks[idx].updated_at}`, type: "task.status_changed", status: updates.status === "failed" ? "error" : updates.status === "done" ? "ok" : "info", task_id: id, group_id: tasks[idx].group_id || "", agent: tasks[idx].target_project || "", message: `${previousStatus || "unknown"} → ${updates.status}`, data: { from: previousStatus || "", to: updates.status, detail: String(updates.status_detail || updates.result || "").slice(0, 500) } });
    }
    if (terminalAcceptance[requestedStatus] && previousStatus !== requestedStatus) {
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, {
            id: `task:${id}:terminal:${requestedStatus}:${tasks[idx].terminal_state_receipt?.checksum || tasks[idx].updated_at}`,
            type: "task.terminal_state_normalized",
            status: requestedStatus === "done" ? "ok" : requestedStatus === "failed" ? "error" : "warning",
            task_id: id,
            group_id: tasks[idx].group_id || "",
            agent: tasks[idx].target_project || "",
            message: `${requestedStatus} + ${terminalAcceptance[requestedStatus]}`,
            data: { terminal_state_receipt: tasks[idx].terminal_state_receipt },
        });
    }
    if (updates.receipt && updates.receipt_idempotency_key !== previousReceiptKey) {
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, { id: `task:${id}:receipt:${updates.receipt_idempotency_key}`, type: "worker.receipt_persisted", status: updates.receipt.status === "done" ? "ok" : updates.receipt.status === "failed" ? "error" : "warning", task_id: id, group_id: tasks[idx].group_id || "", agent: updates.receipt.agent || tasks[idx].target_project || "", message: updates.receipt.summary || `回执状态 ${updates.receipt.status || "unknown"}`, data: { receipt_status: updates.receipt.status || "", filesChanged: updates.receipt.filesChanged || [], verification: updates.receipt.verification || [] } });
    }
    const gatePassed = tasks[idx].global_mission_gate_passed === true;
    const gateNewlyPassed = gatePassed && !previousGatePassed;
    const doneNewly = updates.status === "done" && previousStatus !== "done";
    if (tasks[idx].parent_task_id && gatePassed && (gateNewlyPassed || doneNewly)) {
        try {
            const unlock = require("./collaboration-task-runtime").scheduleRequirementEpicDependencyUnlock(tasks[idx].parent_task_id, gateNewlyPassed ? "child_gate_newly_passed" : "child_done_gate_passed");
            if (unlock?.scheduled === false && unlock?.reason === "collab_ctx_unbound") {
                console.warn(`[Epic 依赖解锁] ${tasks[idx].parent_task_id} 运行时 ctx 未绑定，事件化解锁降级为监工轮询`);
            }
        }
        catch (error) {
            console.warn(`[Epic 依赖解锁] 调度失败 ${tasks[idx].parent_task_id}:`, error?.message || error);
        }
    }
    return tasks[idx];
}
function normalizeTaskTerminalStateView(task) {
    if (!task || typeof task !== "object")
        return task;
    const status = String(task.status || "").toLowerCase();
    const acceptanceByStatus = { done: "accepted", failed: "rejected", blocked: "blocked", cancelled: "cancelled" };
    if (!acceptanceByStatus[status])
        return task;
    return {
        ...task,
        acceptance_state: acceptanceByStatus[status],
        terminal_state_receipt: task.terminal_state_receipt || {
            schema: "ccm-task-terminal-state-receipt-v1-derived",
            task_id: String(task.id || ""),
            status,
            acceptance_state: acceptanceByStatus[status],
            settled_at: task.completed_at || task.failed_at || task.cancelled_at || task.updated_at || "",
            actor: "legacy-state-projection",
            reason: task.status_detail || task.result || status,
            evidence_checksum: "",
            checksum: "",
            derived: true,
        },
    };
}
function removeTaskFromQueues(taskId) {
    let removed = 0;
    for (const queue of collaboration_1.taskQueues.values()) {
        let index = queue.indexOf(taskId);
        while (index >= 0) {
            queue.splice(index, 1);
            removed++;
            index = queue.indexOf(taskId);
        }
    }
    collaboration_1.runningTaskIds.delete(taskId);
    return removed;
}
function canCompleteDailyDevFromDeliverySummary(task, execution, summary) {
    return require("./collaboration-acceptance").canCompleteDailyDevFromDeliverySummary(task, execution, summary);
}
function reconcileTaskCollaborationState(task, previous = {}) {
    const now = new Date().toISOString();
    if (task?.status === "done" && (0, collaboration_1.hasStrongTaskAcceptanceEvidence)(task, [], task?.delivery_summary || {}))
        return { ...previous, phase: "completed", needs_user: false, completed_at: task.completed_at || now, updated_at: now };
    if (task?.status === "cancelled")
        return { ...previous, phase: "cancelled", needs_user: false, updated_at: now };
    const items = (0, collaboration_1.getTaskGapItems)(task);
    const fingerprint = items.length ? (0, collaboration_1.getTaskGapFingerprint)(task) : "";
    const oldGap = previous?.gap || {};
    const sameGap = !!fingerprint && oldGap.fingerprint === fingerprint;
    const attempts = sameGap ? Number(oldGap.auto_attempts || 0) : 0;
    const exhausted = items.length > 0 && attempts >= 1;
    return {
        ...previous,
        phase: exhausted ? "needs_user" : items.length ? "reviewing" : task?.status === "in_progress" ? "executing" : "planning",
        needs_user: exhausted,
        gap: items.length ? { ...oldGap, fingerprint, items, auto_attempts: attempts, updated_at: now } : null,
        updated_at: now,
    };
}
function continueDailyDevTasksFromGaps(ctx, options = {}) {
    const groupId = String(options.group_id || options.groupId || "").trim();
    const limit = Math.max(1, Math.min(50, Number(options.limit || 5)));
    const maxPerTask = Math.max(1, Math.min(20, Number(options.max_per_task || options.maxPerTask || 3)));
    const candidates = (0, db_1.loadTasks)()
        .filter(task => (0, collaboration_1.hasDailyDevContinuationGaps)(task))
        .filter(task => (0, collaboration_1.canAutoContinueTaskGaps)(task))
        .filter(task => !groupId || task.group_id === groupId)
        .filter(task => Number(task.auto_gap_continue_count || 0) < maxPerTask)
        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
        .slice(0, limit);
    const results = candidates.map((task) => {
        const message = (0, collaboration_1.buildTaskGapContinuationDraft)(task);
        const result = (0, collaboration_1.continueTaskWithMessage)(task.id, message, ctx, {
            source: options.source || "autopilot_gap_rework",
            auto_execute: options.auto_execute,
            autoExecute: options.autoExecute,
            status_detail: "自动驾驶已按交付缺口生成返工说明，等待主 Agent 继续执行",
        });
        return {
            task_id: task.id,
            title: task.title,
            group_id: task.group_id,
            ...result,
            task: undefined,
            continuation_message: message,
        };
    });
    return {
        success: true,
        total_candidates: candidates.length,
        continued: results.filter((item) => item.success).length,
        queued: results.filter((item) => item.queued).length,
        blocked: results.filter((item) => item.queue_result?.blocked).length,
        failed: results.filter((item) => !item.success).length,
        limit,
        max_per_task: maxPerTask,
        results,
    };
}
function retryTask(id, ctx, reason = "", autoExecute = true) {
    if (collaboration_1.runningTaskIds.has(id)) {
        return { success: false, status: 409, error: "任务正在执行中，请等待本轮结束后再重试" };
    }
    const current = (0, db_1.loadTasks)().find(t => t.id === id);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    if (current.status === "done")
        return { success: false, status: 409, error: "已完成任务不能重试" };
    if (String(current.acceptance_state || current.status || "").toLowerCase() === "recovery_required") {
        return { success: false, status: 409, code: "TASK_RECOVERY_REVIEW_REQUIRED", error: "当前任务存在不确定副作用，只能先重新核验或人工接管，不能直接重跑" };
    }
    const providerCircuitGate = require("./provider-task-circuit-breaker").getTaskProviderCircuitGate(current);
    if (providerCircuitGate.blocked) {
        const message = require("./provider-task-circuit-breaker").formatTaskProviderCircuitMessage(providerCircuitGate.circuit);
        return {
            success: false,
            status: 429,
            error: message,
            reason: "provider_circuit_open",
            retry_after: providerCircuitGate.circuit?.retryAfter || "",
            remaining_ms: providerCircuitGate.remainingMs,
        };
    }
    const retryCount = Number(current.retry_count || 0) + 1;
    (0, execution_kernel_1.clearTaskCancellation)(id);
    const retryReason = (0, collaboration_1.compactFormText)(reason, "用户重新入队");
    const previousDelivery = (current.delivery_summary || current.receipt || current.review || current.final_report || current.result)
        ? {
            retry: retryCount,
            archived_at: new Date().toISOString(),
            reason: retryReason,
            status: current.status,
            status_detail: current.status_detail || "",
            receipt: current.receipt || null,
            review: current.review || null,
            file_changes: current.file_changes || null,
            delivery_summary: current.delivery_summary || null,
            final_report: current.final_report || "",
            result: current.result || "",
        }
        : null;
    const task = updateTask(id, {
        status: "pending",
        is_paused: false,
        paused: false,
        queued_at: null,
        started_at: null,
        result: "",
        final_report: "",
        status_detail: `第 ${retryCount} 次重试，等待主 Agent 重新执行`,
        // 当前证据在新一轮产出前仍是唯一可追溯事实；同时冻结到历史，禁止重试把证据链抹掉。
        delivery_history: previousDelivery
            ? [...(Array.isArray(current.delivery_history) ? current.delivery_history : []), previousDelivery].slice(-20)
            : (Array.isArray(current.delivery_history) ? current.delivery_history : []),
        retry_count: retryCount,
        last_retry_at: new Date().toISOString(),
        last_retry_reason: retryReason,
        // 重试开启新的返工周期：本周期验收轮次清零，否则上一周期用满 3 轮的任务会零返工机会直接 blocked。
        ...require("./rework-policy").buildReviewCycleResetUpdate(current, `第 ${retryCount} 次重试：${retryReason}`),
    });
    if (task)
        (0, collaboration_1.updateGroupTaskInlineStatus)(task, "pending", `第 ${retryCount} 次重试，等待主 Agent 重新执行`);
    (0, logs_1.addTaskLog)(id, "info", `任务重新入队重试：${retryReason}`);
    const queueResult = autoExecute ? (0, collaboration_1.enqueueTask)(id, ctx) : null;
    return { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_1.getQueueStatus)() };
}
function purgeArchivedTask(id) {
    const tasks = (0, db_1.loadTasks)();
    const current = tasks.find(task => task.id === id);
    if (!current)
        return null;
    if (!current.archived && !current.deleted_at)
        throw new Error("任务必须先删除归档，才能永久清除");
    removeTaskFromQueues(id);
    (0, execution_kernel_1.requestTaskCancellation)(id, "永久清除归档任务", "task-governance");
    (0, agent_sessions_1.closeTaskAgentSessions)({ taskId: id }, "永久清除归档任务");
    (0, reliability_ledger_1.releaseTaskLease)(id, "purged");
    for (const execution of (0, execution_kernel_1.listExecutions)({ taskId: id })) {
        if (execution.workspace?.mode === "worktree" && !execution.workspace?.cleanedAt) {
            try {
                (0, execution_kernel_1.cleanupExecutionWorktree)(execution.id, true);
            }
            catch { }
        }
    }
    const purgedSessions = (0, agent_sessions_1.purgeTaskAgentSessions)(id);
    const purgedExecutionArtifacts = (0, execution_kernel_1.purgeTaskExecutionArtifacts)(id);
    const purgedTestAgentArtifacts = (0, artifact_retention_1.purgeTestAgentArtifactsForTask)(id);
    const purgedTestAgentRuns = (0, test_agent_runner_1.purgeTestAgentRunnerRecordsForTask)(id);
    const purgedReplayJournal = (0, task_replay_journal_1.purgeTaskReplayJournalForTask)(id);
    (0, execution_kernel_1.clearTaskCancellation)(id);
    (0, db_1.saveTasks)(tasks.filter(task => task.id !== id));
    return { ...current, purge_cleanup: { sessions: purgedSessions.length, test_agent_artifacts: purgedTestAgentArtifacts, test_agent_runs: purgedTestAgentRuns, replay_journal: purgedReplayJournal, ...purgedExecutionArtifacts } };
}
//# sourceMappingURL=collaboration-task-service.js.map