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
exports.inspectOrphanProjectRemoval = inspectOrphanProjectRemoval;
exports.previewActiveOrphanProjectRemoval = previewActiveOrphanProjectRemoval;
exports.commitActiveOrphanProjectRemoval = commitActiveOrphanProjectRemoval;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const chat_runs_1 = require("../../projects/chat-runs");
const scope_instructions_1 = require("../../system/scope-instructions");
const group_orchestrator_routing_1 = require("../collaboration/group-orchestrator-routing");
const storage_1 = require("../collaboration/storage");
const project_runtime_1 = require("./project-runtime");
const project_lifecycle_1 = require("./project-lifecycle");
const project_validation_1 = require("./project-validation");
const TERMINAL_TASK_STATUSES = new Set([
    "completed", "complete", "done", "succeeded", "success", "accepted",
    "failed", "blocked", "cancelled", "canceled", "reverted", "rejected",
]);
function projectGroupMemberships(project, groups = (0, storage_1.loadGroups)()) {
    return groups.filter((group) => (group?.members || []).some((member) => String(member?.project || "") === project));
}
function taskTargetsProject(task, project, groupIds) {
    const direct = [task?.target_project, task?.targetProject, task?.project, task?.project_id, task?.projectId]
        .map((value) => String(value || ""));
    if (direct.includes(project))
        return true;
    const lists = [task?.target_projects, task?.targetProjects, task?.projects, task?.scope_projects, task?.scopeProjects];
    if (lists.some((items) => Array.isArray(items) && items.map(String).includes(project)))
        return true;
    return groupIds.has(String(task?.group_id || task?.groupId || ""));
}
function inspectOrphanProjectRemoval(name) {
    const project = (0, project_validation_1.validateProjectName)(name);
    const directory = (0, project_lifecycle_1.inspectProjectDirectoryState)(project);
    const groups = projectGroupMemberships(project);
    const groupIds = new Set(groups.map((group) => String(group?.id || "")).filter(Boolean));
    const coordinatorGroups = groups
        .filter((group) => (group?.members || []).some((member) => String(member?.project || "") === project && (0, group_orchestrator_routing_1.isCoordinatorMember)(member, group)))
        .map((group) => ({ id: String(group?.id || ""), name: String(group?.name || group?.id || "") }));
    const activeTasks = (0, db_1.loadTasks)().filter((task) => {
        if (TERMINAL_TASK_STATUSES.has(String(task?.status || "pending").toLowerCase()))
            return false;
        return taskTargetsProject(task, project, groupIds);
    });
    const activeRuns = [...chat_runs_1.projectChatRuns.values()].filter((run) => String(run?.project || "") === project && ["queued", "starting", "running", "stopping"].includes(String(run?.status || "").toLowerCase()));
    let runtime = { running_count: 0, unknown_count: 0, building_count: 0 };
    try {
        runtime = (0, project_runtime_1.getProjectRuntimeSummary)(project);
    }
    catch { }
    const reasons = [];
    if (directory.status !== "missing")
        reasons.push(directory.status === "unavailable" ? "项目目录当前无法确认是否存在" : "项目目录仍然存在或未配置");
    if ((0, db_1.isRunning)(project) || runtime.running_count || runtime.unknown_count || runtime.building_count)
        reasons.push("项目 Agent、源码进程或构建仍在运行");
    if (activeRuns.length)
        reasons.push(`仍有 ${activeRuns.length} 个项目执行在运行`);
    if (activeTasks.length)
        reasons.push(`仍有 ${activeTasks.length} 个活动任务关联此项目`);
    if (coordinatorGroups.length)
        reasons.push(`项目仍是 ${coordinatorGroups.length} 个群聊的协调者`);
    return {
        project,
        directory,
        eligible: reasons.length === 0,
        reasons,
        groups: groups.map((group) => ({ id: String(group?.id || ""), name: String(group?.name || group?.id || "") })).filter((group) => group.id),
        coordinator_groups: coordinatorGroups,
        active_task_count: activeTasks.length,
        active_run_count: activeRuns.length,
    };
}
function requireEligible(name) {
    const readiness = inspectOrphanProjectRemoval(name);
    if (!readiness.eligible)
        throw new Error(readiness.reasons.join("；") || "当前项目不能直接移除");
    return readiness;
}
function previewActiveOrphanProjectRemoval(name) {
    const readiness = requireEligible(name);
    return {
        ...(0, project_lifecycle_1.previewOrphanProjectRemoval)(readiness.project, readiness.groups.map((group) => group.id)),
        affected_groups: readiness.groups,
    };
}
function commitActiveOrphanProjectRemoval(name, previewToken) {
    const readiness = requireEligible(name);
    const originalGroups = (0, storage_1.loadGroups)();
    const affectedIds = new Set(readiness.groups.map((group) => group.id));
    const nextGroups = originalGroups.map((group) => {
        if (!affectedIds.has(String(group?.id || "")))
            return group;
        const next = { ...group, members: (group?.members || []).filter((member) => String(member?.project || "") !== readiness.project) };
        next.membership_revision = Math.max(0, Number(group?.membership_revision || 0)) + 1;
        next.membership_updated_at = new Date().toISOString();
        next.membership_checksum = crypto.createHash("sha256").update(JSON.stringify(next.members.map((member) => ({
            project: String(member?.project || ""),
            role: String(member?.role || ""),
            agent: String(member?.agent || ""),
        })))).digest("hex");
        return next;
    });
    (0, storage_1.saveGroups)(nextGroups);
    try {
        const result = (0, project_lifecycle_1.removeOrphanProject)(readiness.project, previewToken, readiness.groups.map((group) => group.id));
        const instructionWarnings = [];
        for (const group of nextGroups.filter((item) => affectedIds.has(String(item?.id || "")))) {
            try {
                (0, scope_instructions_1.ensureGroupScopeInstructions)({
                    groupId: String(group.id || ""),
                    name: group.name,
                    purpose: group.purpose,
                    projectIds: (group.members || []).map((member) => String(member?.project || "")).filter((id) => id && id !== "coordinator"),
                });
            }
            catch (error) {
                instructionWarnings.push(String(error?.message || error));
            }
        }
        return { ...result, affected_groups: readiness.groups, warnings: instructionWarnings };
    }
    catch (error) {
        (0, storage_1.saveGroups)(originalGroups);
        throw error;
    }
}
//# sourceMappingURL=project-orphan-removal.js.map