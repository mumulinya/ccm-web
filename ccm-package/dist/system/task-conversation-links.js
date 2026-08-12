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
exports.buildTaskConversationLinks = buildTaskConversationLinks;
exports.validateTaskMutationGuard = validateTaskMutationGuard;
exports.buildGlobalMissionSafeProjection = buildGlobalMissionSafeProjection;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const storage_1 = require("../modules/collaboration/storage");
const sessions_1 = require("../modules/projects/sessions");
function stableChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex");
}
function clean(value, max = 240) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function globalSessionAvailable(exactSessionId) {
    if (!exactSessionId)
        return false;
    const store = (0, atomic_json_file_1.readJsonWithBackup)(path.join(utils_1.CCM_DIR, "global-agent-history.json"), { sessions: [] });
    return (Array.isArray(store?.sessions) ? store.sessions : []).some((session) => String(session?.id || "") === exactSessionId);
}
function targetAvailability(scope, scopeId, exactSessionId) {
    if (!scopeId || !exactSessionId)
        return { available: false, reason: "任务没有可定位的自动化会话" };
    if (scope === "global")
        return globalSessionAvailable(exactSessionId)
            ? { available: true, reason: "" }
            : { available: false, reason: "原全局会话不存在或已归档" };
    if (scope === "group") {
        const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === scopeId);
        if (!group)
            return { available: false, reason: "目标群聊不存在或无权访问" };
        const session = (0, storage_1.listGroupChatSessions)(scopeId).sessions.find((item) => String(item?.id || "") === exactSessionId);
        if (!session || session.archived === true)
            return { available: false, reason: "目标群聊自动化会话不存在或已归档" };
        return { available: true, reason: "" };
    }
    if (!(0, db_1.getConfigs)().some((item) => String(item?.name || "") === scopeId))
        return { available: false, reason: "目标项目不存在或已归档" };
    const session = (0, sessions_1.getSessionDetail)(scopeId, exactSessionId);
    if (!session || session.archived === true)
        return { available: false, reason: "目标项目自动化会话不存在或已归档" };
    return { available: true, reason: "" };
}
function normalizeRef(value) {
    if (!value || typeof value !== "object")
        return null;
    const scope = clean(value.scope, 16);
    const scopeId = clean(value.scopeId || value.scope_id, 160);
    const exactSessionId = clean(value.exactSessionId || value.exact_session_id || value.sessionId || value.session_id, 240);
    if (!["global", "project", "group"].includes(scope) || !scopeId || !exactSessionId)
        return null;
    return {
        scope,
        scopeId,
        exactSessionId,
        messageId: clean(value.messageId || value.message_id, 240),
        title: clean(value.title, 160),
    };
}
function sourceRefForTask(task, mission) {
    const explicit = normalizeRef(task?.source_conversation_ref || task?.sourceConversationRef || mission?.source_conversation_ref || mission?.sourceConversationRef);
    if (explicit)
        return explicit;
    const sessionId = clean(task?.workflow_meta?.global_mission?.source_session_id
        || mission?.workflow_meta?.intake?.session_id
        || mission?.origin_session_id, 240);
    return sessionId ? { scope: "global", scopeId: "global-agent", exactSessionId: sessionId, messageId: "", title: "全局 Agent 任务" } : null;
}
function targetRefForTask(task) {
    const explicit = normalizeRef(task?.target_conversation_ref || task?.targetConversationRef);
    if (explicit)
        return explicit;
    if (task?.group_id && task?.group_session_id)
        return {
            scope: "group",
            scopeId: clean(task.group_id, 160),
            exactSessionId: clean(task.group_session_id, 240),
            messageId: clean(task.target_message_id || `global-task-queued-${task.id}`, 240),
            title: clean(task?.mission_target?.name || task.title || "群聊任务", 160),
        };
    if (task?.target_project && task?.project_session_id)
        return {
            scope: "project",
            scopeId: clean(task.target_project, 160),
            exactSessionId: clean(task.project_session_id, 240),
            messageId: clean(task.target_message_id || `global-task-queued-${task.id}`, 240),
            title: clean(task?.mission_target?.name || task.title || "项目任务", 160),
        };
    return null;
}
function buildLink(task, relation, ref, missionId) {
    const availability = targetAvailability(ref.scope, ref.scopeId, ref.exactSessionId);
    const bindingChecksum = clean(task?.automation_session_binding_snapshot?.bindingChecksum || task?.automation_session_binding_snapshot?.binding_checksum, 128)
        || stableChecksum({ scope: ref.scope, scopeId: ref.scopeId, exactSessionId: ref.exactSessionId, relation });
    const base = {
        schema: "ccm-task-conversation-link-v1",
        relation,
        taskId: clean(task?.id, 160),
        ...(missionId ? { missionId } : {}),
        scope: ref.scope,
        scopeId: ref.scopeId,
        exactSessionId: ref.exactSessionId,
        ...(ref.messageId ? { messageId: ref.messageId } : {}),
        title: ref.title || (relation === "source" ? "原任务会话" : "目标任务会话"),
        available: availability.available,
        ...(availability.reason ? { unavailableReason: availability.reason } : {}),
        generation: Math.max(1, Number(task?.generation || task?.workflow_generation || 1)),
        revision: Math.max(0, Number(task?.revision || 0)),
        bindingChecksum,
        contentStored: false,
    };
    return { ...base, linkId: `tcl_${stableChecksum(base).slice(0, 24)}` };
}
function buildTaskConversationLinks(taskOrId, tasksInput) {
    const tasks = Array.isArray(tasksInput) ? tasksInput : (0, db_1.loadTasks)();
    const task = typeof taskOrId === "string" ? tasks.find((item) => String(item?.id || "") === taskOrId) : taskOrId;
    if (!task)
        return null;
    const missionId = clean(task.global_mission_id || task.globalMissionId || (task.workflow_type === "global_mission" ? task.id : ""), 160);
    const mission = missionId ? tasks.find((item) => String(item?.id || "") === missionId) : null;
    const links = [];
    const source = sourceRefForTask(task, mission);
    const target = targetRefForTask(task);
    if (source)
        links.push(buildLink(task, "source", source, missionId));
    if (target)
        links.push(buildLink(task, "target", target, missionId));
    return {
        schema: "ccm-task-conversation-links-v1",
        taskId: String(task.id || ""),
        missionId,
        revision: Math.max(0, Number(task?.revision || 0)),
        generation: Math.max(1, Number(task?.generation || task?.workflow_generation || 1)),
        bindingChecksum: clean(task?.automation_session_binding_snapshot?.bindingChecksum
            || task?.automation_session_binding_snapshot?.binding_checksum
            || links.find((link) => link.relation === "target")?.bindingChecksum
            || links.find((link) => link.relation === "source")?.bindingChecksum, 128),
        projectionRevision: stableChecksum({ task: task.id, revision: task.revision, updatedAt: task.updated_at, links: links.map(link => link.linkId) }),
        links,
        contentStored: false,
    };
}
/**
 * Optimistic concurrency fence shared by all task-card mutations.
 * Legacy/internal callers remain compatible when they omit a guard; new user-facing cards always submit it.
 */
