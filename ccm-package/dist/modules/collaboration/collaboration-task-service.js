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
exports.createTask = createTask;
exports.createRequirementEpicWithChildren = createRequirementEpicWithChildren;
exports.updateRequirementEpicFromPlan = updateRequirementEpicFromPlan;
exports.classifyTaskContinuation = classifyTaskContinuation;
exports.looksLikeTaskContinuation = looksLikeTaskContinuation;
exports.updateTask = updateTask;
exports.removeTaskFromQueues = removeTaskFromQueues;
exports.canCompleteDailyDevFromDeliverySummary = canCompleteDailyDevFromDeliverySummary;
exports.reconcileTaskCollaborationState = reconcileTaskCollaborationState;
exports.continueDailyDevTasksFromGaps = continueDailyDevTasksFromGaps;
exports.retryTask = retryTask;
exports.purgeArchivedTask = purgeArchivedTask;
const crypto = __importStar(require("crypto"));
const source_ingestion_1 = require("../requirements/source-ingestion");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const logs_1 = require("./logs");
const test_agent_runner_1 = require("./test-agent-runner");
const artifact_retention_1 = require("../../test-agent/artifact-retention");
const storage_1 = require("./storage");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const task_replay_journal_1 = require("../../system/task-replay-journal");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function createTask(task) {
    const tasks = (0, db_1.loadTasks)();
    const idempotencyKey = String(task.idempotency_key || task.idempotencyKey || "").trim();
    if (idempotencyKey) {
        const existing = tasks.find((item) => String(item.idempotency_key || "") === idempotencyKey);
        if (existing)
            return existing;
    }
    const taskGroupId = String(task.group_id || task.groupId || "").trim();
    const taskGroupSession = taskGroupId
        ? (0, storage_1.resolveWritableGroupChatSession)(taskGroupId, task.group_session_id || task.groupSessionId || "", {
            title: (0, memory_1.compactMemoryText)(task.title || "任务会话", 80),
        })
        : null;
    const taskGroupSessionId = String(taskGroupSession?.id || "");
    const semanticGoal = (0, collaboration_1.compactFormText)(task.business_goal || task.businessGoal || task.description || task.title, "").toLowerCase().replace(/\s+/g, " ");
    const semanticTarget = [taskGroupId, taskGroupSessionId, task.target_project || task.targetProject || "", task.workflow_type || task.workflowType || "general"].join("|").toLowerCase();
    if (semanticGoal && task.allow_duplicate !== true && task.allowDuplicate !== true) {
        const duplicate = [...tasks].reverse().find((item) => {
            if (item.archived || item.deleted_at || ["done", "cancelled", "archived", "failed"].includes(String(item.status || "")))
                return false;
            if (Date.now() - Date.parse(item.created_at || "") > 5 * 60 * 1000)
                return false;
            const itemGoal = (0, collaboration_1.compactFormText)(item.business_goal || item.description || item.title, "").toLowerCase().replace(/\s+/g, " ");
            const itemTarget = [item.group_id || "", item.group_session_id || item.groupSessionId || "", item.target_project || "", item.workflow_type || "general"].join("|").toLowerCase();
            return itemGoal === semanticGoal && itemTarget === semanticTarget;
        });
        if (duplicate)
            return { ...duplicate, deduplicated: true, duplicate_reason: "5 分钟内已存在相同目标与执行范围的活动任务" };
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
        priority: task.priority || "normal",
        auto_execute: !!(task.auto_execute || task.autoExecute),
        queue_scope: task.queue_scope || task.queueScope || "",
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
        workflow_meta: task.workflow_meta || task.workflowMeta || null,
        parent_task_id: task.parent_task_id || task.parentTaskId || null,
        global_mission_id: task.global_mission_id || task.globalMissionId || null,
        mission_target: task.mission_target || task.missionTarget || null,
        mission_handoff: task.mission_handoff || task.missionHandoff || null,
        mission_dependencies: Array.isArray(task.mission_dependencies || task.missionDependencies)
            ? (task.mission_dependencies || task.missionDependencies)
            : [],
        child_task_ids: Array.isArray(task.child_task_ids || task.childTaskIds) ? (task.child_task_ids || task.childTaskIds) : [],
        mission_plan: task.mission_plan || task.missionPlan || null,
        followups: Array.isArray(task.followups) ? task.followups : [],
        intake_state: task.intake_state || task.intakeState || null,
        intake_draft: task.intake_draft || task.intakeDraft || null,
        cron_job_id: task.cron_job_id || null,
        cron_trigger: task.cron_trigger || null,
        trace_id: traceId,
        idempotency_key: idempotencyKey || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    newTask.work_items = (0, work_items_1.buildMainAgentWorkItems)(newTask);
    newTask.work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(newTask.work_items);
    tasks.push(newTask);
    (0, db_1.saveTasks)(tasks);
    (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `task:${newTask.id}:created`, type: "task.created", status: "ok", task_id: newTask.id, group_id: newTask.group_id || "", agent: newTask.target_project || "", message: newTask.title, data: { workflow_type: newTask.workflow_type, assign_type: newTask.assign_type, group_session_id: newTask.group_session_id || "", idempotency_key: idempotencyKey ? "present" : "absent" } });
    return newTask;
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
    const directProject = requestedType === "group"
        ? null
        : requestedId
            ? configs.find((config) => config.name === requestedId)
            : defaultProject ? configs.find((config) => config.name === defaultProject) : null;
    if (requestedType === "project" && requestedId && !directProject)
        throw new Error(`子任务 ${item.item_key} 指定的项目不存在：${requestedId}`);
    if (directProject) {
        const containingGroup = groups.find((group) => group.id === defaultGroupId)
            || groups.find((group) => (group.members || []).some((member) => String(member?.project || "") === directProject.name));
        return {
            assign_type: containingGroup ? "group" : "project",
            group_id: containingGroup?.id || null,
            target_project: directProject.name,
            target: {
                type: "project",
                name: directProject.name,
                project: directProject.name,
                group_id: containingGroup?.id || "",
                item_key: item.item_key,
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
    return {
        assign_type: "group",
        group_id: group.id,
        target_project: coordinator.project,
        target: {
            type: "group",
            name: group.name || group.id,
            group_id: group.id,
            coordinator: coordinator.project,
            item_key: item.item_key,
        },
    };
}
function buildRequirementEpicTaskRecord(input, id, traceId, now) {
    const groupId = String(input.group_id || input.groupId || "").trim();
    const groupSession = groupId
        ? (0, storage_1.resolveWritableGroupChatSession)(groupId, input.group_session_id || input.groupSessionId || "", {
            title: (0, memory_1.compactMemoryText)(input.title || "需求 Epic", 80),
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
        parent_task_id: input.parent_task_id || input.parentTaskId || null,
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
        created_at: now,
        updated_at: now,
    };
    record.work_items = (0, work_items_1.buildMainAgentWorkItems)(record);
    record.work_item_summary = (0, work_items_1.buildMainAgentWorkItemSummary)(record.work_items);
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
        source_documents: payload.source_documents || payload.sourceDocuments || "",
        source_attachments: payload.source_attachments || payload.sourceAttachments || [],
        requirement_extraction: requirement,
        requirement_decomposition: plan,
        source_ingestion: payload.source_ingestion || payload.sourceIngestion || null,
        requirement_content_hash: plan.content_hash,
        requirement_version: plan.version,
        trace_id: traceId,
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
            group_session_id: payload.group_session_id || payload.groupSessionId || null,
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
            group_session_id: epic.group_session_id,
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
    const text = String(message || "").trim();
    if (/(?:这是|作为|创建|开始).{0,10}(?:新任务|另一个任务)|与当前任务无关|另外一个项目/i.test(text))
        return "new_task";
    if (/(?:目标|需求|方案).{0,12}(?:改成|调整为|替换为)|不要.{0,30}(?:改为|改成)|以.+为准/i.test(text))
        return "revise_goal";
    return "supplement";
}
function looksLikeTaskContinuation(message) {
    return /^(?:再|还要|还需要|另外补充|补充|继续|接着|顺便|刚才|上面|这个任务|把它)|(?:改成|调整为|再加|再补|继续修改|基于刚才)/i.test(String(message || "").trim());
}
function updateTask(id, updates) {
    const tasks = (0, db_1.loadTasks)();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    const previousStatus = tasks[idx].status;
    const previousGatePassed = tasks[idx].global_mission_gate_passed === true;
    const previousReceiptKey = String(tasks[idx].receipt_idempotency_key || "");
    const previousCollaborationState = tasks[idx].collaboration_state || {};
    tasks[idx].trace_id = (0, reliability_ledger_1.ensureTraceId)(tasks[idx].trace_id || updates.trace_id || updates.traceId, "task");
    if (updates.receipt) {
        updates.receipt_idempotency_key = crypto.createHash("sha256").update(JSON.stringify(updates.receipt)).digest("hex");
    }
    Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
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
    if (updates.receipt && updates.receipt_idempotency_key !== previousReceiptKey) {
        (0, reliability_ledger_1.appendTraceEvent)(tasks[idx].trace_id, { id: `task:${id}:receipt:${updates.receipt_idempotency_key}`, type: "worker.receipt_persisted", status: updates.receipt.status === "done" ? "ok" : updates.receipt.status === "failed" ? "error" : "warning", task_id: id, group_id: tasks[idx].group_id || "", agent: updates.receipt.agent || tasks[idx].target_project || "", message: updates.receipt.summary || `回执状态 ${updates.receipt.status || "unknown"}`, data: { receipt_status: updates.receipt.status || "", filesChanged: updates.receipt.filesChanged || [], verification: updates.receipt.verification || [] } });
    }
    const gatePassed = tasks[idx].global_mission_gate_passed === true;
    const gateNewlyPassed = gatePassed && !previousGatePassed;
    const doneNewly = updates.status === "done" && previousStatus !== "done";
    if (tasks[idx].parent_task_id && gatePassed && (gateNewlyPassed || doneNewly)) {
        try {
            require("./collaboration-task-runtime").scheduleRequirementEpicDependencyUnlock(tasks[idx].parent_task_id, gateNewlyPassed ? "child_gate_newly_passed" : "child_done_gate_passed");
        }
        catch (error) {
            console.warn(`[Epic 依赖解锁] 调度失败 ${tasks[idx].parent_task_id}:`, error?.message || error);
        }
    }
    return tasks[idx];
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