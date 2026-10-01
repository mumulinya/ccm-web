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
exports.handleTaskIntakePreviewRoute = handleTaskIntakePreviewRoute;
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const secure_multipart_1 = require("../../system/secure-multipart");
const automation_session_bindings_1 = require("../../system/automation-session-bindings");
const db_1 = require("../../core/db");
const storage_1 = require("./storage");
const access_policy_1 = require("../system/access-policy");
const source_ingestion_1 = require("../requirements/source-ingestion");
const task_session_planning_1 = require("./task-session-planning");
const pending = new Map();
function handleTaskIntakePreviewRoute(pathname, req, res, deps) {
    const { compactFormText, removeUploadedFiles, bindRequirementPlanTargetSessions, decideWorkflowWithModel, createTask, updateTask, appendTraceEvent, appendTaskTimelineEvent } = deps;
    if (pathname === "/api/usability/intake/preview" && req.method === "POST") {
        const createPreview = async (payload, files = []) => {
            try {
                const userRequirement = compactFormText(payload.requirement || payload.goal || payload.message, "");
                const groups = (0, storage_1.loadGroups)();
                const configs = (0, db_1.getConfigs)();
                const planningTarget = (0, task_session_planning_1.taskPlanningTargetContext)(payload, groups, configs);
                if (!canAccessTarget(planningTarget, req.ccmAuth))
                    throw new Error("当前账户不能向此目标创建任务");
                const submissionKey = String(payload.idempotency_key || payload.idempotencyKey || "");
                const fingerprint = crypto.createHash("sha256").update(JSON.stringify({ payload: { ...payload, idempotency_key: undefined, idempotencyKey: undefined }, files: files.map(file => ({ name: file.filename, size: file.size })) })).digest("hex");
                const owner = String(req.ccmAuth?.userId || req.ccmAuth?.username || "internal");
                const identity = submissionKey ? `${owner}:${submissionKey}` : "";
                const existing = identity ? (0, db_1.loadTasks)().find((task) => task.planning_submission?.identity === identity) : null;
                if (existing) {
                    if (existing.planning_submission.fingerprint !== fingerprint)
                        throw new Error("同一次提交的内容已变化，请重新提交");
                    if (!(0, access_policy_1.hasTaskResourceAccess)(existing, req.ccmAuth, "use"))
                        throw new Error("当前账户没有任务权限");
                    removeUploadedFiles(files);
                    return (0, utils_1.sendJson)(res, { success: true, task: existing, confirmation: existing.intake_draft, replayed: true });
                }
                const sourceIngestion = await (0, source_ingestion_1.ingestRequirementSources)({
                    files,
                    userText: `${userRequirement}\n${planningTarget.userText}`,
                    extractRequirement: true,
                    decomposeRequirement: true,
                    availableTargets: planningTarget.availableTargets,
                });
                const extractedRequirement = sourceIngestion.requirement;
                if (sourceIngestion.coverage_receipt?.complete === false) {
                    removeUploadedFiles(files);
                    return (0, utils_1.sendJson)(res, {
                        error: "仍有必需资料未完整读取，请重试、移除或改为非必需后再生成计划",
                        code: "requirement_source_coverage_incomplete",
                        source_ingestion: sourceIngestion.technical,
                        coverage_receipt: sourceIngestion.coverage_receipt,
                    }, 422);
                }
                if (!extractedRequirement || !sourceIngestion.decomposition) {
                    removeUploadedFiles(files);
                    return (0, utils_1.sendJson)(res, {
                        error: sourceIngestion.warnings?.[0] || "统一大模型未能形成可靠需求结构，本轮未创建任务",
                        code: "requirement_model_decision_required",
                        source_ingestion: sourceIngestion.technical,
                    }, 503);
                }
                const requirement = compactFormText(extractedRequirement?.business_goal || userRequirement, "");
                if (!requirement && sourceIngestion.sources.length === 0)
                    return (0, utils_1.sendJson)(res, { error: "请先说说你想完成什么，或者上传需求资料" }, 400);
                const group = planningTarget.group;
                const resolvedTarget = (0, task_session_planning_1.resolvePlanningTarget)(planningTarget.context, sourceIngestion.decomposition);
                const targetProject = resolvedTarget.targetProject;
                const requestOrigin = compactFormText(payload.source || payload.request_origin || payload.requestOrigin, "workbench");
                const automationSource = (0, automation_session_bindings_1.normalizeAutomationTaskSource)(requestOrigin) || "workbench";
                const resolvedAutomationSession = (0, automation_session_bindings_1.resolveAutomationSessionBinding)({
                    scope: group ? "group" : "project",
                    scopeId: group?.id || targetProject,
                    source: automationSource,
                    title: compactFormText(payload.title || requirement, "自动开发任务").slice(0, 80),
                    actor: requestOrigin,
                });
                const groupSession = group ? { id: resolvedAutomationSession.snapshot.exactSessionId } : null;
                const projectSession = !group ? { sessionId: resolvedAutomationSession.snapshot.exactSessionId } : null;
                sourceIngestion.decomposition = bindRequirementPlanTargetSessions(sourceIngestion.decomposition, {
                    groups,
                    configs,
                    defaultGroup: group,
                    defaultProject: targetProject,
                    taskSource: automationSource,
                });
                const clientMessageId = compactFormText(payload.client_message_id || payload.clientMessageId, "")
                    || (submissionKey ? `intake_${crypto.createHash("sha256").update(identity).digest("hex")}` : `intake_${crypto.randomUUID()}`);
                const workflowDecision = await decideWorkflowWithModel({
                    message: requirement,
                    scope: group ? "group" : "project",
                    sourceCount: sourceIngestion.sources.length,
                    context: {
                        explicit_intake_preview: true,
                        target_project: targetProject,
                        group_id: group?.id || "",
                        extracted_requirement: extractedRequirement,
                    },
                });
                const areas = Array.isArray(extractedRequirement.scope)
                    ? extractedRequirement.scope.map((item) => compactFormText(item, "")).filter(Boolean)
                    : [];
                if (!areas.length)
                    areas.push(group ? "群聊内相关项目" : "目标项目");
                const acceptanceFallback = compactFormText(payload.acceptance_criteria || payload.acceptanceCriteria, "") || [
                    "目标功能按描述完成，并覆盖主要正常流程",
                    "相关项目通过现有构建或测试命令",
                    "交付报告列出实际修改文件、验证结果和剩余风险",
                ].join("；");
                const fallbackRisks = [
                    group ? "多个项目之间的接口或数据契约需要保持一致" : "实现范围可能需要根据现有代码进一步收敛",
                    "涉及既有行为时需要回归验证，避免影响当前功能",
                ];
                const extractedAcceptance = extractedRequirement?.acceptance_criteria || [];
                const acceptance = extractedAcceptance.length ? extractedAcceptance.join("；") : acceptanceFallback;
                const title = compactFormText(payload.title, "") || extractedRequirement?.title || requirement.replace(/\s+/g, " ").slice(0, 48) || "处理提交的需求资料";
                const intakeDraft = {
                    ...(0, source_ingestion_1.requirementToIntakeDraft)(extractedRequirement, {
                        requirement,
                        scope: areas,
                        acceptance: acceptance.split("；").filter(Boolean),
                        risks: fallbackRisks,
                    }),
                    project: targetProject,
                    group_id: group?.id || "",
                    group_name: group?.name || "",
                    project_session_id: projectSession?.sessionId || "",
                    group_session_id: groupSession?.id || "",
                    source_summary: sourceIngestion.user_summary,
                    source_ingestion: sourceIngestion.technical,
                    decomposition_plan: sourceIngestion.decomposition,
                    clarification_questions: (0, task_session_planning_1.mergePlanningQuestions)(extractedRequirement.clarification_questions || [], sourceIngestion.decomposition?.clarification_questions || [], !targetProject && !resolvedTarget.targets.length ? ["请选择本次任务要执行的项目"] : []),
                    requirement_content_hash: sourceIngestion.content_hash,
                    workflow_decision: workflowDecision,
                };
                const sourceDocuments = [
                    userRequirement ? `用户输入：\n${userRequirement}` : "",
                    sourceIngestion.source_documents,
                    extractedRequirement ? `结构化需求：\n${JSON.stringify(extractedRequirement, null, 2)}` : "",
                ].filter(Boolean).join("\n\n");
                const task = createTask({
                    title,
                    description: requirement,
                    business_goal: requirement,
                    acceptance_criteria: acceptance,
                    source_documents: sourceDocuments,
                    source_attachments: sourceIngestion.attachments,
                    requirement_extraction: extractedRequirement,
                    requirement_decomposition: sourceIngestion.decomposition,
                    decomposition_plan: sourceIngestion.decomposition,
                    requirement_content_hash: sourceIngestion.content_hash,
                    source_ingestion: sourceIngestion.technical,
                    target_project: targetProject,
                    priority: payload.priority || "normal",
                    group_id: group?.id || null,
                    group_session_id: groupSession?.id || null,
                    project_session_id: projectSession?.sessionId || null,
                    assign_type: group ? "group" : "project",
                    orchestration_scope: group ? "group_session" : "project_session",
                    queue_scope: payload.queue_scope || payload.queueScope || "conversation_serial",
                    request_origin: requestOrigin,
                    automation_task_source: automationSource,
                    source_channel: payload.source_channel || payload.sourceChannel || requestOrigin,
                    target_scope: group ? "group_session" : "project_session",
                    target_id: group?.id || targetProject,
                    exact_session_id: groupSession?.id || projectSession?.sessionId || "",
                    client_message_id: clientMessageId,
                    workflow_type: "development",
                    requires_code_changes: typeof payload.requires_code_changes === "boolean" ? payload.requires_code_changes : workflowDecision.requiresCodeChanges,
                    requires_verification: Array.isArray(workflowDecision.verificationModes) && workflowDecision.verificationModes.length > 0,
                    auto_execute: false,
                    intake_state: "awaiting_confirmation",
                    intake_draft: intakeDraft,
                    planning_target_context: planningTarget.context,
                    planning_submission: identity ? { identity, fingerprint } : null,
                    scope: areas.join("；"),
                    dispatch_policy: payload.dispatch_policy,
                    verification_policy: payload.verification_policy,
                    workspace_policy: payload.workspace_policy,
                    approval_policy: payload.approval_policy,
                    workflow_decision: workflowDecision,
                    workflow_meta: {
                        intake: {
                            source: requestOrigin,
                            channel: payload.channel || "web",
                            project_session_id: projectSession?.sessionId || "",
                            group_session_id: groupSession?.id || "",
                            client_message_id: clientMessageId,
                            source_ingestion: sourceIngestion.technical,
                        },
                        requirement_epic: {
                            version_of_epic_id: payload.epic_id || payload.epicId || "",
                            content_hash: sourceIngestion.content_hash,
                        },
                    },
                    trace_id: payload.trace_id || payload.traceId,
                    idempotency_key: payload.idempotency_key || payload.idempotencyKey || "",
                });
                const updated = updateTask(task.id, { status: "pending", auto_execute: false, intake_state: "awaiting_confirmation", intake_draft: intakeDraft, status_detail: "执行计划已准备好，等待你确认" }) || task;
                appendTraceEvent(updated.trace_id, { type: "intake.previewed", status: "ok", task_id: updated.id, group_id: updated.group_id || "", agent: targetProject, message: "已生成执行前确认卡，尚未开始执行", data: intakeDraft });
                appendTaskTimelineEvent(updated.id, {
                    type: "requirement_sources_ingested",
                    title: "需求资料已读取",
                    detail: sourceIngestion.user_summary || "已根据用户文字整理需求",
                    status: sourceIngestion.warnings.length ? "warning" : "completed",
                    data: sourceIngestion.technical,
                });
                (0, utils_1.sendJson)(res, { success: true, task: updated, confirmation: intakeDraft, source_ingestion: sourceIngestion.technical, same_task_trace: true });
            }
            catch (e) {
                removeUploadedFiles(files);
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        };
        const handleIntakePreview = async (payload, files = []) => {
            const key = String(payload.idempotency_key || payload.idempotencyKey || "");
            const lockKey = `${req.ccmAuth?.userId || req.ccmAuth?.username || "internal"}:${key}`;
            if (key && pending.has(lockKey))
                await pending.get(lockKey);
            const operation = createPreview(payload, files);
            if (key)
                pending.set(lockKey, operation);
            try {
                await operation;
            }
            finally {
                if (pending.get(lockKey) === operation)
                    pending.delete(lockKey);
            }
        };
        const contentType = String(req.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(({ fields, files }) => {
                return handleIntakePreview(fields || {}, files || []);
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                handleIntakePreview(body ? JSON.parse(body) : {});
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
function groupResource(target) {
    return target.group ? { type: "group", id: String(target.group.id || "") } : { type: "project", id: String(target.targetProject || "") };
}
function canAccessTarget(target, principal) {
    if (!principal || principal.kind !== "browser" || principal.role === "admin")
        return true;
    const resource = groupResource(target);
    return (0, access_policy_1.hasResourceAccess)(String(principal.userId || ""), String(principal.role || ""), resource.type, String(resource.id || ""), "use");
}
//# sourceMappingURL=task-intake-preview-route.js.map