function validateTaskMutationGuard(task, payload = {}, options = {}) {
    const revision = Math.max(0, Number(task?.revision || 0));
    const generation = Math.max(1, Number(task?.generation || task?.workflow_generation || 1));
    const projection = buildTaskConversationLinks(task, [task]);
    const target = projection?.links?.find((link) => link.relation === "target") || null;
    const bindingChecksum = clean(task?.automation_session_binding_snapshot?.bindingChecksum
        || task?.automation_session_binding_snapshot?.binding_checksum
        || target?.bindingChecksum, 128);
    const expectedRevision = payload?.expected_revision ?? payload?.expectedRevision ?? payload?.revision;
    if (expectedRevision !== undefined && expectedRevision !== null && Number(expectedRevision) !== revision) {
        return { valid: false, status: 409, code: "TASK_REVISION_CONFLICT", error: "任务状态已更新，请刷新后重试", details: { expected_revision: Number(expectedRevision), actual_revision: revision } };
    }
    const expectedGeneration = payload?.generation ?? payload?.expected_generation ?? payload?.expectedGeneration;
    if (expectedGeneration !== undefined && expectedGeneration !== null && Number(expectedGeneration) !== generation) {
        return { valid: false, status: 409, code: "TASK_GENERATION_CONFLICT", error: "任务执行代次已变化，请刷新后重试", details: { expected_generation: Number(expectedGeneration), actual_generation: generation } };
    }
    const expectedBinding = clean(payload?.binding_checksum ?? payload?.bindingChecksum, 128);
    if (expectedBinding && expectedBinding !== bindingChecksum) {
        return { valid: false, status: 409, code: "TASK_BINDING_CONFLICT", error: "任务目标绑定已变化，请刷新后重试", details: { expected_binding_checksum: expectedBinding, actual_binding_checksum: bindingChecksum } };
    }
    if (options.requireTarget && target?.available === false) {
        return { valid: false, status: 409, code: "TASK_TARGET_UNAVAILABLE", error: target.unavailableReason || "任务目标会话当前不可用", details: { scope: target.scope, scope_id: target.scopeId, exact_session_id: target.exactSessionId } };
    }
    return { valid: true, revision, generation, bindingChecksum };
}
function normalizeFile(value, fallbackProject = "") {
    const pathValue = clean(value?.path || value?.file || value, 500);
    if (!pathValue)
        return null;
    return {
        path: pathValue,
        project: clean(value?.project || fallbackProject, 160),
        status: clean(value?.status || value?.type, 40),
        ...(Number.isFinite(Number(value?.additions)) ? { additions: Math.max(0, Number(value.additions)) } : {}),
        ...(Number.isFinite(Number(value?.deletions)) ? { deletions: Math.max(0, Number(value.deletions)) } : {}),
        ...(value?.binary === true ? { binary: true } : {}),
        ...(value?.deleted === true ? { deleted: true } : {}),
    };
}
function buildGlobalMissionSafeProjection(mission, children = [], supervisor = null) {
    const files = new Map();
    const verification = [];
    const risks = [];
    const remainingItems = [];
    for (const child of children) {
        const project = clean(child?.mission_target?.name || child?.target_project, 160);
        const delivery = child?.delivery_summary || {};
        for (const raw of [...(delivery.actual_file_changes || []), ...(delivery.file_changes || []), ...(child?.file_changes?.files || [])]) {
            const file = normalizeFile(raw, project);
            if (file)
                files.set(`${file.project}:${file.path}`, file);
        }
        for (const value of delivery.verification_executed || delivery.verification || []) {
            const text = clean(value?.summary || value?.command || value, 320);
            if (text && !verification.includes(text))
                verification.push(text);
        }
        for (const value of delivery.risks || []) {
            const text = clean(value, 320);
            if (text && !risks.includes(text))
                risks.push(text);
        }
        for (const value of delivery.remaining_items || delivery.remainingItems || []) {
            const text = clean(value, 320);
            if (text && !remainingItems.includes(text))
                remainingItems.push(text);
        }
    }
    const report = supervisor?.final_report || mission?.final_report || mission?.delivery_summary || {};
    for (const raw of [...(report.actual_file_changes || []), ...(report.file_changes || []), ...(report.files || []), ...(report.files_modified || [])]) {
        const file = normalizeFile(raw);
        if (file)
            files.set(`${file.project}:${file.path}`, file);
    }
    for (const value of report.verification_results || report.verification || []) {
        const text = clean(value?.summary || value?.command || value, 320);
        if (text && !verification.includes(text))
            verification.push(text);
    }
    for (const value of report.risks || []) {
        const text = clean(value, 320);
        if (text && !risks.includes(text))
            risks.push(text);
    }
    for (const value of report.remaining_items || report.remainingItems || []) {
        const text = clean(value, 320);
        if (text && !remainingItems.includes(text))
            remainingItems.push(text);
    }
    const summary = clean(report.summary || report.headline || mission?.status_detail, 1200);
    return {
        schema: "ccm-global-mission-safe-delivery-v1",
        status: clean(mission?.status, 40),
        summary,
        files: [...files.values()].slice(0, 100),
        verification: verification.slice(0, 30),
        risks: risks.slice(0, 20),
        remainingItems: remainingItems.slice(0, 20),
        acceptancePassed: mission?.mission_summary?.all_passed === true,
        contentStored: false,
    };
}
//# sourceMappingURL=task-conversation-links.js.map